import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";

async function validatePackageType(tx: Prisma.TransactionClient, packageType: string | undefined | null) {
  if (!packageType) return;
  // 封装形式可多选，存储为逗号分隔；逐个校验存在性
  const names = packageType.split(",").map((s) => s.trim()).filter(Boolean);
  for (const name of names) {
    const exists = await tx.packageType.findUnique({ where: { name } });
    if (!exists) throw new Error(`封装形式「${name}」不存在，请先在设置中创建`);
  }
}

async function validateCustomerCode(tx: Prisma.TransactionClient, customerCode: string | undefined | null) {
  if (!customerCode) return;
  // 客户代码表为空（全新库未 seed）时跳过校验，避免破坏初始批次创建
  const total = await tx.customerCode.count();
  if (total === 0) return;
  const exists = await tx.customerCode.findUnique({ where: { code: customerCode } });
  if (!exists) throw new Error(`客户代码「${customerCode}」不存在，请先在设置中创建`);
}

export async function listBatches(filters: {
  status?: string;
  productId?: number;
  keyword?: string;
  customerCode?: string;
  packageType?: string;
  page?: number;
  pageSize?: number;
}) {
  const { status, productId, keyword, customerCode, packageType, page = 1, pageSize = 50 } = filters;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (productId) where.productId = productId;
  if (customerCode) where.customerCode = customerCode;
  if (packageType) where.packageType = { contains: packageType };
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
  batchNo?: string;
  productModel?: string;
  quantity?: number;
  packageType?: string;
  customerCode?: string;
  orderNo?: string;
  customerDelivery?: string;
  productionDelivery?: string;
  priority?: string;
  notes?: string;
  createdBy?: number;
}) {
  return prisma.$transaction(async (tx) => {
    await validatePackageType(tx, data.packageType);
    await validateCustomerCode(tx, data.customerCode);

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

export async function deleteBatch(id: number) {
  const batch = await prisma.batch.findUnique({ where: { id } });
  if (!batch) throw new Error("批次不存在");

  await prisma.$transaction([
    prisma.progressRecord.deleteMany({ where: { batchId: id } }),
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
  customerCode?: string | null;
  orderNo?: string | null;
  packageType?: string | null;
  customerDelivery?: string | null;
  productionDelivery?: string | null;
  notes?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const batch = await tx.batch.findUnique({
      where: { id },
      include: { product: { select: { model: true } } },
    });
    if (!batch) throw new Error("批次不存在");

    const updateData: Record<string, unknown> = {
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

    // Only allow archiving completed batches via update; other status changes go through progress flow
    if (data.status !== undefined) {
      if (data.status === "archived" && batch.status === "completed") {
        updateData.status = "archived";
      } else if (data.status !== batch.status) {
        throw new Error("批次状态变更请通过工序流转操作");
      }
    }

    if (data.quantity !== undefined) {
      updateData.quantity = data.quantity;
    }

    // Validate packageType against PackageType table — 仅当传入新值时校验
    if (data.packageType !== undefined) {
      await validatePackageType(tx, data.packageType);
    }
    // Validate customerCode against CustomerCode table — 仅当传入新值时校验
    if (data.customerCode !== undefined) {
      await validateCustomerCode(tx, data.customerCode);
    }

    if (data.productModel !== undefined) {
      const product = await tx.product.upsert({
        where: { model: data.productModel },
        update: {},
        create: { model: data.productModel },
      });
      updateData.productId = product.id;
    }

    // Check batchNo + productId uniqueness when batchNo or productModel changes
    const finalBatchNo = data.batchNo !== undefined ? data.batchNo : batch.batchNo;
    const finalProductId = updateData.productId !== undefined ? updateData.productId as number : batch.productId;
    if (data.batchNo !== undefined || data.productModel !== undefined) {
      const existing = await tx.batch.findFirst({
        where: { batchNo: finalBatchNo, productId: finalProductId, id: { not: id } },
        select: { id: true },
      });
      if (existing) {
        const modelLabel = data.productModel || batch.product?.model || "(当前型号)";
        throw new Error(`批号「${finalBatchNo}」+ 型号「${modelLabel}」组合已存在，不可重复更新`);
      }
    }

    return tx.batch.update({
      where: { id },
      data: updateData,
    });
  });
}
