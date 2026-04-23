import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STAGES = [
  { code: "incoming_inspection", name: "来料检验", stageOrder: 1, isQcStage: true, description: "原材料入库检验" },
  { code: "slide_inspection", name: "减划", stageOrder: 2, isQcStage: false, description: "减薄划片" },
  { code: "in_process_inspection", name: "镜检", stageOrder: 3, isQcStage: true, description: "显微镜检验" },
  { code: "die_bonding_prep", name: "粘片库", stageOrder: 4, isQcStage: false, description: "粘片备料" },
  { code: "die_attach", name: "粘片", stageOrder: 5, isQcStage: false, description: "芯片粘接" },
  { code: "wire_bonding", name: "压焊", stageOrder: 6, isQcStage: false, description: "引线键合" },
  { code: "molding", name: "塑封", stageOrder: 7, isQcStage: false, description: "塑封封装" },
  { code: "ultrasound_scan", name: "超扫", stageOrder: 8, isQcStage: true, description: "超声波扫描检测" },
  { code: "deflashing", name: "去溢料", stageOrder: 9, isQcStage: false, description: "去除溢料" },
  { code: "lead_cutting", name: "切筋", stageOrder: 10, isQcStage: false, description: "切筋成型" },
  { code: "plating", name: "电镀", stageOrder: 11, isQcStage: false, description: "电镀处理" },
  { code: "marking", name: "打印", stageOrder: 12, isQcStage: false, description: "激光打标/打印" },
  { code: "trimming", name: "成型", stageOrder: 13, isQcStage: false, description: "冲切成型" },
  { code: "visual_inspection", name: "外观检验", stageOrder: 14, isQcStage: true, description: "成品外观质量检验" },
  { code: "packaging", name: "包装", stageOrder: 15, isQcStage: false, description: "成品包装" },
  { code: "completed", name: "已完成", stageOrder: 16, isQcStage: false, description: "生产完成" },
];

const PACKAGE_TYPES = [
  // DIP 系列
  { name: "DIP8L",  category: "DIP",  sortOrder: 1 },
  { name: "DIP14L", category: "DIP",  sortOrder: 2 },
  { name: "DIP16L", category: "DIP",  sortOrder: 3 },
  { name: "DIP18L", category: "DIP",  sortOrder: 4 },
  // SOP 系列
  { name: "SOP8L",      category: "SOP",  sortOrder: 10 },
  { name: "SOP14L",     category: "SOP",  sortOrder: 11 },
  { name: "SOP16L",     category: "SOP",  sortOrder: 12 },
  { name: "SOP16L (W)", category: "SOP",  sortOrder: 13 },
  { name: "SOP20L",     category: "SOP",  sortOrder: 14 },
  { name: "SOP24L",     category: "SOP",  sortOrder: 15 },
  { name: "SOP28L",     category: "SOP",  sortOrder: 16 },
  // SSOP 系列
  { name: "SSOP20L (0.65)",  category: "SSOP", sortOrder: 20 },
  { name: "SSOP24L (0.635)", category: "SSOP", sortOrder: 21 },
  { name: "SSOP24L (0.65)",  category: "SSOP", sortOrder: 22 },
  // MSOP 系列
  { name: "MSOP12L", category: "MSOP", sortOrder: 25 },
  // LQFP 系列
  { name: "LQFP32L",        category: "LQFP", sortOrder: 30 },
  { name: "LQFP44L",        category: "LQFP", sortOrder: 31 },
  { name: "LQFP48L",        category: "LQFP", sortOrder: 32 },
  { name: "LQFP64L (10×10)", category: "LQFP", sortOrder: 33 },
  { name: "LQFP64L (7×7)",   category: "LQFP", sortOrder: 34 },
  { name: "LQFP100L",       category: "LQFP", sortOrder: 35 },
  { name: "LQFP128L",       category: "LQFP", sortOrder: 36 },
  // QFN 系列
  { name: "QFN64L", category: "QFN", sortOrder: 40 },
  // DFN 系列
  { name: "DFN12L", category: "DFN", sortOrder: 45 },
  // 其它
  { name: "PowerSO20", category: "其它", sortOrder: 50 },
];

async function main() {
  console.log("Seeding process stages...");

  // Delete existing stages first to avoid stageOrder unique conflicts on re-order
  await prisma.progressRecord.deleteMany();
  await prisma.scheduleOrder.deleteMany();
  await prisma.processStage.deleteMany();

  for (const stage of STAGES) {
    await prisma.processStage.upsert({
      where: { code: stage.code },
      update: stage,
      create: stage,
    });
  }

  console.log(`Seeded ${STAGES.length} process stages.`);

  // Seed package types
  console.log("Seeding package types...");

  for (const pt of PACKAGE_TYPES) {
    await prisma.packageType.upsert({
      where: { name: pt.name },
      update: pt,
      create: pt,
    });
  }

  console.log(`Seeded ${PACKAGE_TYPES.length} package types.`);

  // Create a default admin user for development
  const admin = await prisma.user.upsert({
    where: { wwUserId: "dev_admin" },
    update: {
      name: "冯部长",
      department: "研发部",
    },
    create: {
      wwUserId: "dev_admin",
      name: "冯部长",
      role: "admin",
      department: "研发部",
    },
  });

  console.log(`Created dev admin user: ${admin.name}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
