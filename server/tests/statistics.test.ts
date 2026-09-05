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
    it("should export online product batches in statistics-table format", async () => {
      const res = await request(app)
        .get("/api/statistics/export/excel")
        .set("Authorization", `Bearer ${adminToken}`)
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application");

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body as Buffer);
      const worksheet = workbook.getWorksheet("在线产品加工统计");

      expect(worksheet).toBeDefined();
      const header = worksheet!.getRow(1).values as unknown[];
      expect(header).toContain("客户代码");
      expect(header).toContain("当前站点");
      expect(header).toContain("客户类型");
      expect(header).toContain("未交付数量");

      const firstDataRow = worksheet!.getRow(2).values as unknown[];
      expect(firstDataRow).toContain("BTEST-001");
      // 客户名称/类型来自客户代码表预填数据，在途任务交付数量为 0
      expect(firstDataRow).toContain("测试客户");
      expect(firstDataRow).toContain("所内");
      expect(firstDataRow).toContain(0);
    });
  });
});
