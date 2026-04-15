import { prisma } from "../config/database.js";

export async function createStage(data: {
  code: string;
  name: string;
  stageOrder: number;
  isQcStage?: boolean;
  description?: string;
}) {
  return prisma.processStage.create({ data });
}

export async function updateStage(
  id: number,
  data: {
    name?: string;
    stageOrder?: number;
    isQcStage?: boolean;
    description?: string;
  }
) {
  return prisma.processStage.update({ where: { id }, data });
}

export async function deleteStage(id: number) {
  // Check for related records
  const progressCount = await prisma.progressRecord.count({ where: { stageId: id } });

  if (progressCount > 0) {
    throw new Error(`该工序已有 ${progressCount} 条进度记录，无法删除`);
  }

  return prisma.processStage.delete({ where: { id } });
}

// ===== Package Type CRUD =====

export async function listPackageTypes() {
  return prisma.packageType.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function createPackageType(data: {
  name: string;
  category?: string;
  sortOrder?: number;
}) {
  return prisma.packageType.create({
    data: {
      name: data.name,
      category: data.category ?? "",
      sortOrder: data.sortOrder,
    },
  });
}

export async function deletePackageType(id: number) {
  const pt = await prisma.packageType.findUnique({ where: { id } });
  if (!pt) throw new Error("封装形式不存在");

  const batchCount = await prisma.batch.count({ where: { packageType: pt.name } });
  if (batchCount > 0) {
    throw new Error(`该封装形式已有 ${batchCount} 个批次使用，无法删除`);
  }

  return prisma.packageType.delete({ where: { id } });
}
