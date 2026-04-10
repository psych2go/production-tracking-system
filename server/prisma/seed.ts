import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STAGES = [
  { code: "incoming_inspection", name: "来料检验", stageOrder: 1, isQcStage: true, description: "原材料入库检验" },
  { code: "slide_inspection", name: "检滑", stageOrder: 2, isQcStage: true, description: "滑动检验" },
  { code: "in_process_inspection", name: "进检", stageOrder: 3, isQcStage: true, description: "过程检验" },
  { code: "die_attach", name: "粘片", stageOrder: 4, isQcStage: false, description: "芯片粘接" },
  { code: "wire_bonding", name: "压焊", stageOrder: 5, isQcStage: false, description: "引线键合" },
  { code: "molding", name: "塑封", stageOrder: 6, isQcStage: false, description: "塑封封装" },
  { code: "ultrasound_scan", name: "超扫", stageOrder: 7, isQcStage: true, description: "超声波扫描检测" },
  { code: "deflashing", name: "去溢料", stageOrder: 8, isQcStage: false, description: "去除溢料" },
  { code: "plating", name: "电镀", stageOrder: 9, isQcStage: false, description: "电镀处理" },
  { code: "marking", name: "打印", stageOrder: 10, isQcStage: false, description: "激光打标/打印" },
  { code: "trimming", name: "冲切", stageOrder: 11, isQcStage: false, description: "冲切成型" },
  { code: "packaging", name: "包装", stageOrder: 12, isQcStage: false, description: "成品包装" },
];

async function main() {
  console.log("Seeding process stages...");

  for (const stage of STAGES) {
    await prisma.processStage.upsert({
      where: { code: stage.code },
      update: stage,
      create: stage,
    });
  }

  console.log(`Seeded ${STAGES.length} process stages.`);

  // Create a default admin user for development
  const admin = await prisma.user.upsert({
    where: { wwUserId: "dev_admin" },
    update: {},
    create: {
      wwUserId: "dev_admin",
      name: "开发管理员",
      role: "admin",
      department: "开发部",
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
