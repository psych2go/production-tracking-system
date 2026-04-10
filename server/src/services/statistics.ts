import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- Process Durations ---
export async function getProcessDurations(filters: {
  stageId?: number;
  startDate?: string;
  endDate?: string;
}) {
  const { stageId, startDate, endDate } = filters;

  const where: Record<string, unknown> = {
    durationMinutes: { not: null },
    completedAt: { not: null },
  };
  if (stageId) where.stageId = stageId;
  if (startDate || endDate) {
    const createdAt: Record<string, Date> = {};
    if (startDate) createdAt.gte = new Date(startDate);
    if (endDate) createdAt.lte = new Date(endDate);
    where.createdAt = createdAt;
  }

  const records = await prisma.progressRecord.findMany({
    where,
    include: { stage: true },
  });

  // Group by stage
  const grouped = new Map<string, number[]>();
  for (const r of records) {
    const key = r.stage?.name ?? `Stage ${r.stageId}`;
    const arr = grouped.get(key) ?? [];
    arr.push(r.durationMinutes ?? 0);
    grouped.set(key, arr);
  }

  return Array.from(grouped.entries()).map(([stageName, durations]) => ({
    stageName,
    avgMinutes: Math.round(durations.reduce((s, d) => s + d, 0) / durations.length),
    minMinutes: Math.min(...durations),
    maxMinutes: Math.max(...durations),
    recordCount: durations.length,
  }));
}

// --- Production Trend ---
export async function getProductionTrend(filters: {
  groupBy: string;
  startDate?: string;
  endDate?: string;
}) {
  const { groupBy, startDate, endDate } = filters;

  const where: Record<string, unknown> = {};
  if (startDate || endDate) {
    const createdAt: Record<string, Date> = {};
    if (startDate) createdAt.gte = new Date(startDate);
    if (endDate) createdAt.lte = new Date(endDate);
    where.createdAt = createdAt;
  }

  // Default to last 30 days
  if (!startDate && !endDate) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    where.createdAt = { gte: thirtyDaysAgo };
  }

  const records = await prisma.progressRecord.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });

  // Group by period
  const grouped = new Map<string, { recordCount: number; totalOutput: number; totalInput: number }>();
  for (const r of records) {
    const d = new Date(r.createdAt);
    let period: string;
    if (groupBy === "week") {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      period = weekStart.toISOString().slice(0, 10);
    } else if (groupBy === "month") {
      period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    } else {
      period = d.toISOString().slice(0, 10);
    }

    const g = grouped.get(period) ?? { recordCount: 0, totalOutput: 0, totalInput: 0 };
    g.recordCount++;
    g.totalOutput += r.outputQuantity ?? 0;
    g.totalInput += r.inputQuantity ?? 0;
    grouped.set(period, g);
  }

  return Array.from(grouped.entries()).map(([period, g]) => ({
    period,
    batchCount: 0, // will be filled separately if needed
    recordCount: g.recordCount,
    totalOutput: g.totalOutput,
    avgYieldRate: g.totalInput > 0 ? Math.round((g.totalOutput / g.totalInput) * 10000) / 100 : 0,
  }));
}

// --- Anomaly Detection ---
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

  // Delayed batches (no progress update in 7+ days)
  const activeBatches = await prisma.batch.findMany({
    where: { status: "active" },
    include: { progressRecords: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  for (const b of activeBatches) {
    const lastUpdate = b.progressRecords[0]?.createdAt;
    if (lastUpdate && Date.now() - new Date(lastUpdate).getTime() > sevenDaysMs) {
      anomalies.push({
        type: "batch_delay",
        severity: "major",
        batchId: b.id,
        batchNo: b.batchNo,
        description: `超过7天无进度更新`,
        value: Math.round((Date.now() - new Date(lastUpdate).getTime()) / (24 * 60 * 60 * 1000)),
        threshold: 7,
      });
    }
  }

  return anomalies;
}

// --- Dashboard Summary (enhanced) ---
export async function getDashboardSummary() {
  const [anomalies, productionTrend] = await Promise.all([
    getAnomalies(),
    getProductionTrend({ groupBy: "day" }),
  ]);

  const productionTrendShort = productionTrend.slice(-7).map((p) => ({
    date: p.period,
    output: p.totalOutput,
  }));

  return {
    anomalies,
    productionTrend: productionTrendShort,
  };
}

// --- Excel Export ---
export async function exportExcel(filters: {
  type: string;
  startDate?: string;
  endDate?: string;
}) {
  // Dynamic import for xlsx (large library)
  const XLSX = await import("xlsx");

  let data: Record<string, unknown>[] = [];
  let sheetName = "Sheet1";

  switch (filters.type) {
    case "durations": {
      const durations = await getProcessDurations(filters);
      data = durations.map((d) => ({
        工序: d.stageName,
        平均耗时分钟: d.avgMinutes,
        最短分钟: d.minMinutes,
        最长分钟: d.maxMinutes,
        样本数: d.recordCount,
      }));
      sheetName = "工序耗时";
      break;
    }
    case "production": {
      const trend = await getProductionTrend({ groupBy: "day", ...filters });
      data = trend.map((t) => ({
        日期: t.period,
        录入数: t.recordCount,
        总产出: t.totalOutput,
        平均良率: `${t.avgYieldRate}%`,
      }));
      sheetName = "产量趋势";
      break;
    }
    default:
      throw new Error(`不支持的导出类型: ${filters.type}`);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
