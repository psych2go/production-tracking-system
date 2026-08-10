import { spawnSync } from "child_process";
import { describe, expect, it } from "vitest";

describe("production configuration", () => {
  it("rejects an example JWT secret", () => {
    const result = spawnSync(
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
          JWT_SECRET: "your-jwt-secret-change-in-production",
        },
        encoding: "utf8",
      },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("JWT_SECRET");
  });
});
