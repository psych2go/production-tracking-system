import { prisma } from "../config/database.js";
import { getAnomalyThreshold } from "./settings.js";

// --- Anomaly Detection (used by dashboard) ---
export async function getAnomalies() {
  const anomalies: Array<{
    type: string;
    severity: string;
    batchId: number;
    batchNo: string;
    productModel: string;
    description: string;
    value: number;
    threshold: number;
  }> = [];

  // Delayed batches (no progress update in 5+ days)
  const activeBatches = await prisma.batch.findMany({
    where: { status: "active" },
    include: { progressRecords: { orderBy: { createdAt: "desc" }, take: 1 }, product: true },
  });
  // 异常预警阈值（个人中心-系统管理可配置，默认5天）
  const thresholdDays = await getAnomalyThreshold();
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
  for (const b of activeBatches) {
    // 无进度记录时回退到批次创建时间，确保"创建了却从未开工"的批次也能被延迟预警
    const lastUpdate = b.progressRecords[0]?.createdAt ?? b.createdAt;
    if (Date.now() - new Date(lastUpdate).getTime() > thresholdMs) {
      anomalies.push({
        type: "batch_delay",
        severity: "major",
        batchId: b.id,
        batchNo: b.batchNo || "",
        productModel: b.product?.model || "",
        description: `超过${thresholdDays}天无进度更新`,
        value: Math.round((Date.now() - new Date(lastUpdate).getTime()) / (24 * 60 * 60 * 1000)),
        threshold: thresholdDays,
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

  const [onlineBatches] = await Promise.all([
    prisma.batch.findMany({
      where: { status: { in: ["pending_card", "pending", "active"] } },
      include: batchInclude,
      orderBy: [
        { customerDelivery: { sort: "asc", nulls: "last" } },
        { createdAt: "asc" },
      ],
    }),
  ]);

  const customerCodes = [...new Set(
    onlineBatches.map((b) => b.customerCode).filter((code): code is string => !!code),
  )];
  const customers = customerCodes.length
    ? await prisma.customerCode.findMany({ where: { code: { in: customerCodes } } })
    : [];
  const customerMap = new Map(customers.map((customer) => [customer.code, customer]));

  const toRow = (b: (typeof onlineBatches)[number]) => {
    const mirrorRecord = getLatestStageRecord(b.progressRecords, "in_process_inspection");
    const customer = b.customerCode ? customerMap.get(b.customerCode) : undefined;
    // 当前站点：待制卡/待投产无工序记录，直接显示业务状态
    const stage = b.status === "pending_card" ? "待制卡" : b.status === "pending" ? "待投产" : getCurrentStageFromRecords(b.progressRecords);
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
      formatDateCell(b.productionDelivery),
      stage,
      customer?.type === "internal" ? "所内" : customer?.type === "external" ? "所外" : "",
      0,
      b.quantity,
      b.notes || "",
    ];
  };

  const rows = onlineBatches.map((b) => toRow(b));

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
    { header: "生产预计交期", width: 16 },
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
