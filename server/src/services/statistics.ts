import { prisma } from "../config/database.js";
import { getAnomalyConfig } from "./settings.js";

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
  // 异常预警开关与阈值（个人中心-系统管理可配置，默认关闭、阈值5天）
  const config = await getAnomalyConfig();
  if (!config.enabled) return [];
  const thresholdDays = config.thresholdDays;
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
  period: string;
  periodType: "month" | "quarter";
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

function monthWindows(year: number, monthNum: number): StatWindows {
  const prevYear = monthNum === 1 ? year - 1 : year;
  const prevMonthNum = monthNum === 1 ? 12 : monthNum - 1;
  return {
    year,
    monthNum,
    firstMonthNum: monthNum,
    prevMonthNum,
    internalStart: utcDate(prevYear, prevMonthNum, 16),
    internalEnd: utcDate(year, monthNum, 15),
    externalStart: utcDate(prevYear, prevMonthNum, 26),
    externalEnd: utcDate(year, monthNum, 25),
    period: `${year}-${String(monthNum).padStart(2, "0")}`,
    periodType: "month",
    title: `${monthNum}月（所内${prevMonthNum}.16-${monthNum}.15/所外${prevMonthNum}.26-${monthNum}.25）`,
  };
}

interface StatWindows {
  internalStart: Date;
  internalEnd: Date;
  externalStart: Date;
  externalEnd: Date;
  period: string;
  periodType: "month" | "quarter";
  title: string;
  year: number;
  monthNum: number;
  firstMonthNum: number;
  prevMonthNum: number;
}

function windowsForMonth(month: string): StatWindows {
  const { year, monthNum } = parseYieldMonth(month);
  return monthWindows(year, monthNum);
}

function windowsForQuarter(quarter: string): StatWindows {
  const m = /^(\d{4})-Q([1-4])$/.exec(quarter.trim());
  if (!m) throw new Error("季度格式应为 YYYY-QN，如 2026-Q3");
  const year = Number(m[1]);
  const qn = Number(m[2]);
  if (qn < 1 || qn > 4) throw new Error("季度无效");
  const firstMonthNum = qn * 3 - 2;
  const lastMonthNum = qn * 3;
  const first = monthWindows(year, firstMonthNum);
  const last = monthWindows(year, lastMonthNum);
  return {
    internalStart: first.internalStart,
    internalEnd: last.internalEnd,
    externalStart: first.externalStart,
    externalEnd: last.externalEnd,
    title: `${year}年${qn}季度（所内${first.prevMonthNum}.16-${lastMonthNum}.15/所外${first.prevMonthNum}.26-${lastMonthNum}.25）`,
    period: `${year}-Q${qn}`,
    periodType: "quarter",
    year,
    monthNum: lastMonthNum,
    firstMonthNum,
    prevMonthNum: first.prevMonthNum,
  };
}

function resolveStatWindows(period: string): StatWindows {
  return period.includes("Q") ? windowsForQuarter(period) : windowsForMonth(period);
}

async function computeYieldStats(win: StatWindows): Promise<YieldStats> {
  const batches = await prisma.batch.findMany({
    where: {
      status: "archived",
      shippedDate: { gte: win.internalStart, lte: win.externalEnd },
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
    const inInternal = type === "internal" && shipped >= win.internalStart && shipped <= win.internalEnd;
    const inExternal = type === "external" && shipped >= win.externalStart && shipped <= win.externalEnd;
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

  const periodYield = rows.length ? rows.reduce((sum, r) => sum + r.batchYield, 0) / rows.length : null;
  return {
    month: win.period,
    period: win.period,
    periodType: win.periodType,
    title: win.title,
    rows,
    monthYield: periodYield,
    monthTarget: MONTH_YIELD_TARGET,
    unclassified,
  };
}

export async function getYieldStats(period: string): Promise<YieldStats> {
  return computeYieldStats(resolveStatWindows(period));
}

// --- 发货数量统计（同月度窗口规则，含近三月概览与明细） ---
export interface ShipmentMonthSummary {
  month: string;
  label: string;
  isCurrent: boolean;
  internalTotal: number;
  externalTotal: number;
  total: number;
}

export interface ShipmentStats {
  month: string;
  windows: { internal: string; external: string };
  months: ShipmentMonthSummary[];
  rows: Array<{
    shippedDate: string;
    batchNo: string;
    customerCode: string;
    customerName: string;
    model: string;
    packageType: string;
    customerType: string;
    shippedQuantity: number;
  }>;
  internalTotal: number;
  externalTotal: number;
  total: number;
  unclassifiedCount: number;
}

export interface ShipmentStats {
  month: string;
  period: string;
  periodType: "month" | "quarter";
  windows: { internal: string; external: string };
  months: ShipmentMonthSummary[];
  rows: Array<{
    shippedDate: string;
    batchNo: string;
    customerCode: string;
    customerName: string;
    model: string;
    packageType: string;
    customerType: string;
    shippedQuantity: number;
  }>;
  internalTotal: number;
  externalTotal: number;
  total: number;
  unclassifiedCount: number;
}

export async function getShipmentStats(period: string): Promise<ShipmentStats> {
  const win = resolveStatWindows(period);
  // 概览固定显示最近三个月：当前月（实时）、上月、上上月
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonthNum = now.getMonth() + 1;
  const overviewWins = [0, -1, -2].map((delta) => {
    const zero = nowYear * 12 + (nowMonthNum - 1) + delta;
    return monthWindows(Math.floor(zero / 12), (zero % 12) + 1);
  });
  const rangeStart = [...overviewWins.map((w) => w.internalStart), win.internalStart].sort((a, b) => a.getTime() - b.getTime())[0];
  const rangeEnd = [...overviewWins.map((w) => w.externalEnd), win.externalEnd].sort((a, b) => b.getTime() - a.getTime())[0];

  const batches = await prisma.batch.findMany({
    where: { status: "archived", shippedDate: { gte: rangeStart, lte: rangeEnd } },
    include: { product: true },
  });
  const customerCodes = [...new Set(batches.map((b) => b.customerCode).filter((code): code is string => !!code))];
  const customers = customerCodes.length
    ? await prisma.customerCode.findMany({ where: { code: { in: customerCodes } } })
    : [];
  const customerMap = new Map(customers.map((c) => [c.code, c]));

  function totalsFor(win: StatWindows) {
    let internalTotal = 0;
    let externalTotal = 0;
    let unclassified = 0;
    const rows: ShipmentStats["rows"] = [];
    for (const b of batches) {
      if (!b.shippedDate) continue;
      const type = b.customerCode ? customerMap.get(b.customerCode)?.type : undefined;
      const inInternal = type === "internal" && b.shippedDate >= win.internalStart && b.shippedDate <= win.internalEnd;
      const inExternal = type === "external" && b.shippedDate >= win.externalStart && b.shippedDate <= win.externalEnd;
      if (!inInternal && !inExternal) continue;
      const shippedQuantity = b.shippedQuantity ?? 0;
      rows.push({
        shippedDate: b.shippedDate.toISOString().slice(0, 10).replace(/-/g, ""),
        batchNo: b.batchNo || "",
        customerCode: b.customerCode || "",
        customerName: customerMap.get(b.customerCode || "")?.name || "",
        model: b.product?.model || "",
        packageType: b.packageType || "",
        customerType: inInternal ? "所内" : "所外",
        shippedQuantity,
      });
      if (inInternal) internalTotal += shippedQuantity;
      else externalTotal += shippedQuantity;
    }
    rows.sort((a, b) => a.shippedDate.localeCompare(b.shippedDate) || a.batchNo.localeCompare(b.batchNo));
    return { internalTotal, externalTotal, total: internalTotal + externalTotal, rows, unclassified };
  }

  const currentStats = totalsFor(win);
  const nowPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const months: ShipmentMonthSummary[] = overviewWins.map((w) => {
    const t = totalsFor(w);
    const isCurrent = w.period === nowPeriod;
    return {
      month: w.period,
      label: `${w.monthNum}月`,
      internalTotal: t.internalTotal,
      externalTotal: t.externalTotal,
      total: t.total,
      isCurrent,
    };
  });

  return {
    month: win.period,
    period: win.period,
    periodType: win.periodType,
    windows: {
      internal: `所内${win.prevMonthNum}.16-${win.monthNum}.15`,
      external: `所外${win.prevMonthNum}.26-${win.monthNum}.25`,
    },
    months,
    rows: currentStats.rows,
    internalTotal: currentStats.internalTotal,
    externalTotal: currentStats.externalTotal,
    total: currentStats.total,
    unclassifiedCount: currentStats.unclassified,
  };
}

export async function exportShipmentExcel(month: string) {
  const ExcelJS = (await import("exceljs")).default;
  const stats = await getShipmentStats(month);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "生产进度追踪系统";
  const worksheet = workbook.addWorksheet("Sheet1");
  worksheet.mergeCells(1, 1, 1, 8);
  worksheet.getCell(1, 1).value = `${monthNumLabel(month)}发货数量统计（${stats.windows.internal}/${stats.windows.external}）`;
  worksheet.getRow(2).values = ["发货时间", "生产批号", "客户代码", "客户名称", "产品型号", "封装形式", "客户类型", "发货数"];
  worksheet.getRow(2).font = { bold: true };
  for (const r of stats.rows) {
    worksheet.addRow([r.shippedDate, r.batchNo, r.customerCode, r.customerName, r.model, r.packageType, r.customerType, r.shippedQuantity]);
  }
  const totalRow = worksheet.addRow(["合计", "", "", "", "", "所内", stats.internalTotal]);
  totalRow.font = { bold: true };
  worksheet.addRow(["", "", "", "", "", "所外", stats.externalTotal]);
  const grandRow = worksheet.addRow(["总计", "", "", "", "", "", stats.total]);
  grandRow.font = { bold: true };
  worksheet.columns = [{ width: 12 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 22 }, { width: 16 }, { width: 10 }, { width: 10 }];
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function monthNumLabel(month: string) {
  const m = /^(\d{4})-(\d{1,2})$/.exec(month.trim());
  return m ? `${Number(m[2])}月` : month;
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

// --- 加工交付周期（按发货日期筛选时间段） ---
export async function getDeliveryCycleStats(startDate: string, endDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error("日期格式应为 YYYY-MM-DD");
  }
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error("日期无效");
  if (end < start) throw new Error("结束日期不能早于开始日期");

  const batchInclude = { product: true, progressRecords: { include: { stage: true } } } as const;
  // 以归档时填写的发货日期为准（未归档批次无发货日期，不纳入统计）
  const batches = await prisma.batch.findMany({
    where: { status: "archived", shippedDate: { gte: start, lte: end } },
    include: batchInclude,
    orderBy: { shippedDate: "asc" },
  });

  const customerCodes = [...new Set(batches.map((b) => b.customerCode).filter((code): code is string => !!code))];
  const customers = customerCodes.length
    ? await prisma.customerCode.findMany({ where: { code: { in: customerCodes } } })
    : [];
  const customerMap = new Map(customers.map((c) => [c.code, c]));
  const DAY = 24 * 60 * 60 * 1000;

  const toRow = (b: (typeof batches)[number], shippedTime: Date) => {
    const mirrorRecord = getLatestStageRecord(b.progressRecords, "in_process_inspection");
    const customer = b.customerCode ? customerMap.get(b.customerCode) : undefined;
    const shipMs = shippedTime.getTime();
    return {
      customerCode: b.customerCode || "",
      customerName: customer?.name || "",
      model: b.product?.model || "",
      batchNo: b.batchNo || "",
      packageType: b.packageType || "",
      quantity: b.quantity,
      startedAt: formatDateCell(b.startedAt),
      mirrorTime: formatDateCell(mirrorRecord?.createdAt),
      shippedDate: formatDateCell(shippedTime),
      // 发货与镜检/投产都可能存在几小时的时区偏移，四舍五入到整天
      mirrorCycle: mirrorRecord?.createdAt ? Math.round((shipMs - mirrorRecord.createdAt.getTime()) / DAY) : null,
      totalCycle: b.startedAt ? Math.round((shipMs - new Date(b.startedAt).getTime()) / DAY) : null,
      customerType: customer?.type === "internal" ? "所内" : customer?.type === "external" ? "所外" : "",
      notes: [b.notes, b.pausedAt ? `暂停：${b.pauseReason || ""}` : ""].filter(Boolean).join("；"),
    };
  };

  const rows = batches
    .map((b) => toRow(b, b.shippedDate as Date))
    .sort((a, b) => a.shippedDate.localeCompare(b.shippedDate));

  return { startDate, endDate, rows };
}

export async function exportDeliveryCycleExcel(startDate: string, endDate: string) {
  const ExcelJS = (await import("exceljs")).default;
  const { rows } = await getDeliveryCycleStats(startDate, endDate);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "生产进度追踪系统";
  const worksheet = workbook.addWorksheet("Sheet1");
  worksheet.getRow(1).values = [
    "客户代码", "客户名称", "产品型号", "生产批号", "封装形式", "下单数量",
    "投产时间", "开始加工时间", "发货日期", "加工周期（从镜检开始）", "投产后经过时间周期", "客户类型", "备注",
  ];
  worksheet.getRow(1).font = { bold: true };
  for (const r of rows) {
    worksheet.addRow([
      r.customerCode, r.customerName, r.model, r.batchNo, r.packageType, r.quantity,
      r.startedAt, r.mirrorTime, r.shippedDate,
      r.mirrorCycle ?? "", r.totalCycle ?? "", r.customerType, r.notes,
    ]);
  }
  worksheet.columns = [
    { width: 12 }, { width: 14 }, { width: 22 }, { width: 12 }, { width: 16 }, { width: 10 },
    { width: 13 }, { width: 14 }, { width: 13 }, { width: 22 }, { width: 20 }, { width: 10 }, { width: 24 },
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
