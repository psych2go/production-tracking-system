import { spawnSync } from "child_process";
import { describe, expect, it } from "vitest";

describe("production configuration", () => {
  function loadProductionConfig(overrides: Record<string, string>) {
    return spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "-e",
        'import "./src/config/index.ts"',
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: "production",
          JWT_SECRET: "a-secure-random-production-secret-at-least-32-chars",
          CLIENT_URL: "https://production.example.com",
          ...overrides,
        },
        encoding: "utf8",
      },
    );
  }

  it("rejects an example JWT secret", () => {
    const result = loadProductionConfig({
      JWT_SECRET: "your-jwt-secret-change-in-production",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("JWT_SECRET");
  });

  it("rejects an insecure production client URL", () => {
    const result = loadProductionConfig({
      CLIENT_URL: "http://production.example.com",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("CLIENT_URL");
  });

  it("accepts a secure production configuration", () => {
    const result = loadProductionConfig({});

    expect(result.status).toBe(0);
  });
});
