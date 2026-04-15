import { prisma } from "../config/database.js";

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
  return prisma.product.create({ data });
}

export async function updateProduct(id: number, data: { model?: string; name?: string; description?: string }) {
  return prisma.product.update({ where: { id }, data });
}

export async function deleteProduct(id: number) {
  return prisma.product.update({ where: { id }, data: { isActive: false } });
}
