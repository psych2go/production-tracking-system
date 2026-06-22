import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, adminToken } from "./setup.js";

describe("Statistics Routes", () => {
  describe("GET /api/statistics/export/excel", () => {
    it("should export online product batches as Excel", async () => {
      const res = await request(app)
        .get("/api/statistics/export/excel")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application");
    });
  });
});
