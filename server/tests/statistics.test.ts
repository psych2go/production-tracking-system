import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, adminToken } from "./setup.js";
import ExcelJS from "exceljs";

function binaryParser(
  res: NodeJS.ReadableStream,
  callback: (error: Error | null, body?: Buffer) => void,
) {
  const chunks: Buffer[] = [];
  res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
  res.on("error", callback);
}

describe("Statistics Routes", () => {
  describe("GET /api/statistics/export/excel", () => {
    it("should export online product batches as Excel", async () => {
      const res = await request(app)
        .get("/api/statistics/export/excel")
        .set("Authorization", `Bearer ${adminToken}`)
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application");

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body as Buffer);
      const worksheet = workbook.getWorksheet("在线产品");

      expect(worksheet).toBeDefined();
      expect(worksheet!.getRow(1).values).toContain("批号");
      expect(worksheet!.getRow(2).values).toContain("BTEST-001");
    });
  });
});
