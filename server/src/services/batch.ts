import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";

function sumQuantityDetail(detail: string): number {
  try {
    const parsed = JSON.parse(detail);
    return Object.values(parsed).reduce((sum: number, v) => sum + Number(v), 0);
  } catch {
    return 0;
  }
}

export async function listBatches(filters: {
  status?: string;
  productId?: number;
  keyword?: string;
  customerCode?: string;
  packageType?: string;
  batchType?: string;
  page?: number;
  pageSize?: number;
}) {
  const { status, productId, keyword, customerCode, packageType, batchType, page = 1, pageSize = 50 } = filters;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (productId) where.productId = productId;
  if (customerCode) where.customerCode = customerCode;
  if (packageType) where.packageType = { contains: packageType };
  if (batchType) where.batchType = batchType;
  if (keyword) {
    where.OR = [
      { batchNo: { contains: keyword } },
      { product: { model: { contains: keyword } } },
      { product: { name: { contains: keyword } } },
      { trialContent: { contains: keyword } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.batch.findMany({
      where,
      include: {
        product: true,
        creator: { select: { id: true, name: true } },
        progressRecords: {
          include: { stage: true },
          orderBy: { stage: { stageOrder: "asc" } },
        },
      },
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
  batchType?: string;
  batchNo?: string;
  productModel?: string;
  quantity?: number;
  quantityDetail?: string;
  packageType?: string;
  customerCode?: string;
  orderNo?: string;
  customerDelivery?: string;
  productionDelivery?: string;
  priority?: string;
  trialContent?: string;
  notes?: string;
  createdBy?: number;
}) {
  return prisma.$transaction(async (tx) => {
    if (data.batchType === "trial") {
      const batchNo = await generateTrialBatchNo(tx);
      const quantity = data.quantityDetail
        ? sumQuantityDetail(data.quantityDetail)
        : (data.quantity ?? 0);

      return tx.batch.create({
        data: {
          batchNo,
          batchType: "trial",
          quantity,
          quantityDetail: data.quantityDetail || undefined,
          packageType: data.packageType || undefined,
          customerDelivery: data.customerDelivery ? new Date(data.customerDelivery) : undefined,
          trialContent: data.trialContent,
          notes: data.notes || undefined,
          createdBy: data.createdBy,
        },
      });
    }

    // Product batch
    const product = await tx.product.upsert({
      where: { model: data.productModel! },
      update: {},
      create: { model: data.productModel! },
    });

    const existing = await tx.batch.findFirst({
      where: { batchNo: data.batchNo!, productId: product.id },
    });
    if (existing) {
      throw new Error(`批号「${data.batchNo}」+ 型号「${data.productModel}」已存在，不可重复创建`);
    }

    return tx.batch.create({
      data: {
        batchNo: data.batchNo!,
        batchType: "product",
        productId: product.id,
        quantity: data.quantity!,
        packageType: data.packageType || undefined,
        customerCode: data.customerCode || undefined,
        orderNo: data.orderNo || undefined,
        customerDelivery: data.customerDelivery ? new Date(data.customerDelivery) : undefined,
        productionDelivery: data.productionDelivery ? new Date(data.productionDelivery) : undefined,
        priority: data.priority || undefined,
        notes: data.notes || undefined,
        createdBy: data.createdBy,
      },
    });
  });
}

async function generateTrialBatchNo(tx: Prisma.TransactionClient, retries = 3): Promise<string> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const prefix = `S${dateStr}-`;

  const lastBatch = await tx.batch.findFirst({
    where: { batchNo: { startsWith: prefix }, batchType: "trial" },
    orderBy: { batchNo: "desc" },
    select: { batchNo: true },
  });

  let seq = 1;
  if (lastBatch) {
    const lastSeq = parseInt(lastBatch.batchNo.split("-").pop() || "0", 10);
    seq = lastSeq + 1;
  }

  const batchNo = `${prefix}${String(seq).padStart(3, "0")}`;

  // Concurrent conflict protection: retry if the generated batchNo already exists
  if (retries > 0) {
    const existing = await tx.batch.findFirst({
      where: { batchNo, batchType: "trial" },
      select: { id: true },
    });
    if (existing) {
      return generateTrialBatchNo(tx, retries - 1);
    }
  }

  return batchNo;
}

export async function deleteBatch(id: number) {
  const batch = await prisma.batch.findUnique({ where: { id } });
  if (!batch) throw new Error("批次不存在");

  await prisma.$transaction([
    prisma.progressRecord.deleteMany({ where: { batchId: id } }),
    prisma.scheduleOrder.deleteMany({ where: { batchId: id } }),
    prisma.batch.delete({ where: { id } }),
  ]);

  return { id };
}

export async function updateBatch(id: number, data: {
  status?: string;
  priority?: string;
  batchNo?: string;
  productModel?: string;
  quantity?: number;
  quantityDetail?: string;
  trialContent?: string;
  customerCode?: string | null;
  orderNo?: string | null;
  packageType?: string | null;
  customerDelivery?: string | null;
  productionDelivery?: string | null;
  notes?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = {
      status: data.status,
      priority: data.priority,
      customerCode: data.customerCode,
      orderNo: data.orderNo,
      packageType: data.packageType,
      customerDelivery: data.customerDelivery !== undefined
        ? (data.customerDelivery ? new Date(data.customerDelivery) : null)
        : undefined,
      productionDelivery: data.productionDelivery !== undefined
        ? (data.productionDelivery ? new Date(data.productionDelivery) : null)
        : undefined,
      notes: data.notes,
    };

    if (data.batchNo !== undefined) updateData.batchNo = data.batchNo;
    if (data.trialContent !== undefined) updateData.trialContent = data.trialContent;
    if (data.quantityDetail !== undefined) {
      updateData.quantityDetail = data.quantityDetail;
      updateData.quantity = data.quantityDetail
        ? sumQuantityDetail(data.quantityDetail)
        : (data.quantity ?? 0);
    } else if (data.quantity !== undefined) {
      updateData.quantity = data.quantity;
    }

    if (data.productModel !== undefined) {
      const product = await tx.product.upsert({
        where: { model: data.productModel },
        update: {},
        create: { model: data.productModel },
      });
      updateData.productId = product.id;
    }

    // Check batchNo + productId uniqueness when either field is being updated
    const finalBatchNo = data.batchNo !== undefined ? data.batchNo : undefined;
    const finalProductId = updateData.productId !== undefined ? updateData.productId : undefined;
    if (finalBatchNo !== undefined && finalProductId !== undefined) {
      const existing = await tx.batch.findFirst({
        where: { batchNo: finalBatchNo, productId: finalProductId, id: { not: id } },
        select: { id: true },
      });
      if (existing) {
        throw new Error(`批号「${finalBatchNo}」+ 型号「${data.productModel}」已存在，不可重复创建`);
      }
    }

    return tx.batch.update({
      where: { id },
      data: updateData,
    });
  });
}
