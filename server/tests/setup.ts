import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// ─── Set env BEFORE any module imports ───
const TEST_DB_PATH = path.join(__dirname, "test.db");
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

process.env.DATABASE_URL = TEST_DB_URL;
process.env.NODE_ENV = "development"; // Keep "development" so dev-login works
process.env.JWT_SECRET = "test-secret";
process.env.WW_CORP_ID = "";
process.env.WW_CORP_SECRET = "";

// Create fresh test DB
if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

execSync("npx prisma migrate deploy", {
  env: { ...process.env, DATABASE_URL: TEST_DB_URL },
  stdio: "pipe",
  cwd: path.join(__dirname, ".."),
});

// Now import — app's PrismaClient singleton will use TEST_DB_URL
import { prisma } from "../src/config/database.js";
import { app } from "../src/app.js";
import { generateToken } from "../src/services/auth.js";

// ─── Seed data ───
let adminToken: string;
let workerToken: string;
let seeded: {
  admin: { id: number; wwUserId: string; name: string; role: string };
  worker: { id: number; wwUserId: string; name: string; role: string };
  stages: { id: number; code: string; name: string; stageOrder: number }[];
  product: { id: number; model: string };
  batch: { id: number; batchNo: string; status: string };
};

async function seedTestData() {
  // Clean all tables (order matters for FK)
  await prisma.auditLog.deleteMany();
  await prisma.progressRecord.deleteMany();
  await prisma.scheduleOrder.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.packageType.deleteMany();
  await prisma.product.deleteMany();
  await prisma.processStage.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const admin = await prisma.user.create({
    data: { wwUserId: "test_admin", name: "测试管理员", role: "admin", department: "管理部" },
  });
  const worker = await prisma.user.create({
    data: { wwUserId: "test_worker", name: "测试作业员", role: "worker", department: "生产部" },
  });

  // Create process stages
  const stages: typeof seeded["stages"] = [];
  const stageDefs = [
    { code: "incoming", name: "来料检验", stageOrder: 1, isQcStage: true },
    { code: "die_attach", name: "粘片", stageOrder: 2 },
    { code: "wire_bonding", name: "压焊", stageOrder: 3 },
    { code: "packaging", name: "包装", stageOrder: 4 },
  ];
  for (const s of stageDefs) {
    stages.push(await prisma.processStage.create({ data: s }));
  }

  // Create package types
  await prisma.packageType.createMany({
    data: [
      { name: "SOP8L", category: "SOP", sortOrder: 1 },
      { name: "DIP16L", category: "DIP", sortOrder: 2 },
    ],
  });

  // Create product
  const product = await prisma.product.create({ data: { model: "GD32F303" } });

  // Create a batch
  const batch = await prisma.batch.create({
    data: {
      batchNo: "BTEST-001",
      productId: product.id,
      quantity: 100,
      status: "active",
      priority: "normal",
      packageType: "SOP8L",
      customerCode: "CUST001",
      createdBy: admin.id,
    },
  });

  adminToken = generateToken({
    id: admin.id, wwUserId: admin.wwUserId, name: admin.name, role: admin.role,
  });
  workerToken = generateToken({
    id: worker.id, wwUserId: worker.wwUserId, name: worker.name, role: worker.role,
  });

  seeded = { admin, worker, stages, product, batch };
}

beforeAll(async () => {
  await seedTestData();
}, 15000);

afterAll(async () => {
  await prisma.$disconnect();
});

process.on("exit", () => {
  if (fs.existsSync(TEST_DB_PATH)) {
    try { fs.unlinkSync(TEST_DB_PATH); } catch {}
  }
});

export { app, prisma, adminToken, workerToken, seeded };
