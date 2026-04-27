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
  // ISO date strings start with "YYYY-MM-DD", extract directly
  if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.slice(0, 10);
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

/** 判断批次是否逾期（按天比较，忽略时分秒） */
export function isOverdue(customerDelivery: string | null | undefined, status: string | undefined): boolean {
  if (!customerDelivery || status !== "active") return false;
  const deliveryDate = new Date(customerDelivery);
  const today = new Date();
  deliveryDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return deliveryDate < today;
}

/** 计算逾期天数（向上取整） */
export function getOverdueDays(customerDelivery: string | null | undefined): number {
  if (!customerDelivery) return 0;
  const diff = Date.now() - new Date(customerDelivery).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
