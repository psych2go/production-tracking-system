import { describe, expect, it } from "vitest";
import request from "supertest";
import { adminToken, app, seeded, workerToken } from "./setup.js";

describe("input limits", () => {
  it("rejects oversized progress notes", async () => {
    const res = await request(app)
      .post("/api/progress")
      .set("Authorization", `Bearer ${workerToken}`)
      .send({
        batchId: seeded.batch.id,
        stageId: seeded.stages[0].id,
        notes: "x".repeat(2_001),
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("参数验证失败");
  });

  it("rejects invalid calendar dates", async () => {
    const res = await request(app)
      .post("/api/batches")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        batchNo: "DATE-INVALID",
        productModel: "DATE-MODEL",
        quantity: 1,
        packageType: "SOP8L",
        customerDelivery: "2026-02-30",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("参数验证失败");
  });

  it("rejects oversized search queries", async () => {
    const res = await request(app)
      .get(`/api/users?keyword=${"x".repeat(101)}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("搜索关键词");
  });

  it("rejects JSON bodies larger than 1MB", async () => {
    const res = await request(app)
      .post("/api/auth/password-login")
      .send({ password: "x".repeat(1024 * 1024) });

    expect(res.status).toBe(413);
    expect(res.body.error).toContain("1MB");
  });
});
