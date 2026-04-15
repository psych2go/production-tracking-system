import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, adminToken, workerToken } from "./setup.js";

describe("Auth Routes", () => {
  describe("POST /api/auth/dev-login", () => {
    it("should return token and user on dev login", async () => {
      const res = await request(app).post("/api/auth/dev-login");

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe("开发管理员");
      expect(res.body.user.role).toBe("admin");
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return current user info with valid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("测试管理员");
      expect(res.body.role).toBe("admin");
    });

    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("should return 401 with invalid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token");

      expect(res.status).toBe(401);
    });
  });
});
