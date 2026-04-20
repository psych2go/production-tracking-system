"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAuditLogs = listAuditLogs;
const database_js_1 = require("../config/database.js");
async function listAuditLogs(filters) {
    const { userId, action, entity, startDate, endDate, page = 1, pageSize = 20 } = filters;
    const where = {};
    if (userId)
        where.userId = userId;
    if (action)
        where.action = action;
    if (entity)
        where.entity = entity;
    if (startDate || endDate) {
        const createdAt = {};
        if (startDate)
            createdAt.gte = new Date(startDate);
        if (endDate)
            createdAt.lte = new Date(endDate);
        where.createdAt = createdAt;
    }
    const [items, total] = await Promise.all([
        database_js_1.prisma.auditLog.findMany({
            where,
            include: { user: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        database_js_1.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, pageSize };
}
//# sourceMappingURL=audit.js.map