import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, adminToken, workerToken, prisma } from "./setup.js";

describe("Batch Routes", () => {
  describe("GET /api/batches", () => {
    it("should return paginated batch list", async () => {
      const res = await request(app)
        .get("/api/batches")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toBeInstanceOf(Array);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.page).toBe(1);
      // 客户信息增强：名称与类型来自客户代码表
      const withCustomer = res.body.items.find((item: { customerCode: string | null }) => item.customerCode === "CUST001");
      if (withCustomer) {
        expect(withCustomer.customerName).toBe("测试客户");
        expect(withCustomer.customerType).toBe("internal");
      }
    });

    it("should filter by status", async () => {
      const res = await request(app)
        .get("/api/batches?status=active")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.every((b: any) => b.status === "active")).toBe(true);
    });

    it("should filter by keyword", async () => {
      const res = await request(app)
        .get("/api/batches?keyword=BTEST")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it("should hide pre-production tasks from workers", async () => {
      const pending = await prisma.batch.create({
        data: {
          orderNo: "19999",
          customerCode: "CUST001",
          productId: (await prisma.product.findFirst())!.id,
          quantity: 10,
          packageType: "SOP8L",
          status: "pending_card",
        },
      });
      const listRes = await request(app)
        .get("/api/batches?status=pending_card")
        .set("Authorization", `Bearer ${workerToken}`);
      const detailRes = await request(app)
        .get(`/api/batches/${pending.id}`)
        .set("Authorization", `Bearer ${workerToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.items).toHaveLength(0);
      expect(detailRes.status).toBe(404);
    });

    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/batches");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/batches/:id", () => {
    it("should return batch detail with progress records", async () => {
      // Get the seeded batch id
      const batch = await prisma.batch.findFirst({ where: { batchNo: "BTEST-001" } });

      const res = await request(app)
        .get(`/api/batches/${batch!.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.batchNo).toBe("BTEST-001");
      expect(res.body.product).toBeDefined();
      expect(res.body.progressRecords).toBeInstanceOf(Array);
    });

    it("should return 404 for non-existent batch", async () => {
      const res = await request(app)
        .get("/api/batches/99999")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe("Production order flow", () => {
    it("should create a pending-card order (admin)", async () => {
      const res = await request(app)
        .post("/api/batches")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          orderNo: "10001",
          customerCode: "CUST001",
          productModel: "STM32F103",
          quantity: 200,
          packageType: "SOP8L",
          priority: "urgent",
        });

      expect(res.status).toBe(201);
      expect(res.body.batchNo).toBeNull();
      expect(res.body.status).toBe("pending_card");
      expect(res.body.quantity).toBe(200);
      expect(res.body.priority).toBe("urgent");
      expect(await prisma.product.findFirst({ where: { model: "STM32F103" } })).toBeDefined();
    });

    it("should reject duplicate customerCode + orderNo", async () => {
      const res = await request(app)
        .post("/api/batches")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          orderNo: "10001",
          customerCode: "CUST001",
          productModel: "GD32F303",
          quantity: 50,
          packageType: "SOP8L",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("已存在订单编号");
    });

    it("should reject missing required fields", async () => {
      const res = await request(app)
        .post("/api/batches")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ orderNo: "10002" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("参数验证失败");
    });

    it("should reject worker creating an order", async () => {
      const res = await request(app)
        .post("/api/batches")
        .set("Authorization", `Bearer ${workerToken}`)
        .send({
          orderNo: "10003",
          customerCode: "CUST001",
          productModel: "GD32F303",
          quantity: 10,
          packageType: "SOP8L",
        });

      expect(res.status).toBe(403);
    });

    it("should confirm card and start production", async () => {
      const order = await prisma.batch.create({
        data: {
          orderNo: "10004",
          customerCode: "CUST001",
          productId: (await prisma.product.findFirst())!.id,
          quantity: 80,
          packageType: "SOP8L",
          status: "pending_card",
        },
      });

      const cardRes = await request(app)
        .post(`/api/batches/${order.id}/confirm-card`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ batchNo: "2638-A" });
      expect(cardRes.status).toBe(200);
      expect(cardRes.body.status).toBe("pending");
      expect(cardRes.body.batchNo).toBe("2638-A");

      const startRes = await request(app)
        .post(`/api/batches/${order.id}/start-production`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(startRes.status).toBe(200);
      expect(startRes.body.status).toBe("active");
      expect(startRes.body.startedAt).toBeTruthy();
    });

    it("should treat batch number identity as case-insensitive", async () => {
      const order = await prisma.batch.create({
        data: {
          orderNo: "10005",
          customerCode: "CUST001",
          productId: (await prisma.product.findFirst())!.id,
          quantity: 80,
          packageType: "SOP8L",
          status: "pending_card",
        },
      });
      const res = await request(app)
        .post(`/api/batches/${order.id}/confirm-card`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ batchNo: "2638-a" });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("组合已存在");
    });

    it("should enforce customer order identity at database level", async () => {
      const product = await prisma.product.findFirstOrThrow();
      const orderIdentity = "CUST001\u000020001";
      await prisma.batch.create({
        data: {
          orderNo: "20001",
          orderIdentity,
          customerCode: "CUST001",
          productId: product.id,
          quantity: 1,
          status: "pending_card",
        },
      });
      await expect(prisma.batch.create({
        data: {
          orderNo: "20001",
          orderIdentity,
          customerCode: "CUST001",
          productId: product.id,
          quantity: 1,
          status: "pending_card",
        },
      })).rejects.toMatchObject({ code: "P2002" });
    });

    it("should enforce normalized production identity at database level", async () => {
      const product = await prisma.product.findFirstOrThrow({ where: { model: "GD32F303" } });
      await prisma.batch.create({
        data: {
          batchNo: "DB-CASE-A",
          batchNoNormalized: "db-case-a",
          productModelNormalized: "gd32f303",
          productId: product.id,
          quantity: 1,
          status: "active",
        },
      });
      await expect(prisma.batch.create({
        data: {
          batchNo: "db-case-a",
          batchNoNormalized: "db-case-a",
          productModelNormalized: "gd32f303",
          productId: product.id,
          quantity: 1,
          status: "active",
        },
      })).rejects.toMatchObject({ code: "P2002" });
    });

    it("should reject worker lifecycle mutations", async () => {
      const order = await prisma.batch.create({
        data: {
          orderNo: "10007",
          customerCode: "CUST001",
          productId: (await prisma.product.findFirst())!.id,
          quantity: 20,
          packageType: "DIP16L",
          status: "pending_card",
        },
      });
      const confirmRes = await request(app)
        .post(`/api/batches/${order.id}/confirm-card`)
        .set("Authorization", `Bearer ${workerToken}`)
        .send({ batchNo: "WORKER-DENIED" });
      const startRes = await request(app)
        .post(`/api/batches/${order.id}/start-production`)
        .set("Authorization", `Bearer ${workerToken}`);
      const cancelRes = await request(app)
        .post(`/api/batches/${order.id}/cancel`)
        .set("Authorization", `Bearer ${workerToken}`);
      expect(confirmRes.status).toBe(403);
      expect(startRes.status).toBe(403);
      expect(cancelRes.status).toBe(403);
    });

    it("should cancel only pre-production orders", async () => {
      const order = await prisma.batch.create({
        data: {
          orderNo: "10006",
          customerCode: "CUST001",
          productId: (await prisma.product.findFirst())!.id,
          quantity: 20,
          packageType: "DIP16L",
          status: "pending_card",
        },
      });
      const res = await request(app)
        .post(`/api/batches/${order.id}/cancel`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("cancelled");
    });
  });

  describe("POST /api/batches/:id/pause & resume", () => {
    it("should pause and resume a pending_card order with history", async () => {
      const order = await prisma.batch.create({
        data: {
          orderNo: "30001",
          customerCode: "CUST001",
          productId: (await prisma.product.findFirst())!.id,
          quantity: 30,
          packageType: "SOP8L",
          status: "pending_card",
        },
      });

      const pauseRes = await request(app)
        .post(`/api/batches/${order.id}/pause`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "订单型号有误，待与客户确认" });
      expect(pauseRes.status).toBe(200);
      expect(pauseRes.body.pausedAt).toBeTruthy();
      expect(pauseRes.body.pauseReason).toBe("订单型号有误，待与客户确认");
      expect(pauseRes.body.status).toBe("pending_card");

      const records = await prisma.batchPauseRecord.findMany({ where: { batchId: order.id } });
      expect(records).toHaveLength(1);
      expect(records[0].endedAt).toBeNull();

      const resumeRes = await request(app)
        .post(`/api/batches/${order.id}/resume`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(resumeRes.status).toBe(200);
      expect(resumeRes.body.pausedAt).toBeNull();
      expect(resumeRes.body.pauseReason).toBeNull();

      const closed = await prisma.batchPauseRecord.findMany({ where: { batchId: order.id } });
      expect(closed).toHaveLength(1);
      expect(closed[0].endedAt).toBeTruthy();
      expect(closed[0].endedBy).toBeDefined();
    });

    it("should require a pause reason", async () => {
      const order = await prisma.batch.create({
        data: {
          orderNo: "30002",
          customerCode: "CUST001",
          productId: (await prisma.product.findFirst())!.id,
          quantity: 10,
          packageType: "SOP8L",
          status: "pending_card",
        },
      });
      const res = await request(app)
        .post(`/api/batches/${order.id}/pause`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it("should reject double pause and resume when not paused", async () => {
      const order = await prisma.batch.create({
        data: {
          orderNo: "30003",
          customerCode: "CUST001",
          productId: (await prisma.product.findFirst())!.id,
          quantity: 10,
          packageType: "SOP8L",
          status: "active",
        },
      });
      const pauseRes = await request(app)
        .post(`/api/batches/${order.id}/pause`)
        .set("Authorization", `Bearer ${workerToken}`)
        .send({ reason: "压焊机故障待修" });
      expect(pauseRes.status).toBe(200);

      const doublePause = await request(app)
        .post(`/api/batches/${order.id}/pause`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "再次暂停" });
      expect(doublePause.status).toBe(400);
      expect(doublePause.body.error).toContain("已在暂停中");

      const notPausedOrder = await prisma.batch.create({
        data: {
          orderNo: "30004",
          customerCode: "CUST001",
          productId: (await prisma.product.findFirst())!.id,
          quantity: 10,
          packageType: "SOP8L",
          status: "active",
        },
      });
      const resumeRes = await request(app)
        .post(`/api/batches/${notPausedOrder.id}/resume`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(resumeRes.status).toBe(400);
      expect(resumeRes.body.error).toContain("不在暂停中");
    });

    it("should block lifecycle actions while paused but allow edit and cancel", async () => {
      const order = await prisma.batch.create({
        data: {
          orderNo: "30005",
          customerCode: "CUST001",
          productId: (await prisma.product.findFirst())!.id,
          quantity: 10,
          packageType: "SOP8L",
          status: "pending_card",
        },
      });
      await request(app)
        .post(`/api/batches/${order.id}/pause`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "订单信息有误" });

      const confirmRes = await request(app)
        .post(`/api/batches/${order.id}/confirm-card`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ batchNo: "PAUSED-CARD" });
      expect(confirmRes.status).toBe(400);
      expect(confirmRes.body.error).toContain("暂停中");

      const progressRes = await request(app)
        .post("/api/progress")
        .set("Authorization", `Bearer ${workerToken}`)
        .send({ batchId: order.id, stageId: (await prisma.processStage.findFirst())!.id });
      expect(progressRes.status).toBe(400);

      const editRes = await request(app)
        .put(`/api/batches/${order.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ notes: "暂停期间修正备注" });
      expect(editRes.status).toBe(200);

      const cancelRes = await request(app)
        .post(`/api/batches/${order.id}/cancel`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe("cancelled");
      expect(cancelRes.body.pausedAt).toBeNull();

      const records = await prisma.batchPauseRecord.findMany({ where: { batchId: order.id } });
      expect(records).toHaveLength(1);
      expect(records[0].endedAt).toBeTruthy();
    });

    it("should block progress transitions for paused active batches", async () => {
      const order = await prisma.batch.create({
        data: {
          orderNo: "30006",
          customerCode: "CUST001",
          productId: (await prisma.product.findFirst())!.id,
          quantity: 10,
          packageType: "SOP8L",
          status: "active",
        },
      });
      await request(app)
        .post(`/api/batches/${order.id}/pause`)
        .set("Authorization", `Bearer ${workerToken}`)
        .send({ reason: "原材料未到" });

      const progressRes = await request(app)
        .post("/api/progress")
        .set("Authorization", `Bearer ${workerToken}`)
        .send({ batchId: order.id, stageId: (await prisma.processStage.findFirst())!.id });
      expect(progressRes.status).toBe(400);
      expect(progressRes.body.error).toContain("暂停中");

      const resumeRes = await request(app)
        .post(`/api/batches/${order.id}/resume`)
        .set("Authorization", `Bearer ${workerToken}`);
      expect(resumeRes.status).toBe(200);

      const progressAfterRes = await request(app)
        .post("/api/progress")
        .set("Authorization", `Bearer ${workerToken}`)
        .send({ batchId: order.id, stageId: (await prisma.processStage.findFirst())!.id });
      expect(progressAfterRes.status).toBe(201);
    });

    it("should reject pausing non-pausable tasks", async () => {
      const batch = await prisma.batch.create({
        data: {
          batchNo: "PAUSED-DENY",
          productId: (await prisma.product.findFirst())!.id,
          quantity: 10,
          status: "completed",
        },
      });
      const res = await request(app)
        .post(`/api/batches/${batch.id}/pause`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "不应成功" });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("暂停");
    });

    it("should filter paused tasks in list and counts", async () => {
      const order = await prisma.batch.create({
        data: {
          orderNo: "30007",
          customerCode: "CUST001",
          productId: (await prisma.product.findFirst())!.id,
          quantity: 10,
          packageType: "SOP8L",
          status: "active",
        },
      });
      await request(app)
        .post(`/api/batches/${order.id}/pause`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "等待客户回复" });

      const listRes = await request(app)
        .get("/api/batches?paused=true")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.items.length).toBeGreaterThan(0);
      expect(listRes.body.items.every((item: { pausedAt: string | null }) => item.pausedAt)).toBe(true);

      const countsRes = await request(app)
        .get("/api/batches/counts")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(countsRes.status).toBe(200);
      expect(countsRes.body.paused).toBeGreaterThan(0);
    });
  });

  describe("PUT /api/batches/:id", () => {
    it("should update batch status", async () => {
      const batch = await prisma.batch.create({
        data: {
          batchNo: "BTEST-UPD",
          productId: (await prisma.product.findFirst())!.id,
          quantity: 50,
          status: "active",
        },
      });

      const res = await request(app)
        .put(`/api/batches/${batch.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "archived" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("状态变更");
    });

    it("should update priority and notes", async () => {
      const batch = await prisma.batch.findFirst({ where: { batchNo: "BTEST-001" } });

      const res = await request(app)
        .put(`/api/batches/${batch!.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ priority: "urgent", notes: "紧急处理" });

      expect(res.status).toBe(200);
      expect(res.body.priority).toBe("urgent");
      expect(res.body.notes).toBe("紧急处理");
    });
  });
});
