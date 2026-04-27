import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 模拟工人
const WORKERS = [
  { wwUserId: "worker_zhangsan", name: "张三", department: "减划车间", role: "worker" },
  { wwUserId: "worker_lisi", name: "李四", department: "粘片车间", role: "worker" },
  { wwUserId: "worker_wangwu", name: "王五", department: "压焊车间", role: "worker" },
  { wwUserId: "worker_zhaoliu", name: "赵六", department: "塑封车间", role: "worker" },
  { wwUserId: "worker_sunqi", name: "孙七", department: "质检组", role: "worker" },
  { wwUserId: "worker_chen", name: "陈师傅", department: "生产部", role: "worker" },
];

// 模拟产品
const PRODUCTS = [
  { model: "GD32F303", name: "GD32F303 微控制器" },
  { model: "GD32E230", name: "GD32E230 微控制器" },
  { model: "GD32VF103", name: "GD32VF103 RISC-V" },
  { model: "GD32L233", name: "GD32L233 低功耗MCU" },
  { model: "GD32H737", name: "GD32H737 高性能MCU" },
];

// 每道工序的典型耗时范围（分钟），用于生成随机 startedAt/completedAt 间隔
const STAGE_DURATIONS: Record<string, [number, number]> = {
  incoming_inspection: [30, 90],   // 来料检验 0.5~1.5h
  slide_inspection:    [120, 360],  // 减划 2~6h
  in_process_inspection: [40, 120], // 镜检 40min~2h
  die_bonding_prep:    [20, 60],    // 粘片库 20~60min
  die_attach:          [60, 180],   // 粘片 1~3h
  wire_bonding:        [90, 240],   // 压焊 1.5~4h
  molding:             [120, 300],  // 塑封 2~5h
  ultrasound_scan:     [30, 60],    // 超扫 30min~1h
  deflashing:          [30, 60],    // 去溢料
  lead_cutting:        [30, 60],    // 切筋
  plating:             [180, 480],  // 电镀 3~8h（最耗时）
  marking:             [30, 90],    // 打印
  trimming:            [30, 60],    // 冲切
  visual_inspection:   [20, 60],    // 外观检验
  packaging:           [30, 90],    // 包装
};

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 生成一个批次的完整进度记录
 * @param batchId 批次 ID
 * @param operatorIds 操作人 ID 列表
 * @param stageIds 工序 ID 列表（按顺序）
 * @param stageCodes 工序编码列表（按顺序）
 * @param baseDate 基准日期（创建时间）
 * @param completedStages 完成几道工序（0 = 未开始, -1 = 全部完成）
 * @param quantity 加工数量
 */
function generateProgressRecords(
  batchId: number,
  operatorIds: number[],
  stageIds: number[],
  stageCodes: string[],
  baseDate: Date,
  completedStages: number,
  quantity: number,
) {
  const records: Array<{
    batchId: number;
    stageId: number;
    operatorId: number;
    inputQuantity: number;
    outputQuantity: number;
    defectQuantity: number;
    status: string;
    createdAt: Date;
  }> = [];

  // 按顺序记录，每道工序间隔一些时间
  let currentDate = new Date(baseDate);
  const stagesToDo = completedStages === -1 ? stageIds.length : completedStages;

  for (let i = 0; i < stagesToDo && i < stageIds.length; i++) {
    const code = stageCodes[i];
    const [minDur, maxDur] = STAGE_DURATIONS[code] || [30, 120];
    const duration = rand(minDur, maxDur);

    // 工序之间可能间隔 0~12 小时
    if (i > 0) {
      currentDate = new Date(currentDate.getTime() + rand(0, 12) * 60 * 60 * 1000);
    }

    const startedAt = new Date(currentDate);
    const completedAt = new Date(startedAt.getTime() + duration * 60 * 1000);

    // 良率：质检工序可能有更多不良品
    const defectRate = ["incoming_inspection", "in_process_inspection", "ultrasound_scan", "visual_inspection"].includes(code)
      ? rand(1, 5) / 100
      : rand(0, 2) / 100;
    const defectQty = Math.round(quantity * defectRate);
    const outputQty = quantity - defectQty;

    records.push({
      batchId,
      stageId: stageIds[i],
      operatorId: randomPick(operatorIds),
      inputQuantity: quantity,
      outputQuantity: outputQty,
      defectQuantity: defectQty,
      status: "completed",
      createdAt: startedAt,
    });

    // 下一道工序的输入 = 上道的输出
    quantity = outputQty;
    currentDate = completedAt;
  }

  return records;
}

async function insertRecords(records: Array<{
  batchId: number;
  stageId: number;
  operatorId: number;
  inputQuantity: number;
  outputQuantity: number;
  defectQuantity: number;
  status: string;
  createdAt: Date;
}>) {
  if (records.length > 0) {
    await prisma.progressRecord.createMany({ data: records });
  }
  return records.length;
}

async function main() {
  console.log("=== 开始生成演示数据 ===\n");

  // 1. 创建工人
  const workerIds: number[] = [];
  for (const w of WORKERS) {
    const user = await prisma.user.upsert({
      where: { wwUserId: w.wwUserId },
      update: {},
      create: w,
    });
    workerIds.push(user.id);
  }
  console.log(`创建 ${WORKERS.length} 个工人`);

  // 也拿到 dev_admin 的 ID
  const admin = await prisma.user.findUniqueOrThrow({ where: { wwUserId: "dev_admin" } });
  const allOperatorIds = [...workerIds, admin.id];

  // 2. 创建产品
  const productIds: number[] = [];
  for (const p of PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { model: p.model },
      update: {},
      create: p,
    });
    productIds.push(product.id);
  }
  console.log(`创建 ${PRODUCTS.length} 个产品`);

  // 3. 获取工序列表（按 stageOrder 排序）
  const stages = await prisma.processStage.findMany({
    where: { code: { not: "completed" } },
    orderBy: { stageOrder: "asc" },
  });
  const stageIds = stages.map((s) => s.id);
  const stageCodes = stages.map((s) => s.code);
  console.log(`获取 ${stages.length} 道工序`);

  const packageTypes = ["SOP16L", "SOP28L", "LQFP48L", "LQFP64L (10×10)", "DIP16L", "SSOP24L (0.65)"];
  const customerCodes = ["HW", "ZTE", "MI", "DJ", "LE"];

  // 4. 清除旧的演示数据（只删演示批次和进度记录）
  console.log("\n清除旧的演示批次和进度记录...");
  // 找出以 B202604 或 S202604 开头的批次
  const demoBatches = await prisma.batch.findMany({
    where: {
      OR: [
        { batchNo: { startsWith: "B202604" } },
        { batchNo: { startsWith: "B202604D" } },
        { batchNo: { startsWith: "S202604" } },
      ],
    },
    select: { id: true },
  });
  const demoBatchIds = demoBatches.map((b) => b.id);
  if (demoBatchIds.length > 0) {
    await prisma.progressRecord.deleteMany({ where: { batchId: { in: demoBatchIds } } });
    await prisma.batch.deleteMany({ where: { id: { in: demoBatchIds } } });
    console.log(`清除 ${demoBatchIds.length} 个旧演示批次`);
  }

  // ================================================================
  // 场景设计：
  //
  // 【耗时统计】需要多批次、多工序的 createdAt 数据
  //   → 创建 15+ 个已完成批次（全部13道工序走完）
  //   → 时间分布在最近 30 天内，每道工序有多个样本
  //
  // 【产量趋势】需要多天的产出数据
  //   → 批次创建日期分散在不同天
  //   → outputQuantity 随工序递减（模拟损耗）
  //
  // 【预警】需要超过 7 天没有进度更新的 active 批次
  //   → 创建 3 个 active 批次，只完成前几道工序，创建于 10~15 天前
  // ================================================================

  const now = new Date();
  let batchCount = 0;
  let recordCount = 0;

  // ---- 场景 A: 已完成批次（分布在过去 30 天） ----
  console.log("\n--- 生成已完成批次 ---");

  const completedBatchConfigs: Array<{
    daysAgo: number;
    productIdx: number;
    quantity: number;
    batchNo: string;
    packageType: string;
    customerCode: string;
    priority: string;
    expectedDelivery: Date;
  }> = [];

  // 过去 30 天，每天 0~2 个批次
  for (let day = 0; day < 30; day++) {
    const count = day < 5 ? rand(1, 2) : rand(0, 2);
    for (let j = 0; j < count; j++) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      date.setHours(rand(8, 16), rand(0, 59), 0, 0);

      completedBatchConfigs.push({
        daysAgo: day,
        productIdx: rand(0, PRODUCTS.length - 1),
        quantity: randomPick([5000, 8000, 10000, 12000, 15000, 20000, 25000, 30000]),
        batchNo: `B202604${String(130 - day * 4 - j).padStart(3, "0")}`,
        packageType: randomPick(packageTypes),
        customerCode: randomPick(customerCodes),
        priority: Math.random() < 0.2 ? "urgent" : "normal",
        expectedDelivery: date,
      });
    }
  }

  for (const cfg of completedBatchConfigs) {
    const batch = await prisma.batch.create({
      data: {
        batchNo: cfg.batchNo,
        batchType: "product",
        productId: productIds[cfg.productIdx],
        quantity: cfg.quantity,
        status: "completed",
        priority: cfg.priority,
        packageType: cfg.packageType,
        customerCode: cfg.customerCode,
        customerDelivery: cfg.expectedDelivery,
        createdBy: admin.id,
        createdAt: cfg.expectedDelivery,
      },
    });

    const records = generateProgressRecords(
      batch.id, allOperatorIds, stageIds, stageCodes,
      cfg.expectedDelivery, -1, cfg.quantity,
    );

    const count = await insertRecords(records);

    batchCount++;
    recordCount += count;
  }
  console.log(`创建 ${completedBatchConfigs.length} 个已完成批次，共 ${recordCount} 条进度记录`);

  // ---- 场景 B: 正在加工的批次（最近几天，部分完成） ----
  console.log("\n--- 生成正在加工的批次 ---");
  let activeRecordCount = 0;

  const activeBatchConfigs = [
    { daysAgo: 2, productIdx: 0, quantity: 20000, completedStages: 8, batchNo: "B202604131", packageType: "SOP28L", customerCode: "HW" },
    { daysAgo: 3, productIdx: 2, quantity: 15000, completedStages: 5, batchNo: "B202604132", packageType: "LQFP48L", customerCode: "ZTE" },
    { daysAgo: 1, productIdx: 4, quantity: 10000, completedStages: 3, batchNo: "B202604133", packageType: "LQFP64L (10×10)", customerCode: "DJ" },
    { daysAgo: 4, productIdx: 1, quantity: 8000, completedStages: 10, batchNo: "B202604134", packageType: "SOP16L", customerCode: "MI" },
    { daysAgo: 0, productIdx: 3, quantity: 12000, completedStages: 1, batchNo: "B202604135", packageType: "DIP16L", customerCode: "LE" },
  ];

  for (const cfg of activeBatchConfigs) {
    const baseDate = new Date(now);
    baseDate.setDate(baseDate.getDate() - cfg.daysAgo);
    baseDate.setHours(8, 0, 0, 0);

    const batch = await prisma.batch.create({
      data: {
        batchNo: cfg.batchNo,
        batchType: "product",
        productId: productIds[cfg.productIdx],
        quantity: cfg.quantity,
        status: "active",
        priority: cfg.daysAgo >= 3 ? "urgent" : "normal",
        packageType: cfg.packageType,
        customerCode: cfg.customerCode,
        createdBy: admin.id,
        createdAt: baseDate,
      },
    });

    const records = generateProgressRecords(
      batch.id, allOperatorIds, stageIds, stageCodes,
      baseDate, cfg.completedStages, cfg.quantity,
    );

    await insertRecords(records);

    batchCount++;
    activeRecordCount += records.length;
  }
  console.log(`创建 ${activeBatchConfigs.length} 个正在加工批次，共 ${activeRecordCount} 条进度记录`);

  // ---- 场景 C: 延迟预警批次（超过 7 天无更新） ----
  console.log("\n--- 生成延迟预警批次 ---");
  let delayRecordCount = 0;

  const delayedBatchConfigs = [
    { daysAgo: 8, productIdx: 0, quantity: 10000, completedStages: 4, batchNo: "B202604D01", packageType: "SOP28L", customerCode: "HW", desc: "等待来料补充" },
    { daysAgo: 6, productIdx: 3, quantity: 5000, completedStages: 7, batchNo: "B202604D02", packageType: "LQFP48L", customerCode: "ZTE", desc: "超扫设备检修中" },
    { daysAgo: 5, productIdx: 2, quantity: 8000, completedStages: 2, batchNo: "B202604D03", packageType: "SSOP24L (0.65)", customerCode: "DJ", desc: "镜检不合格待返工" },
  ];

  for (const cfg of delayedBatchConfigs) {
    const baseDate = new Date(now);
    baseDate.setDate(baseDate.getDate() - cfg.daysAgo);
    baseDate.setHours(8, 0, 0, 0);

    const batch = await prisma.batch.create({
      data: {
        batchNo: cfg.batchNo,
        batchType: "product",
        productId: productIds[cfg.productIdx],
        quantity: cfg.quantity,
        status: "active",
        priority: "urgent",
        packageType: cfg.packageType,
        customerCode: cfg.customerCode,
        notes: cfg.desc,
        createdBy: admin.id,
        createdAt: baseDate,
      },
    });

    const records = generateProgressRecords(
      batch.id, allOperatorIds, stageIds, stageCodes,
      baseDate, cfg.completedStages, cfg.quantity,
    );

    await insertRecords(records);

    batchCount++;
    delayRecordCount += records.length;
  }
  console.log(`创建 ${delayedBatchConfigs.length} 个延迟预警批次，共 ${delayRecordCount} 条进度记录`);

  // ---- 场景 D: 试验批次 ----
  console.log("\n--- 生成试验批次 ---");

  const trialConfigs = [
    { daysAgo: 5, content: "新型粘片胶水测试", completedStages: 6 },
    { daysAgo: 3, content: "压焊参数优化试验", completedStages: 5 },
    { daysAgo: 8, content: "电镀液配比调整", completedStages: -1 },  // 已完成
    { daysAgo: 1, content: "减划刀片寿命测试", completedStages: 2 },
  ];

  let trialCount = 0;
  for (const cfg of trialConfigs) {
    const baseDate = new Date(now);
    baseDate.setDate(baseDate.getDate() - cfg.daysAgo);
    baseDate.setHours(rand(8, 14), 0, 0, 0);

    const dateStr = baseDate.toISOString().slice(0, 10).replace(/-/g, "").slice(0, 8);
    const seq = String(trialCount + 1).padStart(3, "0");

    const batch = await prisma.batch.create({
      data: {
        batchNo: `S${dateStr}-${seq}`,
        batchType: "trial",
        quantity: 0,
        status: cfg.completedStages === -1 ? "completed" : "active",
        trialContent: cfg.content,
        packageType: trialCount % 2 === 0 ? "SOP16L" : undefined,
        createdBy: admin.id,
        createdAt: baseDate,
      },
    });

    if (cfg.completedStages > 0) {
      const records = generateProgressRecords(
        batch.id, allOperatorIds, stageIds, stageCodes,
        baseDate, cfg.completedStages, 100, // 试验批次数量少
      );
      const count = await insertRecords(records);
      recordCount += count;
    }

    trialCount++;
  }
  console.log(`创建 ${trialCount} 个试验批次`);

  console.log(`\n=== 演示数据生成完毕 ===`);
  console.log(`总批次: ${batchCount + trialCount}`);
  console.log(`总进度记录: ~${recordCount + activeRecordCount + delayRecordCount}`);

  // 验证预警逻辑
  const anomalyCheck = await prisma.batch.findMany({
    where: { status: "active" },
    include: { progressRecords: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
  const delayed = anomalyCheck.filter(
    (b) => b.progressRecords[0] && Date.now() - new Date(b.progressRecords[0].createdAt).getTime() > fiveDaysMs,
  );
  console.log(`\n验证: 当前活跃批次 ${anomalyCheck.length} 个，其中延迟预警 ${delayed.length} 个`);
  for (const b of delayed) {
    const lastUpdate = b.progressRecords[0]?.createdAt;
    const daysSince = Math.round((Date.now() - new Date(lastUpdate!).getTime()) / (24 * 60 * 60 * 1000));
    console.log(`  ⚠ ${b.batchNo} - ${daysSince} 天未更新`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
