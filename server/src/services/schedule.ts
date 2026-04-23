import { prisma } from "../config/database.js";

/**
 * Get the schedule queue for a specific stage.
 * Shows batches whose latest completed stage is this stage (i.e. currently "at" this station).
 * Batches with no progress show in the first stage only.
 * Auto-syncs the ScheduleOrder table (insert missing, remove stale).
 */
export async function getScheduleQueue(stageId: number) {
  const stage = await prisma.processStage.findUnique({ where: { id: stageId } });
  if (!stage) throw new Error("工序不存在");

  // Build stageId → stageOrder mapping
  const allStages = await prisma.processStage.findMany({
    select: { id: true, stageOrder: true },
    orderBy: { stageOrder: "asc" },
  });
  const stageOrderMap = new Map(allStages.map((s) => [s.id, s.stageOrder]));

  // Find all active batches with their progress records
  const activeBatches = await prisma.batch.findMany({
    where: { status: "active" },
    include: {
      progressRecords: true,
      product: true,
      creator: { select: { id: true, name: true } },
    },
  });

  // Filter: batch's latest completed stage IS this stage
  const eligibleBatchIds = activeBatches
    .filter((batch) => {
      const completedStageIds = batch.progressRecords
        .filter((r) => r.status === "completed")
        .map((r) => r.stageId);

      if (completedStageIds.length === 0) {
        return false;
      }

      // Find the latest completed stage (highest stageOrder)
      let latestStageId = completedStageIds[0];
      let latestOrder = stageOrderMap.get(latestStageId) ?? 0;
      for (const sid of completedStageIds.slice(1)) {
        const order = stageOrderMap.get(sid) ?? 0;
        if (order > latestOrder) {
          latestOrder = order;
          latestStageId = sid;
        }
      }

      return latestStageId === stageId;
    })
    .map((b) => b.id);

  // Sync ScheduleOrder table
  const existingOrders = await prisma.scheduleOrder.findMany({
    where: { stageId },
  });
  const existingBatchIds = new Set(existingOrders.map((o) => o.batchId));

  // Find batches to add and remove
  const toAdd = eligibleBatchIds.filter((id) => !existingBatchIds.has(id));
  const toRemove = existingOrders
    .filter((o) => !eligibleBatchIds.includes(o.batchId))
    .map((o) => o.id);

  if (toAdd.length > 0 || toRemove.length > 0) {
    await prisma.$transaction(async (tx) => {
      // Get current max orderNum
      const maxOrder = await tx.scheduleOrder.aggregate({
        where: { stageId },
        _max: { orderNum: true },
      });
      let nextOrder = (maxOrder._max.orderNum ?? 0) + 1;

      // Sort new batches by when they were flowed to this stage (earliest first)
      const toAddWithTime = await Promise.all(
        toAdd.map(async (batchId) => {
          const record = await tx.progressRecord.findFirst({
            where: { batchId, stageId },
            orderBy: { createdAt: "asc" },
            select: { createdAt: true },
          });
          return { batchId, createdAt: record?.createdAt ?? new Date(0) };
        })
      );
      toAddWithTime.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      for (const item of toAddWithTime) {
        await tx.scheduleOrder.create({
          data: { stageId, batchId: item.batchId, orderNum: nextOrder++ },
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
  const orders = await prisma.scheduleOrder.findMany({
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
export async function reorderSchedule(
  stageId: number,
  batchId: number,
  direction: "up" | "down"
) {
  const orders = await prisma.scheduleOrder.findMany({
    where: { stageId },
    orderBy: { orderNum: "asc" },
  });

  const idx = orders.findIndex((o) => o.batchId === batchId);
  if (idx < 0) throw new Error("批次不在排单队列中");

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= orders.length) return; // already at boundary

  // Swap orderNum values
  await prisma.$transaction([
    prisma.scheduleOrder.update({
      where: { id: orders[idx].id },
      data: { orderNum: orders[swapIdx].orderNum },
    }),
    prisma.scheduleOrder.update({
      where: { id: orders[swapIdx].id },
      data: { orderNum: orders[idx].orderNum },
    }),
  ]);
}
