"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getScheduleQueue = getScheduleQueue;
exports.reorderSchedule = reorderSchedule;
const database_js_1 = require("../config/database.js");
/**
 * Get the schedule queue for a specific stage.
 * Returns batches that have completed all previous stages but haven't completed this stage.
 * Auto-syncs the ScheduleOrder table (insert missing, remove stale).
 */
async function getScheduleQueue(stageId) {
    const stage = await database_js_1.prisma.processStage.findUnique({ where: { id: stageId } });
    if (!stage)
        throw new Error("工序不存在");
    // Get all stages with lower stageOrder (prerequisites)
    const prevStages = await database_js_1.prisma.processStage.findMany({
        where: { stageOrder: { lt: stage.stageOrder } },
        select: { id: true },
    });
    const prevStageIds = prevStages.map((s) => s.id);
    // Find all active batches with their progress records
    const activeBatches = await database_js_1.prisma.batch.findMany({
        where: { status: "active" },
        include: {
            progressRecords: true,
            product: true,
            creator: { select: { id: true, name: true } },
        },
    });
    // Filter: all previous stages completed, this stage NOT completed
    const eligibleBatchIds = activeBatches
        .filter((batch) => {
        const completedStageIds = batch.progressRecords
            .filter((r) => r.status === "completed")
            .map((r) => r.stageId);
        const allPrevDone = prevStageIds.every((id) => completedStageIds.includes(id));
        const currentNotDone = !completedStageIds.includes(stageId);
        return allPrevDone && currentNotDone;
    })
        .map((b) => b.id);
    // Sync ScheduleOrder table
    const existingOrders = await database_js_1.prisma.scheduleOrder.findMany({
        where: { stageId },
    });
    const existingBatchIds = new Set(existingOrders.map((o) => o.batchId));
    // Find batches to add and remove
    const toAdd = eligibleBatchIds.filter((id) => !existingBatchIds.has(id));
    const toRemove = existingOrders
        .filter((o) => !eligibleBatchIds.includes(o.batchId))
        .map((o) => o.id);
    if (toAdd.length > 0 || toRemove.length > 0) {
        await database_js_1.prisma.$transaction(async (tx) => {
            // Get current max orderNum
            const maxOrder = await tx.scheduleOrder.aggregate({
                where: { stageId },
                _max: { orderNum: true },
            });
            let nextOrder = (maxOrder._max.orderNum ?? 0) + 1;
            // Insert new batches
            for (const batchId of toAdd) {
                await tx.scheduleOrder.create({
                    data: { stageId, batchId, orderNum: nextOrder++ },
                });
            }
            // Remove stale entries
            if (toRemove.length > 0) {
                await tx.scheduleOrder.deleteMany({
                    where: { id: { in: toRemove } },
                });
            }
        });
    }
    // Fetch ordered list with full batch info
    const orders = await database_js_1.prisma.scheduleOrder.findMany({
        where: { stageId },
        include: {
            batch: {
                include: {
                    product: true,
                    creator: { select: { id: true, name: true } },
                    progressRecords: { include: { stage: true } },
                },
            },
        },
        orderBy: { orderNum: "asc" },
    });
    return orders.map((o, idx) => ({
        orderNum: idx + 1,
        batchId: o.batchId,
        batch: o.batch,
    }));
}
/**
 * Reorder a batch in the schedule queue (move up or down).
 * Only accessible by admin.
 */
async function reorderSchedule(stageId, batchId, direction) {
    const orders = await database_js_1.prisma.scheduleOrder.findMany({
        where: { stageId },
        orderBy: { orderNum: "asc" },
    });
    const idx = orders.findIndex((o) => o.batchId === batchId);
    if (idx < 0)
        throw new Error("批次不在排单队列中");
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= orders.length)
        return; // already at boundary
    // Swap orderNum values
    await database_js_1.prisma.$transaction([
        database_js_1.prisma.scheduleOrder.update({
            where: { id: orders[idx].id },
            data: { orderNum: orders[swapIdx].orderNum },
        }),
        database_js_1.prisma.scheduleOrder.update({
            where: { id: orders[swapIdx].id },
            data: { orderNum: orders[idx].orderNum },
        }),
    ]);
}
//# sourceMappingURL=schedule.js.map