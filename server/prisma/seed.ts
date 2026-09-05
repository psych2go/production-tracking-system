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
  // SOT 系列
  { name: "SOT23-3L", category: "SOT", sortOrder: 27 },
  { name: "SOT223-3L", category: "SOT", sortOrder: 28 },
  // QFN 系列
  { name: "QFN64L", category: "QFN", sortOrder: 40 },
  // DFN 系列
  { name: "DFN12L", category: "DFN", sortOrder: 45 },
  // 其它
  { name: "PowerSO20", category: "其它", sortOrder: 50 },
];

const CUSTOMER_CODES = [
  // name/type 源自《高可靠在线产品在线加工统计表》，可在客户代码管理中维护
  { code: "HIC", name: "混合", type: "internal" },
  { code: "SJ", name: "设计", type: "internal" },
  { code: "XIC", name: "新集成", type: "internal" },
  { code: "TZ", name: "特种", type: "internal" },
  { code: "JSC20", name: "成都华微", type: "external" },
  { code: "JSC21", name: "振芯", type: "external" },
  { code: "JSC22", name: null, type: null },
  { code: "JSC23", name: "蜀郡微", type: "external" },
  { code: "JSC28", name: "环宇芯", type: "external" },
  { code: "JSC29", name: "鸿立芯", type: "external" },
  { code: "JSC30", name: null, type: "external" },
  { code: "GS01-J", name: "天光", type: "external" },
  { code: "LN02-J", name: "锦州777", type: "external" },
  { code: "ZD47", name: "47所", type: "external" },
  { code: "ZD58", name: "58所", type: "external" },
  { code: "ZK01-J", name: "中科院", type: "external" },
  { code: "ZK02-J", name: null, type: null },
  { code: "ZK03-J", name: "中科院", type: "external" },
  { code: "XA53-J", name: null, type: null },
  { code: "JS10-J", name: "中微爱芯", type: "external" },
  { code: "GZ01-J", name: "振华风光", type: "external" },
  { code: "WH02-J", name: "芯景", type: "external" },
  { code: "SX71-J", name: "矽联", type: "external" },
  { code: "SH21-J", name: "翔腾", type: "external" },
  { code: "SD03-J", name: "中科驭思", type: "external" },
  { code: "AH22-J", name: "华东光电", type: "external" },
  { code: "GD389-J", name: "沈阳自动化", type: "external" },
];

async function main() {
  // === Process Stages: upsert, never delete (preserves foreign keys) ===
  console.log("Seeding process stages...");
  for (const stage of STAGES) {
    await prisma.processStage.upsert({
      where: { code: stage.code },
      update: stage,
      create: stage,
    });
  }
  console.log(`Seeded ${STAGES.length} process stages.`);

  // === Package Types: upsert, never delete ===
  console.log("Seeding package types...");
  for (const pt of PACKAGE_TYPES) {
    await prisma.packageType.upsert({
      where: { name: pt.name },
      update: pt,
      create: pt,
    });
  }
  console.log(`Seeded ${PACKAGE_TYPES.length} package types.`);

  // === Customer Codes: upsert, never delete ===
  console.log("Seeding customer codes...");
  for (const code of CUSTOMER_CODES) {
    await prisma.customerCode.upsert({
      where: { code: code.code },
      update: { name: code.name, type: code.type },
      create: code,
    });
  }
  console.log(`Seeded ${CUSTOMER_CODES.length} customer codes.`);

  // === Dev admin user: upsert ===
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
