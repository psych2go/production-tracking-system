import { prisma } from "../config/database.js";

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
  const { status, productId, keyword, customerCode, packageType, batchType, page = 1, pageSize = 20 } = filters;

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
  packageType?: string;
  customerCode?: string;
  orderNo?: string;
  expectedDelivery?: string;
  priority?: string;
  trialContent?: string;
  notes?: string;
  createdBy?: number;
}) {
  return prisma.$transaction(async (tx) => {
    if (data.batchType === "trial") {
      // Trial batch: auto-generate batchNo, no product, quantity=0
      const batchNo = await generateTrialBatchNo(tx);

      return tx.batch.create({
        data: {
          batchNo,
          batchType: "trial",
          quantity: 0,
          packageType: data.packageType,
          expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : undefined,
          trialContent: data.trialContent,
          notes: data.notes,
          createdBy: data.createdBy,
        },
      });
    }

    // Product batch: existing logic
    const product = await tx.product.upsert({
      where: { model: data.productModel! },
      update: {},
      create: { model: data.productModel! },
    });

    return tx.batch.create({
      data: {
        batchNo: data.batchNo!,
        batchType: "product",
        productId: product.id,
        quantity: data.quantity!,
        packageType: data.packageType,
        customerCode: data.customerCode,
        orderNo: data.orderNo,
        expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : undefined,
        priority: data.priority,
        notes: data.notes,
        createdBy: data.createdBy,
      },
    });
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateTrialBatchNo(tx: any): Promise<string> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const prefix = `S${dateStr}-`;

  const lastBatch = await tx.batch.findFirst({
    where: { batchNo: { startsWith: prefix } },
    orderBy: { batchNo: "desc" },
    select: { batchNo: true },
  });

  let seq = 1;
  if (lastBatch) {
    const lastSeq = parseInt(lastBatch.batchNo.split("-").pop() || "0", 10);
    seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(3, "0")}`;
}

export async function updateBatch(id: number, data: {
  status?: string;
  priority?: string;
  customerCode?: string | null;
  orderNo?: string | null;
  packageType?: string | null;
  expectedDelivery?: string | null;
  notes?: string;
}) {
  return prisma.batch.update({
    where: { id },
    data: {
      status: data.status,
      priority: data.priority,
      customerCode: data.customerCode,
      orderNo: data.orderNo,
      packageType: data.packageType,
      expectedDelivery: data.expectedDelivery !== undefined
        ? (data.expectedDelivery ? new Date(data.expectedDelivery) : null)
        : undefined,
      notes: data.notes,
    },
  });
}
