import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app, adminToken, workerToken, prisma } from "./setup.js";

describe("Progress Routes", () => {
  let batchId: number;
  let stageId: number;
  let lastStageId: number;

  beforeEach(async () => {
    // Get test data
    const batch = await prisma.batch.findFirst({ where: { batchNo: "BTEST-001" } });
    const stages = await prisma.processStage.findMany({ orderBy: { stageOrder: "asc" } });
    batchId = batch!.id;
    stageId = stages[0].id; // 来料检验
    lastStageId = stages[stages.length - 1].id; // 包装

    // Clean progress records
    await prisma.progressRecord.deleteMany();
    // Reset batch to active
    await prisma.batch.update({ where: { id: batchId }, data: { status: "active" } });
  });

  describe("GET /api/progress/dashboard", () => {
    it("should return dashboard data", async () => {
      const res = await request(app)
        .get("/api/progress/dashboard")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.activeProductBatches).toBeGreaterThanOrEqual(0);
      expect(res.body.stats.activeProductQuantity).toBeGreaterThanOrEqual(0);
      expect(res.body.stats.totalTrialBatches).toBeGreaterThanOrEqual(0);
      expect(res.body.recentActivity).toBeInstanceOf(Array);
      expect(res.body.activeBatchList).toBeInstanceOf(Array);
      expect(res.body.anomalies).toBeInstanceOf(Array);
    });
  });

  describe("GET /api/progress/stages", () => {
    it("should return all process stages", async () => {
      const res = await request(app)
        .get("/api/progress/stages")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(4);
      expect(res.body[0].code).toBe("incoming");
    });
  });

  describe("POST /api/progress", () => {
    it("should create a progress record", async () => {
      const res = await request(app)
        .post("/api/progress")
        .set("Authorization", `Bearer ${workerToken}`)
        .send({
          batchId,
          stageId,
        });

      expect(res.status).toBe(201);
      expect(res.body.batchId).toBe(batchId);
      expect(res.body.stageId).toBe(stageId);
      expect(res.body.status).toBe("completed");
      expect(res.body.createdAt).toBeDefined();
    });

    it("should reject duplicate progress record (same batch + stage)", async () => {
      // Create first
      await request(app)
        .post("/api/progress")
        .set("Authorization", `Bearer ${workerToken}`)
        .send({ batchId, stageId });

      // Attempt duplicate
      const res = await request(app)
        .post("/api/progress")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ batchId, stageId, notes: "二次更新" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("不可重复流转");

      // Should still be only 1 record
      const count = await prisma.progressRecord.count({
        where: { batchId, stageId },
      });
      expect(count).toBe(1);
    });

    it("should auto-complete batch when reaching last stage", async () => {
      const res = await request(app)
        .post("/api/progress")
        .set("Authorization", `Bearer ${workerToken}`)
        .send({ batchId, stageId: lastStageId });

      expect(res.status).toBe(201);

      const batch = await prisma.batch.findUnique({ where: { id: batchId } });
      expect(batch!.status).toBe("completed");
    });

    it("should reject invalid batchId", async () => {
      const res = await request(app)
        .post("/api/progress")
        .set("Authorization", `Bearer ${workerToken}`)
        .send({ batchId: 99999, stageId });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("should reject without auth", async () => {
      const res = await request(app)
        .post("/api/progress")
        .send({ batchId, stageId });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/progress", () => {
    it("should return paginated progress records", async () => {
      const res = await request(app)
        .get("/api/progress")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toBeInstanceOf(Array);
      expect(res.body.total).toBeGreaterThanOrEqual(0);
    });

    it("should filter by batchId", async () => {
      const res = await request(app)
        .get(`/api/progress?batchId=${batchId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.every((r: any) => r.batchId === batchId)).toBe(true);
    });
  });

  describe("GET /api/progress/stages/:stageId/products", () => {
    it("should return products at a stage", async () => {
      const res = await request(app)
        .get(`/api/progress/stages/${stageId}/products`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toBeInstanceOf(Array);
      expect(res.body.total).toBeGreaterThanOrEqual(0);
    });
  });
});
