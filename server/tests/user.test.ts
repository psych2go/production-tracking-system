import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, adminToken, workerToken, prisma } from "./setup.js";

describe("User Routes", () => {
  describe("GET /api/users", () => {
    it("should return paginated user list (admin)", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toBeInstanceOf(Array);
      expect(res.body.total).toBeGreaterThanOrEqual(2); // admin + worker
    });

    it("should filter by role", async () => {
      const res = await request(app)
        .get("/api/users?role=admin")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.every((u: any) => u.role === "admin")).toBe(true);
    });

    it("should filter by keyword", async () => {
      const res = await request(app)
        .get("/api/users?keyword=测试")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it("should reject worker access", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${workerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/users/:id", () => {
    it("should update user role (admin)", async () => {
      const worker = await prisma.user.findFirst({ where: { role: "worker" } });

      const res = await request(app)
        .put(`/api/users/${worker!.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "admin" });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe("admin");

      // Reset back
      await prisma.user.update({ where: { id: worker!.id }, data: { role: "worker" } });
    });

    it("should update user department", async () => {
      const worker = await prisma.user.findFirst({ where: { role: "worker" } });

      const res = await request(app)
        .put(`/api/users/${worker!.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ department: "质量部" });

      expect(res.status).toBe(200);
      expect(res.body.department).toBe("质量部");
    });
  });

  describe("DELETE /api/users/:id", () => {
    it("should deactivate a user (admin)", async () => {
      const worker = await prisma.user.findFirst({ where: { role: "worker" } });

      const res = await request(app)
        .delete(`/api/users/${worker!.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(false);

      // Reactivate for other tests
      await prisma.user.update({ where: { id: worker!.id }, data: { isActive: true } });
    });
  });
});
