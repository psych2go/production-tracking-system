import ExcelJS from "exceljs";
import { prisma } from "../config/database.js";

export interface ArchiveImportRowFailure {
  row: number;
  batchNo: string;
  reason: string;
}

export interface ArchiveImportResult {
  successCount: number;
  skippedCount: number;
  failedCount: number;
  failures: ArchiveImportRowFailure[];
}

const COMPACT_DATE_RE = /^\d{8}$/;
const DASHED_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 导出「已完成待归档」批次模板：批号/型号/数量预填，仅三列归档数据待填 */
export async function exportArchiveTemplate() {
  const batches = await prisma.batch.findMany({
    where: { status: "completed", dieQuantity: null },
    include: { product: true },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "生产进度追踪系统";
  const worksheet = workbook.addWorksheet(batches.length ? "归档数据导入" : "空");
  worksheet.columns = [
    { header: "生产批号（必填，请勿修改）", key: "batchNo", width: 24 },
    { header: "产品型号", key: "model", width: 22 },
    { header: "订单数量", key: "quantity", width: 12 },
    { header: "上芯数（必填，正整数）", key: "dieQuantity", width: 20 },
    { header: "发货数（必填，不大于上芯数）", key: "shippedQuantity", width: 26 },
    { header: "发货日期（必填，格式：YYYYMMDD 或 YYYY-MM-DD，不晚于上传当天）", key: "shippedDate", width: 38 },
  ];
  worksheet.getRow(1).font = { bold: true };
  for (const b of batches) {
    worksheet.addRow({ batchNo: b.batchNo || "", model: b.product?.model || "", quantity: b.quantity });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function cellText(row: ExcelJS.Row, col: number): string {
  const value = row.getCell(col).value;
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  if (typeof value === "object") {
    const obj = value as { text?: unknown; result?: unknown };
    if (obj.text !== undefined) return String(obj.text).trim();
    if (obj.result !== undefined) return String(obj.result).trim();
    return "";
  }
  return String(value).trim();
}

/** 批量导入归档数据：逐行校验，有效行补数据并归档，返回成功/跳过/失败明细 */
export async function importArchiveData(fileBuffer: Buffer): Promise<ArchiveImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as unknown as ExcelJS.Buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 2) throw new Error("Excel 文件为空或没有数据行");

  // 按表头文字定位列：先匹配更具体的「发货日期」「发货数」，避免「发货数（不大于上芯数）」误匹配到上芯数列
  const headerRow = worksheet.getRow(1);
  let batchNoCol = 0;
  let modelCol = 0;
  let dieCol = 0;
  let shippedCol = 0;
  let dateCol = 0;
  headerRow.eachCell((cell, colNumber) => {
    const text = String(cell.value ?? "").trim();
    if (text.includes("发货日期")) dateCol = colNumber;
    else if (text.includes("发货数")) shippedCol = colNumber;
    else if (text.includes("上芯数")) dieCol = colNumber;
    else if (text.includes("型号")) modelCol = colNumber;
    else if (text.includes("批号")) batchNoCol = colNumber;
  });
  if (!batchNoCol || !dieCol || !shippedCol || !dateCol) {
    throw new Error("模板格式不正确，请下载最新模板填写（需包含批号、上芯数、发货数、发货日期列）");
  }

  const failures: ArchiveImportRowFailure[] = [];
  const valid: Array<{ id: number; dieQuantity: number; shippedQuantity: number; shippedDate: Date }> = [];
  let skippedCount = 0;

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  for (let r = 2; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const batchNo = cellText(row, batchNoCol);
    const modelText = modelCol ? cellText(row, modelCol) : "";
    const dieText = cellText(row, dieCol);
    const shippedText = cellText(row, shippedCol);
    const dateText = cellText(row, dateCol);
    // 整行为空则跳过
    if (!batchNo && !dieText && !shippedText && !dateText) continue;

    const fail = (msg: string) => failures.push({ row: r, batchNo: batchNo || "-", reason: msg });

    const candidates = batchNo
      ? await prisma.batch.findMany({ where: { batchNo }, include: { product: true } })
      : [];
    if (!candidates.length) { fail("批号不存在"); continue; }
    let batch = candidates[0];
    if (candidates.length > 1) {
      const matched = modelText
        ? candidates.filter((b) => b.product?.model === modelText)
        : [];
      if (matched.length !== 1) { fail("该批号存在多条记录，无法唯一匹配"); continue; }
      batch = matched[0];
    }
    if (batch.status === "archived") { skippedCount++; continue; }
    if (batch.status !== "completed") { fail(`状态为「${batch.status}」，仅已完成批次可导入`); continue; }

    const die = Number(dieText);
    if (!Number.isInteger(die) || die <= 0) { fail("上芯数必须为正整数"); continue; }
    const shipped = Number(shippedText);
    if (!Number.isInteger(shipped) || shipped < 0) { fail("发货数必须为不小于0的整数"); continue; }
    if (shipped > die) { fail("发货数不能大于上芯数"); continue; }
    // 兼容 YYYYMMDD 与 YYYY-MM-DD 两种写法，也兼容 2026/9/1 等分隔符变体
    let normalizedDate = dateText.replace(/[\/.]/g, "-");
    if (/^\d{8}$/.test(normalizedDate)) {
      normalizedDate = `${normalizedDate.slice(0, 4)}-${normalizedDate.slice(4, 6)}-${normalizedDate.slice(6, 8)}`;
    }
    const md = normalizedDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!md) { fail("发货日期格式应为 YYYYMMDD 或 YYYY-MM-DD"); continue; }
    const dashedDate = `${md[1]}-${md[2].padStart(2, "0")}-${md[3].padStart(2, "0")}`;
    if (!DASHED_DATE_RE.test(dashedDate)) { fail("发货日期无效"); continue; }
    const shippedDate = new Date(`${dashedDate}T00:00:00`);
    if (Number.isNaN(shippedDate.getTime())) { fail("发货日期无效"); continue; }
    if (shippedDate > endOfToday) { fail("发货日期不能晚于上传当天"); continue; }

    valid.push({ id: batch.id, dieQuantity: die, shippedQuantity: shipped, shippedDate });
  }

  if (valid.length) {
    await prisma.$transaction(
      valid.map((v) =>
        prisma.batch.update({
          where: { id: v.id },
          data: {
            status: "archived",
            dieQuantity: v.dieQuantity,
            shippedQuantity: v.shippedQuantity,
            shippedDate: v.shippedDate,
          },
        })
      )
    );
  }

  return {
    successCount: valid.length,
    skippedCount,
    failedCount: failures.length,
    failures,
  };
}
