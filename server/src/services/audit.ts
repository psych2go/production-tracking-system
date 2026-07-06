import { prisma } from "../config/database.js";

export async function listAuditLogs(filters: {
  userId?: number;
  action?: string;
  entity?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) {
  const { userId, action, entity, startDate, endDate, page = 1, pageSize = 20 } = filters;

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entity) where.entity = entity;
  if (startDate || endDate) {
    const createdAt: Record<string, Date> = {};
    // 按服务器本地时区的日历日全天包含（startDate 00:00:00 ~ endDate 23:59:59.999），
    // 避免 new Date('YYYY-MM-DD') 解析为 UTC 零点导致当天日志被排除
    if (startDate) createdAt.gte = new Date(`${startDate}T00:00:00`);
    if (endDate) createdAt.lte = new Date(`${endDate}T23:59:59.999`);
    where.createdAt = createdAt;
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page, pageSize };
}
