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
  if (!customerDelivery || !status || ["completed", "archived", "cancelled"].includes(status)) return false;
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

/**
 * 格式化耗时：超过1天显示“X天X小时”，不足1天显示“X小时X分”或“X分钟”
 * endedAt 为空时按当前时间计算（进行中）
 */
export function formatDuration(startedAt: string, endedAt?: string | null, now: number = Date.now()): string {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : now;
  const totalMinutes = Math.max(0, Math.floor((end - start) / (1000 * 60)));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}天${hours > 0 ? hours + "小时" : ""}`;
  if (hours > 0) return `${hours}小时${minutes > 0 ? minutes + "分" : ""}`;
  return `${minutes}分钟`;
}
