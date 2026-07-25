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
  const all = await prisma.packageType.findMany();
  return all.sort((a, b) => {
    if (a.category !== b.category) return (a.category || "").localeCompare(b.category || "");
    const numA = parseInt(a.name.match(/\d+/)?.[0] || "0", 10);
    const numB = parseInt(b.name.match(/\d+/)?.[0] || "0", 10);
    return numA - numB;
  });
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

export async function updatePackageType(
  id: number,
  data: { name?: string; category?: string; sortOrder?: number }
) {
  return prisma.packageType.update({ where: { id }, data });
}

export async function deletePackageType(id: number) {
  const pt = await prisma.packageType.findUnique({ where: { id } });
  if (!pt) throw new Error("封装形式不存在");

  // packageType 可能是逗号分隔的多选值（如 "SOP16L,SOP28L"），先用 contains 快速筛选，
  // 再在 JS 层精确匹配逗号分隔项，避免子串误匹配（如 "SOP16" 误匹配 "SOP16L"）。
  const candidateBatches = await prisma.batch.findMany({
    where: { packageType: { contains: pt.name } },
    select: { id: true, packageType: true },
  });
  const actualCount = candidateBatches.filter((b) =>
    b.packageType?.split(",").map((s) => s.trim()).includes(pt.name)
  ).length;
  if (actualCount > 0) {
    throw new Error(`该封装形式已有 ${actualCount} 个批次使用，无法删除`);
  }

  return prisma.packageType.delete({ where: { id } });
}

// ===== Customer Code CRUD =====

export async function listCustomerCodes() {
  return prisma.customerCode.findMany({ orderBy: { code: "asc" } });
}

export async function createCustomerCode(data: { code: string }) {
  return prisma.customerCode.create({ data: { code: data.code } });
}

export async function deleteCustomerCode(id: number) {
  const cc = await prisma.customerCode.findUnique({ where: { id } });
  if (!cc) throw new Error("客户代码不存在");

  const batchCount = await prisma.batch.count({ where: { customerCode: cc.code } });
  if (batchCount > 0) {
    throw new Error(`该客户代码已有 ${batchCount} 个批次使用，无法删除`);
  }

  return prisma.customerCode.delete({ where: { id } });
}
