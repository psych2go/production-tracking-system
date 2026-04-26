import type { ProcessStage } from "../types";

/**
 * 格式化日期为 "YYYY-MM-DD HH:mm"
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 格式化日期为简短格式 "M/D H:mm"
 */
export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 格式化日期为 "YYYY-MM-DD"
 */
export function formatDateShort(dateStr: string): string {
  return formatDate(dateStr).slice(0, 10);
}

/**
 * 获取批次当前所在工序（按最新流转时间，不是按工序序号）
 */
export function getCurrentStage(batch: { progressRecords?: { status: string; createdAt: string; stage?: ProcessStage }[] }): ProcessStage | null {
  if (!batch.progressRecords?.length) return null;
  const completed = batch.progressRecords
    .filter(r => r.status === "completed")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return completed[0]?.stage ?? null;
}
