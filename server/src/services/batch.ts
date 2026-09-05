import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";

export const BATCH_STATUSES = [
  "pending_card",
  "pending",
  "active",
  "completed",
  "archived",
  "cancelled",
] as const;

export const WORKER_VISIBLE_STATUSES = ["active", "completed", "archived"] as const;

export const PAUSABLE_STATUSES = ["pending_card", "pending", "active"] as const;

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function buildOrderIdentity(customerCode: string, orderNo: string): string {
  return `${customerCode.trim()}\u0000${orderNo.trim()}`;
}

function translateUniqueError(error: unknown, message: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new Error(message);
  }
  throw error;
}

async function validatePackageType(tx: Prisma.TransactionClient, packageType: string | undefined) {
  if (!packageType) return;
  const exists = await tx.packageType.findUnique({ where: { name: packageType } });
  if (!exists) throw new Error(`封装形式「${packageType}」不存在，请先在设置中创建`);
}

async function validateCustomerCode(tx: Prisma.TransactionClient, customerCode: string | undefined) {
  if (!customerCode) return;
  const exists = await tx.customerCode.findUnique({ where: { code: customerCode } });
  if (!exists) throw new Error(`客户代码「${customerCode}」不存在，请先在设置中创建`);
}

async function findOrCreateProduct(tx: Prisma.TransactionClient, productModel: string) {
  const model = productModel.trim();
  const normalized = normalizeText(model);
  const products = await tx.product.findMany({ select: { id: true, model: true } });
  const existing = products.find((product) => normalizeText(product.model) === normalized);
  if (existing) return existing;
  return tx.product.upsert({
    where: { modelNormalized: normalized },
    update: {},
    create: { model, modelNormalized: normalized },
    select: { id: true, model: true },
  });
}

async function assertOrderUnique(
  tx: Prisma.TransactionClient,
  customerCode: string,
  orderNo: string,
  excludeId?: number,
) {
  const existing = await tx.batch.findFirst({
    where: {
      customerCode,
      orderNo,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`客户「${customerCode}」下已存在订单编号「${orderNo}」，请检查后重新填写`);
  }
}

async function assertBatchIdentityUnique(
  tx: Prisma.TransactionClient,
  batchNo: string,
  productModel: string,
  excludeId?: number,
) {
  const normalizedBatchNo = normalizeText(batchNo);
  const normalizedProductModel = normalizeText(productModel);
  const candidates = await tx.batch.findMany({
    where: {
      batchNo: { not: null },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: {
      id: true,
      batchNo: true,
      batchNoNormalized: true,
      productModelNormalized: true,
      product: { select: { model: true } },
    },
  });
  const existing = candidates.find((candidate) =>
    (candidate.batchNoNormalized || normalizeText(candidate.batchNo || "")) === normalizedBatchNo
    && (candidate.productModelNormalized || normalizeText(candidate.product?.model || "")) === normalizedProductModel
  );
  if (existing) {
    throw new Error(`批号「${batchNo}」+ 型号「${productModel}」组合已存在，不可重复`);
  }
}

function visibleStatusesForRole(role: string): string[] | undefined {
  return role === "admin" ? undefined : [...WORKER_VISIBLE_STATUSES];
}

/** 补充客户名称/客户类型（统计与展示用），不改变原有字段。 */
async function enrichCustomerInfo<T extends { customerCode: string | null }>(
  items: T[],
): Promise<(T & { customerName: string | null; customerType: string | null })[]> {
  const codes = [...new Set(items.map((item) => item.customerCode).filter((code): code is string => !!code))];
  const customers = codes.length
    ? await prisma.customerCode.findMany({ where: { code: { in: codes } }, select: { code: true, name: true, type: true } })
    : [];
  const customerMap = new Map(customers.map((customer) => [customer.code, customer]));
  return items.map((item) => {
    const customer = item.customerCode ? customerMap.get(item.customerCode) : undefined;
    return {
      ...item,
      customerName: customer?.name ?? null,
      customerType: customer?.type ?? null,
    };
  });
}

export async function listBatches(filters: {
  status?: string;
  productId?: number;
  keyword?: string;
  customerCode?: string;
  packageType?: string;
  paused?: boolean;
  page?: number;
  pageSize?: number;
  role: string;
}) {
  const { status, productId, keyword, customerCode, packageType, paused, page = 1, pageSize = 50, role } = filters;
  const roleStatuses = visibleStatusesForRole(role);
  const where: Prisma.BatchWhereInput = {};

  if (status) {
    if (roleStatuses && !roleStatuses.includes(status)) {
      where.status = { in: [] };
    } else {
      where.status = status;
    }
  } else if (roleStatuses) {
    where.status = { in: roleStatuses };
  }
  if (productId) where.productId = productId;
  if (customerCode) where.customerCode = customerCode;
  if (packageType) where.packageType = packageType;
  if (paused !== undefined) where.pausedAt = paused ? { not: null } : null;
  if (keyword) {
    where.OR = [
      { batchNo: { contains: keyword } },
      { orderNo: { contains: keyword } },
      { customerCode: { contains: keyword } },
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
      orderBy: [
        { priority: "desc" },
        { customerDelivery: { sort: "asc", nulls: "last" } },
        { createdAt: "asc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.batch.count({ where }),
  ]);

  return { items: await enrichCustomerInfo(items), total, page, pageSize };
}

export async function getBatchCounts(role: string) {
  const roleStatuses = visibleStatusesForRole(role);
  const rows = await prisma.batch.groupBy({
    by: ["status"],
    where: roleStatuses ? { status: { in: roleStatuses } } : undefined,
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    counts[row.status] = row._count._all;
    total += row._count._all;
  }
  counts.all = total;
  counts.paused = await prisma.batch.count({
    where: {
      ...(roleStatuses ? { status: { in: roleStatuses } } : {}),
      pausedAt: { not: null },
    },
  });
  return counts;
}

export async function getBatchDetail(id: number, role: string) {
  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      product: true,
      creator: { select: { id: true, name: true } },
      progressRecords: {
        include: { stage: true, operator: { select: { id: true, name: true } } },
        orderBy: { stage: { stageOrder: "asc" } },
      },
      pauseRecords: {
        include: {
          starter: { select: { id: true, name: true } },
          ender: { select: { id: true, name: true } },
        },
        orderBy: { startedAt: "desc" },
      },
    },
  });
  if (batch && role !== "admin" && !WORKER_VISIBLE_STATUSES.includes(batch.status as typeof WORKER_VISIBLE_STATUSES[number])) {
    return null;
  }
  if (!batch) return batch;
  const [enriched] = await enrichCustomerInfo([batch]);
  return enriched;
}

export async function createOrder(data: {
  productModel: string;
  quantity: number;
  packageType: string;
  customerCode: string;
  orderNo: string;
  customerDelivery?: string;
  priority?: string;
  notes?: string;
  createdBy: number;
}) {
  const customerCode = data.customerCode.trim();
  const orderNo = data.orderNo.trim();
  try {
    return await prisma.$transaction(async (tx) => {
      const packageType = data.packageType.trim();
      await validatePackageType(tx, packageType);
      await validateCustomerCode(tx, customerCode);
      await assertOrderUnique(tx, customerCode, orderNo);
      const product = await findOrCreateProduct(tx, data.productModel);

      return tx.batch.create({
        data: {
          batchNo: null,
          batchNoNormalized: null,
          productModelNormalized: normalizeText(product.model),
          orderIdentity: buildOrderIdentity(customerCode, orderNo),
          productId: product.id,
          quantity: data.quantity,
          status: "pending_card",
          packageType,
          customerCode,
          orderNo,
          customerDelivery: data.customerDelivery ? new Date(data.customerDelivery) : undefined,
          priority: data.priority || "normal",
          notes: data.notes?.trim() || undefined,
          createdBy: data.createdBy,
        },
        include: { product: true },
      });
    });
  } catch (error) {
    translateUniqueError(error, `客户「${customerCode}」下已存在订单编号「${orderNo}」，请检查后重新填写`);
  }
}

export async function confirmBatchCard(id: number, data: {
  batchNo: string;
  productionDelivery?: string | null;
  notes?: string;
  operatorId: number;
}) {
  const batchNo = data.batchNo.trim();
  let productModel = "";
  try {
    return await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({ where: { id }, include: { product: true } });
      if (!batch) throw new Error("生产任务不存在");
      if (batch.status !== "pending_card") throw new Error("只有待制卡订单可以确认制卡");
      if (batch.pausedAt) throw new Error("生产任务暂停中，请先解除暂停");
      if (!batch.product) throw new Error("产品型号不存在");

      productModel = batch.product.model;
      await assertBatchIdentityUnique(tx, batchNo, productModel, id);
      return tx.batch.update({
        where: { id },
        data: {
          batchNo,
          batchNoNormalized: normalizeText(batchNo),
          productModelNormalized: normalizeText(productModel),
          productionDelivery: data.productionDelivery !== undefined
            ? (data.productionDelivery ? new Date(data.productionDelivery) : null)
            : undefined,
          notes: data.notes !== undefined ? data.notes.trim() || null : undefined,
          status: "pending",
          cardCreatedBy: data.operatorId,
          cardCreatedAt: new Date(),
        },
        include: { product: true },
      });
    });
  } catch (error) {
    translateUniqueError(error, `批号「${batchNo}」+ 型号「${productModel}」组合已存在，不可重复`);
  }
}

export async function startBatchProduction(id: number, operatorId: number) {
  return prisma.$transaction(async (tx) => {
    const batch = await tx.batch.findUnique({ where: { id } });
    if (!batch) throw new Error("生产任务不存在");
    if (batch.status !== "pending") throw new Error("只有待投产任务可以投入加工");
    if (batch.pausedAt) throw new Error("生产任务暂停中，请先解除暂停");
    return tx.batch.update({
      where: { id },
      data: { status: "active", startedBy: operatorId, startedAt: new Date() },
      include: { product: true },
    });
  });
}

export async function cancelOrder(id: number, operatorId: number) {
  return prisma.$transaction(async (tx) => {
    const batch = await tx.batch.findUnique({ where: { id } });
    if (!batch) throw new Error("生产任务不存在");
    if (!(["pending_card", "pending"] as string[]).includes(batch.status)) {
      throw new Error("只有待制卡或待投产任务可以取消订单");
    }
    if (batch.pausedAt) {
      // 取消暂停中的订单时，同步闭合暂停记录，保留完整历史。
      await tx.batchPauseRecord.updateMany({
        where: { batchId: id, endedAt: null },
        data: { endedAt: new Date(), endedBy: operatorId },
      });
    }
    return tx.batch.update({
      where: { id },
      data: {
        status: "cancelled",
        cancelledBy: operatorId,
        cancelledAt: new Date(),
        pausedAt: null,
        pauseReason: null,
        pausedBy: null,
      },
      include: { product: true },
    });
  });
}

export async function pauseBatch(id: number, reason: string, operatorId: number) {
  const normalizedReason = reason.trim();
  return prisma.$transaction(async (tx) => {
    const batch = await tx.batch.findUnique({ where: { id } });
    if (!batch) throw new Error("生产任务不存在");
    if (!(PAUSABLE_STATUSES as readonly string[]).includes(batch.status)) {
      throw new Error("只有待制卡、待投产或加工中的任务可以暂停");
    }
    if (batch.pausedAt) throw new Error("该任务已在暂停中");
    const now = new Date();
    await tx.batchPauseRecord.create({
      data: { batchId: id, reason: normalizedReason, startedBy: operatorId, startedAt: now },
    });
    return tx.batch.update({
      where: { id },
      data: { pausedAt: now, pauseReason: normalizedReason, pausedBy: operatorId },
      include: { product: true },
    });
  });
}

export async function resumeBatch(id: number, operatorId: number) {
  return prisma.$transaction(async (tx) => {
    const batch = await tx.batch.findUnique({ where: { id } });
    if (!batch) throw new Error("生产任务不存在");
    if (!batch.pausedAt) throw new Error("该任务不在暂停中");
    const now = new Date();
    await tx.batchPauseRecord.updateMany({
      where: { batchId: id, endedAt: null },
      data: { endedAt: now, endedBy: operatorId },
    });
    return tx.batch.update({
      where: { id },
      data: { pausedAt: null, pauseReason: null, pausedBy: null },
      include: { product: true },
    });
  });
}

export async function updateBatch(id: number, data: {
  status?: string;
  priority?: string;
  batchNo?: string;
  productModel?: string;
  quantity?: number;
  customerCode?: string;
  orderNo?: string;
  packageType?: string;
  customerDelivery?: string | null;
  productionDelivery?: string | null;
  notes?: string;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({ where: { id }, include: { product: true } });
      if (!batch) throw new Error("生产任务不存在");
      if (batch.status === "cancelled") throw new Error("已取消的生产任务不可编辑");

      const updateData: Prisma.BatchUpdateInput = {
        priority: data.priority,
        customerDelivery: data.customerDelivery !== undefined
          ? (data.customerDelivery ? new Date(data.customerDelivery) : null)
          : undefined,
        productionDelivery: data.productionDelivery !== undefined
          ? (data.productionDelivery ? new Date(data.productionDelivery) : null)
          : undefined,
        notes: data.notes !== undefined ? data.notes.trim() || null : undefined,
      };

      const finalCustomerCode = data.customerCode?.trim() ?? batch.customerCode;
      const finalOrderNo = data.orderNo?.trim() ?? batch.orderNo;
      const finalPackageType = data.packageType?.trim() ?? batch.packageType;

      if (data.customerCode !== undefined) {
        await validateCustomerCode(tx, finalCustomerCode || undefined);
        updateData.customerCode = finalCustomerCode;
      }
      if (data.packageType !== undefined) {
        await validatePackageType(tx, finalPackageType || undefined);
        updateData.packageType = finalPackageType;
      }
      if (data.orderNo !== undefined) updateData.orderNo = finalOrderNo;
      if ((data.customerCode !== undefined || data.orderNo !== undefined) && finalCustomerCode && finalOrderNo) {
        await assertOrderUnique(tx, finalCustomerCode, finalOrderNo, id);
        updateData.orderIdentity = buildOrderIdentity(finalCustomerCode, finalOrderNo);
      }
      if (data.quantity !== undefined) updateData.quantity = data.quantity;

      let finalProductId = batch.productId;
      let finalProductModel = batch.product?.model || "";
      if (data.productModel !== undefined) {
        const product = await findOrCreateProduct(tx, data.productModel);
        finalProductId = product.id;
        finalProductModel = product.model;
        updateData.product = { connect: { id: product.id } };
        updateData.productModelNormalized = normalizeText(product.model);
      }

      const finalBatchNo = data.batchNo !== undefined ? data.batchNo.trim() : batch.batchNo;
      if (data.batchNo !== undefined) {
        if (batch.status === "pending_card") throw new Error("请通过确认制卡填写生产批号");
        const newBatchNo = data.batchNo.trim();
        updateData.batchNo = newBatchNo;
        updateData.batchNoNormalized = normalizeText(newBatchNo);
        updateData.productModelNormalized = normalizeText(finalProductModel);
      }
      if ((data.batchNo !== undefined || data.productModel !== undefined) && finalBatchNo && finalProductId) {
        await assertBatchIdentityUnique(tx, finalBatchNo, finalProductModel, id);
        updateData.batchNoNormalized = normalizeText(finalBatchNo);
        updateData.productModelNormalized = normalizeText(finalProductModel);
      }

      if (data.status !== undefined) {
        if (data.status === "archived" && batch.status === "completed") {
          updateData.status = "archived";
        } else if (data.status !== batch.status) {
          throw new Error("生产任务状态变更请通过对应操作完成");
        }
      }

      return tx.batch.update({
        where: { id },
        data: updateData,
        include: { product: true },
      });
    });
  } catch (error) {
    const message = data.batchNo !== undefined || data.productModel !== undefined
      ? "生产批号与产品型号组合已存在，不可重复"
      : "该客户下已存在相同订单编号";
    translateUniqueError(error, message);
  }
}

export async function getProductSuggestions(keyword: string) {
  const normalized = normalizeText(keyword);
  if (normalized.length < 2) return [];
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, model: true },
  });
  const uniqueProducts = [...new Map(
    products.map((product) => [normalizeText(product.model), product]),
  ).values()];
  return uniqueProducts
    .filter((product) => normalizeText(product.model).includes(normalized))
    .sort((a, b) => {
      const aPrefix = normalizeText(a.model).startsWith(normalized) ? 0 : 1;
      const bPrefix = normalizeText(b.model).startsWith(normalized) ? 0 : 1;
      return aPrefix - bPrefix || a.model.localeCompare(b.model);
    })
    .slice(0, 6);
}
