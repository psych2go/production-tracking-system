import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { spawnSync } from "child_process";
import { afterEach, describe, expect, it } from "vitest";

describe("production environment preparation", () => {
  const tempDirectories: string[] = [];
  const scriptPath = resolve("scripts/prepare-production-env.cjs");

  afterEach(() => {
    for (const directory of tempDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  function runWithEnv(contents: string, overrides: Record<string, string> = {}) {
    const directory = mkdtempSync(join(tmpdir(), "pts-production-env-"));
    tempDirectories.push(directory);
    const envPath = join(directory, ".env");
    writeFileSync(envPath, contents);

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PRODUCTION_ENV_PATH: envPath,
        ...overrides,
      },
      encoding: "utf8",
    });

    return { envPath, result };
  }

  it("upgrades an existing HTTP domain and canonicalizes managed keys", () => {
    const { envPath, result } = runWithEnv([
      "NODE_ENV=development",
      "HOST=0.0.0.0",
      "JWT_SECRET=dev-secret",
      "CLIENT_URL=http://tracking.example.com/",
      "CLIENT_URL=http://tracking.example.com",
      "",
    ].join("\n"));

    expect(result.status).toBe(0);
    const contents = readFileSync(envPath, "utf8");
    expect(contents.match(/^CLIENT_URL=/gm)).toHaveLength(1);
    expect(contents).toContain("CLIENT_URL=https://tracking.example.com\n");
    expect(contents).toContain("NODE_ENV=production\n");
    expect(contents).toContain("HOST=127.0.0.1\n");
    expect(contents).not.toContain("JWT_SECRET=dev-secret");
    expect(contents.match(/^JWT_SECRET=([a-f0-9]{64})$/m)).not.toBeNull();
    expect(statSync(envPath).mode & 0o777).toBe(0o600);
  });

  it("rejects a localhost client URL instead of guessing a production domain", () => {
    const { result } = runWithEnv([
      "JWT_SECRET=a-secure-random-production-secret-at-least-32-chars",
      "CLIENT_URL=http://localhost:5173",
      "",
    ].join("\n"));

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("CLIENT_URL");
  });

  it("uses an explicitly configured production client URL", () => {
    const { envPath, result } = runWithEnv([
      "JWT_SECRET=a-secure-random-production-secret-at-least-32-chars",
      "CLIENT_URL=https://wrong.example.com",
      "",
    ].join("\n"), {
      PRODUCTION_CLIENT_URL: "https://www.gaokekao.cn/",
    });

    expect(result.status).toBe(0);
    expect(readFileSync(envPath, "utf8")).toContain(
      "CLIENT_URL=https://www.gaokekao.cn\n",
    );
  });
});
