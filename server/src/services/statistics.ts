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
    const lastUpdate = b.progressRecords[0]?.createdAt;
    if (lastUpdate && Date.now() - new Date(lastUpdate).getTime() > fiveDaysMs) {
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
  // Dynamic import for xlsx (large library)
  const XLSX = await import("xlsx");

  const batches = await prisma.batch.findMany({
    where: { status: "active" },
    include: {
      product: true,
      progressRecords: { include: { stage: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const productRows = batches.map(b => {
    const currentStage = getCurrentStageFromRecords(b.progressRecords);
    return {
      批号: b.batchNo,
      产品型号: b.product?.model || "",
      数量: b.quantity,
      封装形式: b.packageType || "",
      客户代码: b.customerCode || "",
      订单编号: b.orderNo || "",
      优先级: b.priority === "urgent" ? "紧急" : "普通",
      当前工序: currentStage,
      备注: b.notes || "",
      创建时间: b.createdAt.toISOString().slice(0, 10),
    };
  });

  const wb = XLSX.utils.book_new();
  if (productRows.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productRows), "在线产品");
  } else {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{}]), "空");
  }

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
