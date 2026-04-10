import { PrismaClient } from "@prisma/client";
import { getAnomalies } from "./statistics.js";

const prisma = new PrismaClient();

export async function upsertProgress(data: {
  batchId: number;
  stageId: number;
  operatorId: number;
  inputQuantity?: number;
  outputQuantity?: number;
  defectQuantity?: number;
  defectType?: string;
  defectNotes?: string;
  status?: string;
  notes?: string;
}) {
  return prisma.progressRecord.upsert({
    where: {
      batchId_stageId: { batchId: data.batchId, stageId: data.stageId },
    },
    update: {
      operatorId: data.operatorId,
      inputQuantity: data.inputQuantity,
      outputQuantity: data.outputQuantity,
      defectQuantity: data.defectQuantity ?? 0,
      defectType: data.defectType,
      defectNotes: data.defectNotes,
      status: data.status ?? "completed",
      notes: data.notes,
      completedAt: data.status === "completed" ? new Date() : undefined,
    },
    create: {
      batchId: data.batchId,
      stageId: data.stageId,
      operatorId: data.operatorId,
      inputQuantity: data.inputQuantity,
      outputQuantity: data.outputQuantity,
      defectQuantity: data.defectQuantity ?? 0,
      defectType: data.defectType,
      defectNotes: data.defectNotes,
      status: data.status ?? "completed",
      startedAt: new Date(),
      completedAt: data.status === "completed" ? new Date() : undefined,
      notes: data.notes,
    },
    include: { stage: true, operator: { select: { id: true, name: true } } },
  });
}

export async function listProgress(filters: {
  batchId?: number;
  stageId?: number;
  operatorId?: number;
  date?: string;
  page?: number;
  pageSize?: number;
}) {
  const { batchId, stageId, operatorId, page = 1, pageSize = 20 } = filters;

  const where: Record<string, unknown> = {};
  if (batchId) where.batchId = batchId;
  if (stageId) where.stageId = stageId;
  if (operatorId) where.operatorId = operatorId;

  const [items, total] = await Promise.all([
    prisma.progressRecord.findMany({
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
    prisma.progressRecord.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [activeBatches, todayRecords, totalBatches] = await Promise.all([
    prisma.batch.count({ where: { status: "active" } }),
    prisma.progressRecord.count({ where: { createdAt: { gte: today } } }),
    prisma.batch.count(),
  ]);

  // Recent activity (last 10 records)
  const recentActivity = await prisma.progressRecord.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      batch: { include: { product: true } },
      stage: true,
      operator: { select: { id: true, name: true } },
    },
  });

  // Batches currently in progress (with latest stage info)
  const activeBatchList = await prisma.batch.findMany({
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
  let anomalies: Array<{ type: string; severity: string; batchId: number; batchNo: string; description: string; value: number; threshold: number }> = [];

  try {
    const anomalyData = await getAnomalies();
    anomalies = anomalyData.slice(0, 5);
  } catch {
    // Non-critical: dashboard still works without anomalies
  }

  return {
    stats: { activeBatches, todayRecords, totalBatches },
    recentActivity,
    activeBatchList,
    anomalies,
  };
}

export async function getStages() {
  return prisma.processStage.findMany({ orderBy: { stageOrder: "asc" } });
}

export async function getStageProducts(stageId: number) {
  // Get all batches that have a progress record at this stage
  const records = await prisma.progressRecord.findMany({
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
