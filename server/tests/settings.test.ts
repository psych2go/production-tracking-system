import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, adminToken, workerToken, prisma } from "./setup.js";

describe("Settings Routes", () => {
  describe("Process Stages", () => {
    it("should create a new stage (admin)", async () => {
      const res = await request(app)
        .post("/api/settings/stages")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ code: "test_stage", name: "测试工序", stageOrder: 99 });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("测试工序");
      expect(res.body.code).toBe("test_stage");
    });

    it("should update a stage (admin)", async () => {
      const stage = await prisma.processStage.findFirst({ where: { code: "test_stage" } });
      expect(stage).not.toBeNull();

      const res = await request(app)
        .put(`/api/settings/stages/${stage!.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "测试工序-更新" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("测试工序-更新");
    });

    it("should delete a stage with no progress records (admin)", async () => {
      const stage = await prisma.processStage.findFirst({ where: { code: "test_stage" } });
      expect(stage).not.toBeNull();

      const res = await request(app)
        .delete(`/api/settings/stages/${stage!.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it("should reject worker managing stages", async () => {
      const res = await request(app)
        .post("/api/settings/stages")
        .set("Authorization", `Bearer ${workerToken}`)
        .send({ code: "worker_stage", name: "工人工序", stageOrder: 50 });

      expect(res.status).toBe(403);
    });
  });

  describe("Package Types", () => {
    it("should list package types", async () => {
      const res = await request(app)
        .get("/api/settings/package-types")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it("should create a new package type (admin)", async () => {
      const res = await request(app)
        .post("/api/settings/package-types")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "QFP48L", category: "QFP", sortOrder: 10 });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("QFP48L");
    });

    it("should delete a package type with no associated batches", async () => {
      const pt = await prisma.packageType.findFirst({ where: { name: "QFP48L" } });
      expect(pt).not.toBeNull();

      const res = await request(app)
        .delete(`/api/settings/package-types/${pt!.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it("should reject deleting package type with associated batches", async () => {
      const pt = await prisma.packageType.findFirst({ where: { name: "SOP8L" } });
      expect(pt).not.toBeNull();

      const res = await request(app)
        .delete(`/api/settings/package-types/${pt!.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
    });
  });
});
