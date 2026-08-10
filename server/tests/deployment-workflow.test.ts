import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

describe("deployment workflow", () => {
  const workflow = readFileSync(resolve("../.github/workflows/deploy.yml"), "utf8");
  const frontendSteps = workflow.split("# 前端")[1] || "";

  it("installs frontend build dependencies in production", () => {
    expect(frontendSteps).toContain("npm ci --include=dev");
  });

  it("builds the frontend before replacing the live output", () => {
    const buildIndex = frontendSteps.indexOf(
      'UNI_OUTPUT_DIR="$PWD/dist/build/h5-next" npm run build:h5',
    );
    const replaceIndex = frontendSteps.indexOf("mv dist/build/h5-next dist/build/h5");

    expect(buildIndex).toBeGreaterThanOrEqual(0);
    expect(replaceIndex).toBeGreaterThan(buildIndex);
  });
});
