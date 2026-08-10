import { prisma } from "../config/database.js";

// --- Anomaly Detection (used by dashboard) ---
export async function getAnomalies() {
  const anomalies: Array<{
    type: string;
    severity: string;
    batchId: number;
    batchNo: string;
    description: string;
    value: number;
    threshold: number;
  }> = [];

  // Delayed batches (no progress update in 5+ days)
  const activeBatches = await prisma.batch.findMany({
    where: { status: "active" },
    include: { progressRecords: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
  for (const b of activeBatches) {
    // 无进度记录时回退到批次创建时间，确保"创建了却从未开工"的批次也能被延迟预警
    const lastUpdate = b.progressRecords[0]?.createdAt ?? b.createdAt;
    if (Date.now() - new Date(lastUpdate).getTime() > fiveDaysMs) {
      anomalies.push({
        type: "batch_delay",
        severity: "major",
        batchId: b.id,
        batchNo: b.batchNo,
        description: `超过5天无进度更新`,
        value: Math.round((Date.now() - new Date(lastUpdate).getTime()) / (24 * 60 * 60 * 1000)),
        threshold: 5,
      });
    }
  }

  return anomalies;
}

// --- Helper: get current stage from progress records ---
function getCurrentStageFromRecords(
  records: { stageId: number; status: string; createdAt: Date; stage?: { name: string } | null }[],
): string {
  if (!records.length) return "未开始";
  const completed = records
    .filter(r => r.status === "completed")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return completed[0]?.stage?.name || "未开始";
}

// --- Excel Export (online product batches) ---
export async function exportExcel() {
  const ExcelJS = (await import("exceljs")).default;

  const batches = await prisma.batch.findMany({
    where: { status: "active" },
    include: {
      product: true,
      progressRecords: { include: { stage: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const productRows = batches.map((b) => {
    const currentStage = getCurrentStageFromRecords(b.progressRecords);
    return [
      b.batchNo,
      b.product?.model || "",
      b.quantity,
      b.packageType || "",
      b.customerCode || "",
      b.orderNo || "",
      b.priority === "urgent" ? "紧急" : "普通",
      currentStage,
      b.notes || "",
      b.createdAt.toISOString().slice(0, 10),
    ];
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "生产进度追踪系统";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(productRows.length ? "在线产品" : "空");
  worksheet.columns = [
    { header: "批号", key: "batchNo", width: 20 },
    { header: "产品型号", key: "productModel", width: 24 },
    { header: "数量", key: "quantity", width: 12 },
    { header: "封装形式", key: "packageType", width: 20 },
    { header: "客户代码", key: "customerCode", width: 16 },
    { header: "订单编号", key: "orderNo", width: 18 },
    { header: "优先级", key: "priority", width: 12 },
    { header: "当前工序", key: "currentStage", width: 16 },
    { header: "备注", key: "notes", width: 30 },
    { header: "创建时间", key: "createdAt", width: 16 },
  ];
  worksheet.getRow(1).font = { bold: true };

  for (const row of productRows) {
    worksheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
