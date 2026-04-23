"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertProgress = upsertProgress;
exports.listProgress = listProgress;
exports.getDashboardData = getDashboardData;
exports.getStages = getStages;
exports.getStageProducts = getStageProducts;
const database_js_1 = require("../config/database.js");
const statistics_js_1 = require("./statistics.js");
async function upsertProgress(data) {
    return database_js_1.prisma.$transaction(async (tx) => {
        // Check if already completed this stage
        const existing = await tx.progressRecord.findUnique({
            where: {
                batchId_stageId: { batchId: data.batchId, stageId: data.stageId },
            },
            include: { stage: true },
        });
        if (existing) {
            throw new Error(`批次已流转过「${existing.stage.name}」工序（${existing.createdAt ? new Date(existing.createdAt).toLocaleString("zh-CN") : ""}），不可重复流转。如需修改请删除批次后重新录入。`);
        }
        const batch = await tx.batch.findUnique({ where: { id: data.batchId } });
        if (!batch)
            throw new Error("批次不存在");
        if (batch.status !== "active")
            throw new Error("批次已结束，不可流转");
        const record = await tx.progressRecord.create({
            data: {
                batchId: data.batchId,
                stageId: data.stageId,
                operatorId: data.operatorId,
                status: data.status ?? "completed",
                notes: data.notes,
            },
            include: { stage: true, operator: { select: { id: true, name: true } } },
        });
        // Auto-complete batch when reaching "packaging" or "completed" stage
        const currentStage = await tx.processStage.findUnique({ where: { id: data.stageId } });
        if (currentStage?.code === "packaging") {
            // Flow to packaging: auto-create "completed" stage record + complete batch
            const completedStage = await tx.processStage.findUnique({ where: { code: "completed" } });
            if (completedStage) {
                await tx.progressRecord.upsert({
                    where: { batchId_stageId: { batchId: data.batchId, stageId: completedStage.id } },
                    update: { operatorId: data.operatorId, status: "completed" },
                    create: {
                        batchId: data.batchId,
                        stageId: completedStage.id,
                        operatorId: data.operatorId,
                        status: "completed",
                    },
                });
            }
            await tx.batch.update({ where: { id: data.batchId }, data: { status: "completed" } });
        }
        else if (currentStage?.code === "completed") {
            // Directly flow to "completed" stage
            await tx.batch.update({ where: { id: data.batchId }, data: { status: "completed" } });
        }
        return record;
    });
}
async function listProgress(filters) {
    const { batchId, stageId, operatorId, page = 1, pageSize = 20 } = filters;
    const where = {};
    if (batchId)
        where.batchId = batchId;
    if (stageId)
        where.stageId = stageId;
    if (operatorId)
        where.operatorId = operatorId;
    const [items, total] = await Promise.all([
        database_js_1.prisma.progressRecord.findMany({
            where,
            include: {
                batch: { include: { product: true } },
                stage: true,
                operator: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        database_js_1.prisma.progressRecord.count({ where }),
    ]);
    return { items, total, page, pageSize };
}
async function getDashboardData() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [activeProductBatches, activeProductQuantity, totalTrialBatches] = await Promise.all([
        database_js_1.prisma.batch.count({ where: { status: "active", batchType: "product" } }),
        database_js_1.prisma.batch.aggregate({ where: { status: "active", batchType: "product" }, _sum: { quantity: true } }),
        database_js_1.prisma.batch.count({ where: { batchType: "trial" } }),
    ]);
    // Recent activity (last 10 records)
    const recentActivity = await database_js_1.prisma.progressRecord.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
            batch: { include: { product: true } },
            stage: true,
            operator: { select: { id: true, name: true } },
        },
    });
    // Batches currently in progress (with latest stage info)
    const activeBatchList = await database_js_1.prisma.batch.findMany({
        where: { status: "active" },
        include: {
            product: true,
            progressRecords: {
                include: { stage: true },
                orderBy: { stage: { stageOrder: "desc" } },
            },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
    });
    // Get anomalies (batch delay only)
    let anomalies = [];
    try {
        const anomalyData = await (0, statistics_js_1.getAnomalies)();
        anomalies = anomalyData.slice(0, 5);
    }
    catch {
        // Non-critical: dashboard still works without anomalies
    }
    return {
        stats: { activeProductBatches, activeProductQuantity: activeProductQuantity._sum.quantity ?? 0, totalTrialBatches },
        recentActivity,
        activeBatchList,
        anomalies,
    };
}
async function getStages() {
    return database_js_1.prisma.processStage.findMany({ orderBy: { stageOrder: "asc" } });
}
async function getStageProducts(stageId) {
    // Get all batches that have a progress record at this stage
    const records = await database_js_1.prisma.progressRecord.findMany({
        where: { stageId },
        include: {
            batch: { include: { product: true, creator: { select: { name: true } } } },
            stage: true,
            operator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    return records;
}
//# sourceMappingURL=progress.js.map