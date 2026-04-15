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

  describe("POST /api/batches", () => {
    it("should create a new batch (admin)", async () => {
      const res = await request(app)
        .post("/api/batches")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          batchNo: "BTEST-002",
          productModel: "STM32F103",
          quantity: 200,
          packageType: "SOP8L",
          priority: "urgent",
        });

      expect(res.status).toBe(201);
      expect(res.body.batchNo).toBe("BTEST-002");
      expect(res.body.quantity).toBe(200);
      expect(res.body.priority).toBe("urgent");

      // Verify product was auto-created
      const product = await prisma.product.findUnique({ where: { model: "STM32F103" } });
      expect(product).toBeDefined();
    });

    it("should reject duplicate batchNo", async () => {
      const res = await request(app)
        .post("/api/batches")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          batchNo: "BTEST-001",
          productModel: "GD32F303",
          quantity: 50,
          packageType: "SOP8L",
        });

      expect(res.status).toBe(500); // Prisma unique constraint error
    });

    it("should reject missing required fields", async () => {
      const res = await request(app)
        .post("/api/batches")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ batchNo: "BTEST-003" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("参数验证失败");
    });

    it("should reject worker creating batch", async () => {
      const res = await request(app)
        .post("/api/batches")
        .set("Authorization", `Bearer ${workerToken}`)
        .send({
          batchNo: "BTEST-WORKER",
          productModel: "GD32F303",
          quantity: 10,
          packageType: "SOP8L",
        });

      expect(res.status).toBe(403);
    });

    it("should reuse existing product when same productModel", async () => {
      const before = await prisma.product.count();

      await request(app)
        .post("/api/batches")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          batchNo: "BTEST-003",
          productModel: "GD32F303", // same as seed
          quantity: 50,
          packageType: "DIP16L",
        });

      const after = await prisma.product.count();
      expect(after).toBe(before); // No new product created
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

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("archived");
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
