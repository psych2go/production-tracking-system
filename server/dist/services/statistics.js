"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProcessDurations = getProcessDurations;
exports.getProductionTrend = getProductionTrend;
exports.getAnomalies = getAnomalies;
exports.getGroupedStatistics = getGroupedStatistics;
exports.exportExcel = exportExcel;
const database_js_1 = require("../config/database.js");
const ALLOWED_GROUP_BY = ["customerCode", "packageType"];
// --- Process Durations ---
async function getProcessDurations(filters) {
    const { stageId, startDate, endDate } = filters;
    const where = {};
    if (stageId)
        where.stageId = stageId;
    // Default to last 90 days if no date range specified
    if (startDate || endDate) {
        const createdAt = {};
        if (startDate)
            createdAt.gte = new Date(startDate);
        if (endDate)
            createdAt.lte = new Date(endDate);
        where.createdAt = createdAt;
    }
    else {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        where.createdAt = { gte: ninetyDaysAgo };
    }
    const records = await database_js_1.prisma.progressRecord.findMany({
        where,
        include: { stage: true },
        orderBy: { createdAt: "asc" },
    });
    // Group by (batchId, stageId) to get duration from previous stage in same batch
    // First, group records by batchId
    const byBatch = new Map();
    for (const r of records) {
        const arr = byBatch.get(r.batchId) ?? [];
        arr.push(r);
        byBatch.set(r.batchId, arr);
    }
    // For each record, find the previous record in the same batch and compute diff
    const grouped = new Map();
    for (const batchRecords of byBatch.values()) {
        for (let i = 0; i < batchRecords.length; i++) {
            const r = batchRecords[i];
            const key = r.stage?.name ?? `Stage ${r.stageId}`;
            const arr = grouped.get(key) ?? [];
            if (i === 0) {
                // First record in batch: no previous stage, skip duration
                continue;
            }
            const prevCreatedAt = batchRecords[i - 1].createdAt;
            const diffMs = new Date(r.createdAt).getTime() - new Date(prevCreatedAt).getTime();
            arr.push(Math.max(0, Math.round(diffMs / (1000 * 60))));
            grouped.set(key, arr);
        }
    }
    return Array.from(grouped.entries()).map(([stageName, durations]) => ({
        stageName,
        avgMinutes: durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0,
        minMinutes: durations.length ? Math.min(...durations) : 0,
        maxMinutes: durations.length ? Math.max(...durations) : 0,
        recordCount: durations.length,
    }));
}
// --- Production Trend ---
async function getProductionTrend(filters) {
    const { groupBy, startDate, endDate } = filters;
    // Find all completed product batches, use packaging stage record's createdAt as completion date
    const batchWhere = {
        batchType: "product",
        status: "completed",
    };
    // Get packaging stage code (the last real production stage that completes a product batch)
    const packagingStage = await database_js_1.prisma.processStage.findUnique({
        where: { code: "packaging" },
    });
    if (!packagingStage) {
        return [];
    }
    // Get packaging progress records (completion records) for product batches
    const recordWhere = {
        stageId: packagingStage.id,
        batch: { batchType: "product", status: "completed" },
    };
    if (startDate || endDate) {
        const createdAt = {};
        if (startDate)
            createdAt.gte = new Date(startDate);
        if (endDate)
            createdAt.lte = new Date(endDate);
        recordWhere.createdAt = createdAt;
    }
    if (!startDate && !endDate) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        recordWhere.createdAt = { gte: thirtyDaysAgo };
    }
    const records = await database_js_1.prisma.progressRecord.findMany({
        where: recordWhere,
        include: { batch: { select: { quantity: true } } },
        orderBy: { createdAt: "asc" },
    });
    // Group by period and sum quantities
    const grouped = new Map();
    for (const r of records) {
        const d = new Date(r.createdAt);
        let period;
        if (groupBy === "week") {
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - d.getDay());
            period = weekStart.toISOString().slice(0, 10);
        }
        else if (groupBy === "month") {
            period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        }
        else {
            period = d.toISOString().slice(0, 10);
        }
        const g = grouped.get(period) ?? { batchCount: 0, totalQuantity: 0 };
        g.batchCount++;
        g.totalQuantity += r.batch?.quantity ?? 0;
        grouped.set(period, g);
    }
    return Array.from(grouped.entries()).map(([period, g]) => ({
        period,
        batchCount: g.batchCount,
        totalQuantity: g.totalQuantity,
    }));
}
// --- Anomaly Detection ---
async function getAnomalies() {
    const anomalies = [];
    // Delayed batches (no progress update in 7+ days)
    const activeBatches = await database_js_1.prisma.batch.findMany({
        where: { status: "active" },
        include: { progressRecords: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
    for (const b of activeBatches) {
        const lastUpdate = b.progressRecords[0]?.createdAt;
        if (lastUpdate && Date.now() - new Date(lastUpdate).getTime() > fiveDaysMs) {
            anomalies.push({
                type: "batch_delay",
                severity: "major",
                batchId: b.id,
                batchNo: b.batchNo,
                description: `超过5天无进度更新`,
                value: Math.round((Date.now() - new Date(lastUpdate).getTime()) / (24 * 60 * 60 * 1000)),
                threshold: 5,
            });
        }
    }
    return anomalies;
}
// --- Grouped Statistics (by customerCode / packageType) ---
async function getGroupedStatistics(filters) {
    const groupBy = filters.groupBy;
    if (!ALLOWED_GROUP_BY.includes(groupBy)) {
        throw new Error("groupBy 必须为 customerCode 或 packageType");
    }
    const { startDate, endDate } = filters;
    const batchWhere = {};
    if (startDate || endDate) {
        const createdAt = {};
        if (startDate)
            createdAt.gte = new Date(startDate);
        if (endDate)
            createdAt.lte = new Date(endDate);
        batchWhere.createdAt = createdAt;
    }
    const batches = await database_js_1.prisma.batch.findMany({
        where: batchWhere,
        include: {
            product: true,
            progressRecords: {
                select: { id: true },
            },
        },
    });
    const grouped = new Map();
    for (const b of batches) {
        const key = b[groupBy] ?? "未指定";
        const g = grouped.get(key) ?? { batchCount: 0, totalQuantity: 0 };
        g.batchCount++;
        g.totalQuantity += b.quantity;
        grouped.set(key, g);
    }
    return Array.from(grouped.entries()).map(([group, g]) => ({
        group,
        batchCount: g.batchCount,
        totalQuantity: g.totalQuantity,
    }));
}
// --- Helper: get current stage from progress records ---
function getCurrentStageFromRecords(records) {
    if (!records.length)
        return "未开始";
    const completed = records
        .filter(r => r.status === "completed")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return completed[0]?.stage?.name || "未开始";
}
// --- Excel Export ---
async function exportExcel(filters) {
    // Dynamic import for xlsx (large library)
    const XLSX = await import("xlsx");
    let data = [];
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
                完成批次数: t.batchCount,
                总产量: t.totalQuantity,
            }));
            sheetName = "产量趋势";
            break;
        }
        case "online": {
            const batches = await database_js_1.prisma.batch.findMany({
                where: { status: "active" },
                include: {
                    product: true,
                    progressRecords: { include: { stage: true } },
                },
                orderBy: { createdAt: "desc" },
            });
            const wb = XLSX.utils.book_new();
            // Product sheet
            const productRows = batches.filter(b => b.batchType === "product").map(b => {
                const currentStage = getCurrentStageFromRecords(b.progressRecords);
                return {
                    批号: b.batchNo,
                    产品型号: b.product?.model || "",
                    数量: b.quantity,
                    封装形式: b.packageType || "",
                    客户代码: b.customerCode || "",
                    订单编号: b.orderNo || "",
                    优先级: b.priority === "urgent" ? "紧急" : "普通",
                    当前工序: currentStage,
                    备注: b.notes || "",
                    创建时间: b.createdAt.toISOString().slice(0, 10),
                };
            });
            if (productRows.length) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productRows), "在线产品");
            }
            // Trial sheet
            const trialRows = batches.filter(b => b.batchType === "trial").map(b => {
                const currentStage = getCurrentStageFromRecords(b.progressRecords);
                return {
                    批号: b.batchNo,
                    试验内容: b.trialContent || "",
                    封装形式: b.packageType || "",
                    要求完成时间: b.customerDelivery ? b.customerDelivery.toISOString().slice(0, 10) : "",
                    备注: b.notes || "",
                    当前工序: currentStage,
                    创建时间: b.createdAt.toISOString().slice(0, 10),
                };
            });
            if (trialRows.length) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trialRows), "在线试验");
            }
            if (wb.SheetNames.length === 0) {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{}]), "空");
            }
            return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        }
        case "anomalies": {
            const anomalyData = await getAnomalies();
            data = anomalyData.map((a) => ({
                批号: a.batchNo,
                延迟天数: a.value,
                阈值天数: a.threshold,
                描述: a.description,
            }));
            sheetName = "延迟预警";
            break;
        }
        default:
            throw new Error(`不支持的导出类型: ${filters.type}`);
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
//# sourceMappingURL=statistics.js.map