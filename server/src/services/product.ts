import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";

function normalizeModel(model: string) {
  return model.trim().toLocaleLowerCase("en-US");
}

function translateDuplicate(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new Error("产品型号已存在");
  }
  throw error;
}

export async function listProducts(page = 1, pageSize = 50) {
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where: { isActive: true } }),
  ]);
  return { items, total, page, pageSize };
}

export async function createProduct(data: { model: string; name?: string; description?: string }) {
  const model = data.model.trim();
  const normalized = normalizeModel(model);
  const products = await prisma.product.findMany({ select: { model: true } });
  if (products.some((product) => normalizeModel(product.model) === normalized)) {
    throw new Error("产品型号已存在");
  }
  try {
    return await prisma.product.create({ data: { ...data, model, modelNormalized: normalized } });
  } catch (error) {
    translateDuplicate(error);
  }
}

export async function updateProduct(id: number, data: { model?: string; name?: string; description?: string }) {
  const updateData = data.model === undefined
    ? data
    : { ...data, model: data.model.trim(), modelNormalized: normalizeModel(data.model) };
  try {
    return await prisma.product.update({ where: { id }, data: updateData });
  } catch (error) {
    translateDuplicate(error);
  }
}

export async function deleteProduct(id: number) {
  const batchCount = await prisma.batch.count({ where: { productId: id } });
  if (batchCount > 0) {
    throw new Error(`该产品已有 ${batchCount} 个批次引用，无法删除`);
  }
  return prisma.product.update({ where: { id }, data: { isActive: false } });
}
