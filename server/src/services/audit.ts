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
    // 使用 UTC 显式后缀（.000Z / .999Z），确保查询边界不受服务器时区影响
    if (startDate) createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
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
