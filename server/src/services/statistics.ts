import { prisma } from "../config/database.js";

// --- Anomaly Detection (used by dashboard) ---
export async function getAnomalies() {
  const anomalies: Array<{
    type: string;
    severity: string;
    batchId: number;
    batchNo: string;
    description: string;
    value: number;
    threshold: number;
  }> = [];

  // Delayed batches (no progress update in 5+ days)
  const activeBatches = await prisma.batch.findMany({
    where: { status: "active" },
    include: { progressRecords: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
  for (const b of activeBatches) {
    // 无进度记录时回退到批次创建时间，确保"创建了却从未开工"的批次也能被延迟预警
    const lastUpdate = b.progressRecords[0]?.createdAt ?? b.createdAt;
    if (Date.now() - new Date(lastUpdate).getTime() > fiveDaysMs) {
      anomalies.push({
        type: "batch_delay",
        severity: "major",
        batchId: b.id,
        batchNo: b.batchNo || "",
        description: `超过5天无进度更新`,
        value: Math.round((Date.now() - new Date(lastUpdate).getTime()) / (24 * 60 * 60 * 1000)),
        threshold: 5,
      });
    }
  }

  return anomalies;
}

// --- Helper: get current stage from progress records ---
function getCurrentStageFromRecords(
  records: { stageId: number; status: string; createdAt: Date; stage?: { name: string } | null }[],
): string {
  if (!records.length) return "未开始";
  const completed = records
    .filter(r => r.status === "completed")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return completed[0]?.stage?.name || "未开始";
}

function getLatestStageRecord<T extends { status: string; createdAt: Date; stage?: { code: string; name: string } | null }>(
  records: T[],
  code: string,
): T | undefined {
  return records
    .filter((r) => r.status === "completed" && r.stage?.code === code)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

function formatDateCell(value: Date | null | undefined): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

// --- Excel Export (online product batches, 高可靠在线产品在线加工统计表格式) ---
export async function exportExcel() {
  const ExcelJS = (await import("exceljs")).default;

  const batchInclude = {
    product: true,
    progressRecords: { include: { stage: true } },
  } as const;

  const [activeBatches, shippedBatches] = await Promise.all([
    prisma.batch.findMany({
      where: { status: "active" },
      include: batchInclude,
      orderBy: [
        { customerDelivery: { sort: "asc", nulls: "last" } },
        { createdAt: "asc" },
      ],
    }),
    prisma.batch.findMany({
      where: { status: { in: ["completed", "archived"] } },
      include: batchInclude,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const customerCodes = [...new Set(
    [...activeBatches, ...shippedBatches].map((b) => b.customerCode).filter((code): code is string => !!code),
  )];
  const customers = customerCodes.length
    ? await prisma.customerCode.findMany({ where: { code: { in: customerCodes } } })
    : [];
  const customerMap = new Map(customers.map((customer) => [customer.code, customer]));

  const toRow = (b: (typeof activeBatches)[number], shipped: boolean) => {
    const mirrorRecord = getLatestStageRecord(b.progressRecords, "in_process_inspection");
    const completedRecord = getLatestStageRecord(b.progressRecords, "completed");
    const customer = b.customerCode ? customerMap.get(b.customerCode) : undefined;
    // 已发货日期：无专门字段，用流转到「已完成」工序的时间近似。
    const shipDate = shipped ? formatDateCell(completedRecord?.createdAt ?? b.updatedAt) : "";
    return [
      b.customerCode || "",
      customer?.name || "",
      b.product?.model || "",
      b.batchNo || "",
      b.orderNo || "",
      b.packageType || "",
      b.quantity,
      formatDateCell(b.startedAt),
      formatDateCell(mirrorRecord?.createdAt),
      formatDateCell(b.customerDelivery),
      shipped ? shipDate : formatDateCell(b.productionDelivery),
      shipped ? "已发货" : getCurrentStageFromRecords(b.progressRecords),
      customer?.type === "internal" ? "所内" : customer?.type === "external" ? "所外" : "",
      shipped ? "/" : 0,
      shipped ? "/" : b.quantity,
      b.notes || "",
    ];
  };

  const rows = [
    ...activeBatches.map((b) => toRow(b, false)),
    ...shippedBatches.map((b) => toRow(b, true)),
  ];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "生产进度追踪系统";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(rows.length ? "在线产品加工统计" : "空");
  worksheet.columns = [
    { header: "客户代码", width: 12 },
    { header: "客户名称", width: 14 },
    { header: "产品型号", width: 22 },
    { header: "生产批号", width: 12 },
    { header: "订单编码", width: 16 },
    { header: "封装形式", width: 16 },
    { header: "数量", width: 8 },
    { header: "投产时间", width: 12 },
    { header: "加工开始时间\n（镜检）", width: 14 },
    { header: "客户要求交期", width: 13 },
    { header: "生产预计交期\n/已发货日期", width: 16 },
    { header: "当前站点", width: 12 },
    { header: "客户类型", width: 10 },
    { header: "已交付数量", width: 11 },
    { header: "未交付数量", width: 11 },
    { header: "备注：加急/反馈等、未投产订单的进度情况（价格/压焊图未确认完成时统称资料不全）", width: 40 },
  ];
  worksheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    worksheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
