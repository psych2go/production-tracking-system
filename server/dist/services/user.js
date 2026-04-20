"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsers = listUsers;
exports.updateUser = updateUser;
exports.deactivateUser = deactivateUser;
const database_js_1 = require("../config/database.js");
async function listUsers(filters) {
    const { keyword, role, page = 1, pageSize = 20 } = filters;
    const where = {};
    if (role)
        where.role = role;
    if (keyword) {
        where.OR = [
            { name: { contains: keyword } },
            { department: { contains: keyword } },
            { wwUserId: { contains: keyword } },
        ];
    }
    const [items, total] = await Promise.all([
        database_js_1.prisma.user.findMany({
            where,
            select: {
                id: true,
                wwUserId: true,
                name: true,
                department: true,
                role: true,
                avatarUrl: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        database_js_1.prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize };
}
async function updateUser(id, data) {
    return database_js_1.prisma.user.update({
        where: { id },
        data,
        select: {
            id: true,
            wwUserId: true,
            name: true,
            department: true,
            role: true,
            avatarUrl: true,
            isActive: true,
        },
    });
}
async function deactivateUser(id) {
    return database_js_1.prisma.user.update({
        where: { id },
        data: { isActive: false },
        select: {
            id: true,
            name: true,
            isActive: true,
        },
    });
}
//# sourceMappingURL=user.js.map