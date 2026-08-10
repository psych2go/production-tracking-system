import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { rateLimit } from "../src/middleware/rateLimit.js";

function createApp() {
  const app = express();
  app.set("trust proxy", "loopback");
  app.get("/first", rateLimit({ windowMs: 60_000, max: 2 }), (_req, res) => {
    res.json({ ok: true });
  });
  app.get("/second", rateLimit({ windowMs: 60_000, max: 2 }), (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe("rateLimit", () => {
  it("limits each forwarded client IP independently", async () => {
    const app = createApp();

    const first = await request(app)
      .get("/first")
      .set("X-Forwarded-For", "203.0.113.10");
    const second = await request(app)
      .get("/first")
      .set("X-Forwarded-For", "203.0.113.10");
    const blocked = await request(app)
      .get("/first")
      .set("X-Forwarded-For", "203.0.113.10");
    const otherClient = await request(app)
      .get("/first")
      .set("X-Forwarded-For", "203.0.113.11");

    expect(first.status).toBe(200);
    expect(first.headers["ratelimit-remaining"]).toBe("1");
    expect(second.status).toBe(200);
    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeDefined();
    expect(otherClient.status).toBe(200);
  });

  it("keeps separate limiter instances independent", async () => {
    const app = createApp();
    const clientIp = "203.0.113.20";

    await request(app).get("/first").set("X-Forwarded-For", clientIp);
    await request(app).get("/first").set("X-Forwarded-For", clientIp);
    const secondRoute = await request(app)
      .get("/second")
      .set("X-Forwarded-For", clientIp);

    expect(secondRoute.status).toBe(200);
    expect(secondRoute.headers["ratelimit-remaining"]).toBe("1");
  });
});
