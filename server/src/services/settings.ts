import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
