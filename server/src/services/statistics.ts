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

// --- 良率统计（按月，所内：上月16日-本月15日；所外：上月26日-本月25日） ---
export const BATCH_YIELD_TARGET = 0.9;
export const MONTH_YIELD_TARGET = 0.92;

const utcDate = (year: number, month: number, day: number) =>
  new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00Z`);

export interface YieldStats {
  month: string;
  title: string;
  rows: Array<{
    shippedDate: string;
    batchNo: string;
    customerCode: string;
    model: string;
    packageType: string;
    dieQuantity: number;
    shippedQuantity: number;
    batchYield: number;
    batchTarget: number;
  }>;
  monthYield: number | null;
  monthTarget: number;
  unclassified: Array<{ batchNo: string; model: string; reason: string }>;
}

function parseYieldMonth(month: string) {
  const m = /^(\d{4})-(\d{1,2})$/.exec(month.trim());
  if (!m) throw new Error("月份格式应为 YYYY-MM");
  const year = Number(m[1]);
  const monthNum = Number(m[2]);
  if (monthNum < 1 || monthNum > 12) throw new Error("月份无效");
  const prevYear = monthNum === 1 ? year - 1 : year;
  const prevMonthNum = monthNum === 1 ? 12 : monthNum - 1;
  return { year, monthNum, prevYear, prevMonthNum };
}

export async function getYieldStats(month: string): Promise<YieldStats> {
  const { year, monthNum, prevYear, prevMonthNum } = parseYieldMonth(month);
  const internalStart = utcDate(prevYear, prevMonthNum, 16);
  const internalEnd = utcDate(year, monthNum, 15);
  const externalStart = utcDate(prevYear, prevMonthNum, 26);
  const externalEnd = utcDate(year, monthNum, 25);

  const batches = await prisma.batch.findMany({
    where: {
      status: "archived",
      shippedDate: { gte: internalStart, lte: externalEnd },
    },
    include: { product: true },
    orderBy: { shippedDate: "asc" },
  });

  const customerCodes = [...new Set(batches.map((b) => b.customerCode).filter((code): code is string => !!code))];
  const customers = customerCodes.length
    ? await prisma.customerCode.findMany({ where: { code: { in: customerCodes } } })
    : [];
  const customerMap = new Map(customers.map((c) => [c.code, c]));

  const rows: YieldStats["rows"] = [];
  const unclassified: YieldStats["unclassified"] = [];
  for (const b of batches) {
    if (!b.shippedDate || b.dieQuantity == null || b.shippedQuantity == null) {
      unclassified.push({ batchNo: b.batchNo || "", model: b.product?.model || "", reason: "归档数据不完整" });
      continue;
    }
    const type = b.customerCode ? customerMap.get(b.customerCode)?.type : undefined;
    const shipped = b.shippedDate;
    const inInternal = type === "internal" && shipped >= internalStart && shipped <= internalEnd;
    const inExternal = type === "external" && shipped >= externalStart && shipped <= externalEnd;
    if (!inInternal && !inExternal) {
      unclassified.push({
        batchNo: b.batchNo || "",
        model: b.product?.model || "",
        reason: type === "internal" || type === "external" ? "发货日期不在对应统计窗口内" : "客户代码未维护类型",
      });
      continue;
    }
    rows.push({
      shippedDate: shipped.toISOString().slice(0, 10).replace(/-/g, ""),
      batchNo: b.batchNo || "",
      customerCode: b.customerCode || "",
      model: b.product?.model || "",
      packageType: b.packageType || "",
      dieQuantity: b.dieQuantity,
      shippedQuantity: b.shippedQuantity,
      batchYield: b.shippedQuantity / b.dieQuantity,
      batchTarget: BATCH_YIELD_TARGET,
    });
  }

  const monthYield = rows.length ? rows.reduce((sum, r) => sum + r.batchYield, 0) / rows.length : null;
  return {
    month,
    title: `${monthNum}月（所内${prevMonthNum}.16-${monthNum}.15/所外${prevMonthNum}.26-${monthNum}.25）`,
    rows,
    monthYield,
    monthTarget: MONTH_YIELD_TARGET,
    unclassified,
  };
}

export async function exportYieldExcel(month: string) {
  const ExcelJS = (await import("exceljs")).default;
  const stats = await getYieldStats(month);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "生产进度追踪系统";
  const worksheet = workbook.addWorksheet("Sheet1");
  worksheet.mergeCells(1, 1, 1, 11);
  worksheet.getCell(1, 1).value = stats.title;
  worksheet.getRow(2).values = [
    "发货时间", "生产批号", "客户代码", "型号", "封装类型", "上芯数", "发货数",
    "批次良率", "单批次目标良率（达成）", "月良率", "目标月良率（达成）",
  ];
  worksheet.getRow(2).font = { bold: true };

  stats.rows.forEach((r, index) => {
    const row = worksheet.getRow(3 + index);
    row.values = [
      r.shippedDate, r.batchNo, r.customerCode, r.model, r.packageType,
      r.dieQuantity, r.shippedQuantity, r.batchYield, r.batchTarget,
      stats.monthYield, stats.monthTarget,
    ];
    row.getCell(8).numFmt = "0.00%";
    row.getCell(9).numFmt = "0%";
    row.getCell(10).numFmt = "0.00%";
    row.getCell(11).numFmt = "0%";
  });

  const lastRow = 2 + Math.max(stats.rows.length, 1);
  worksheet.mergeCells(3, 10, lastRow, 10);
  worksheet.mergeCells(3, 11, lastRow, 11);
  if (stats.monthYield !== null) {
    worksheet.getCell(3, 10).value = stats.monthYield;
    worksheet.getCell(3, 10).numFmt = "0.00%";
    worksheet.getCell(3, 11).value = stats.monthTarget;
    worksheet.getCell(3, 11).numFmt = "0%";
  }

  worksheet.columns = [
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 22 }, { width: 16 },
    { width: 10 }, { width: 10 }, { width: 12 }, { width: 20 }, { width: 12 }, { width: 18 },
  ];
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
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
