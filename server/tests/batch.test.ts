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
