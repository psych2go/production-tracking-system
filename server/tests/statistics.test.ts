import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, adminToken, prisma } from "./setup.js";

describe("Statistics Routes", () => {
  describe("GET /api/statistics/durations", () => {
    it("should return process duration data", async () => {
      const res = await request(app)
        .get("/api/statistics/durations")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
    });

    it("should filter by stageId", async () => {
      const stage = await prisma.processStage.findFirst();
      const res = await request(app)
        .get(`/api/statistics/durations?stageId=${stage!.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
    });
  });

  describe("GET /api/statistics/production", () => {
    it("should return production trend data", async () => {
      const res = await request(app)
        .get("/api/statistics/production?groupBy=day")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      if (res.body.length > 0) {
        expect(res.body[0].period).toBeDefined();
        expect(res.body[0].totalOutput).toBeDefined();
        expect(res.body[0].recordCount).toBeDefined();
      }
    });

    it("should support week and month grouping", async () => {
      for (const groupBy of ["day", "week", "month"]) {
        const res = await request(app)
          .get(`/api/statistics/production?groupBy=${groupBy}`)
          .set("Authorization", `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
      }
    });
  });

  describe("GET /api/statistics/anomalies", () => {
    it("should return anomaly list", async () => {
      const res = await request(app)
        .get("/api/statistics/anomalies")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
    });
  });

  describe("GET /api/statistics/grouped", () => {
    it("should return grouped statistics by customerCode", async () => {
      const res = await request(app)
        .get("/api/statistics/grouped?groupBy=customerCode")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
    });

    it("should return grouped statistics by packageType", async () => {
      const res = await request(app)
        .get("/api/statistics/grouped?groupBy=packageType")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
    });
  });

  describe("GET /api/statistics/export/excel", () => {
    it("should export durations as Excel", async () => {
      const res = await request(app)
        .get("/api/statistics/export/excel?type=durations")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application");
    });

    it("should export production as Excel", async () => {
      const res = await request(app)
        .get("/api/statistics/export/excel?type=production")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it("should reject unsupported export type", async () => {
      const res = await request(app)
        .get("/api/statistics/export/excel?type=invalid")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
    });
  });
});
