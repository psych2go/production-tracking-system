import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, adminToken, workerToken } from "./setup.js";

describe("Audit Routes", () => {
  describe("GET /api/audit/logs", () => {
    it("should return paginated audit logs (admin)", async () => {
      const res = await request(app)
        .get("/api/audit/logs")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toBeInstanceOf(Array);
      expect(res.body.total).toBeGreaterThanOrEqual(0);
      expect(res.body.page).toBe(1);
    });

    it("should filter by action", async () => {
      const res = await request(app)
        .get("/api/audit/logs?action=create")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it("should filter by entity", async () => {
      const res = await request(app)
        .get("/api/audit/logs?entity=batch")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it("should reject worker access", async () => {
      const res = await request(app)
        .get("/api/audit/logs")
        .set("Authorization", `Bearer ${workerToken}`);

      expect(res.status).toBe(403);
    });
  });
});
