import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function listBatches(filters: {
  status?: string;
  productId?: number;
  keyword?: string;
  page?: number;
  pageSize?: number;
}) {
  const { status, productId, keyword, page = 1, pageSize = 20 } = filters;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (productId) where.productId = productId;
  if (keyword) {
    where.OR = [
      { batchNo: { contains: keyword } },
      { product: { model: { contains: keyword } } },
      { product: { name: { contains: keyword } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.batch.findMany({
      where,
      include: { product: true, creator: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.batch.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getBatchDetail(id: number) {
  return prisma.batch.findUnique({
    where: { id },
    include: {
      product: true,
      creator: { select: { id: true, name: true } },
      progressRecords: {
        include: { stage: true, operator: { select: { id: true, name: true } } },
        orderBy: { stage: { stageOrder: "asc" } },
      },
    },
  });
}

export async function createBatch(data: {
  batchNo: string;
  productId: number;
  quantity: number;
  priority?: string;
  notes?: string;
  createdBy?: number;
}) {
  return prisma.batch.create({ data });
}

export async function updateBatch(id: number, data: { status?: string; priority?: string; notes?: string }) {
  return prisma.batch.update({ where: { id }, data });
}
