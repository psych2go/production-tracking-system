import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";

/**
 * Get the schedule queue for a specific stage.
 * Shows batches whose latest completed stage is this stage (i.e. currently "at" this station).
 * Auto-syncs the ScheduleOrder table (insert missing, remove stale).
 */
export async function getScheduleQueue(stageId: number) {
  const stage = await prisma.processStage.findUnique({ where: { id: stageId } });
  if (!stage) throw new Error("工序不存在");

  // Efficiently find batch IDs whose latest completed stage is this stage
  // using a raw SQL query instead of loading all active batches into memory
  const eligibleRows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT b.id
    FROM batches b
    WHERE b.status = 'active'
    AND (
      SELECT pr.stage_id
      FROM progress_records pr
      WHERE pr.batch_id = b.id AND pr.status = 'completed'
      ORDER BY pr.created_at DESC
      LIMIT 1
    ) = ${stageId}
  `;
  const eligibleBatchIds = eligibleRows.map((r) => r.id);

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
 * Get batch counts for all stages in a single call.
 * Returns { stageId: count } for stages that have batches waiting.
 */
export async function getScheduleCounts() {
  const stages = await prisma.processStage.findMany({
    where: { code: { not: "completed" } },
    select: { id: true },
  });

  // Single query to find all batches' latest completed stages
  const latestStages = await prisma.$queryRaw<{ batchId: number; stageId: number }[]>`
    SELECT b.id as batchId, (
      SELECT pr.stage_id
      FROM progress_records pr
      WHERE pr.batch_id = b.id AND pr.status = 'completed'
      ORDER BY pr.created_at DESC
      LIMIT 1
    ) as stageId
    FROM batches b
    WHERE b.status = 'active'
  `;

  const counts: Record<number, number> = {};
  for (const stage of stages) {
    counts[stage.id] = 0;
  }
  for (const row of latestStages) {
    if (row.stageId != null && counts[row.stageId] !== undefined) {
      counts[row.stageId]++;
    }
  }

  return counts;
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
