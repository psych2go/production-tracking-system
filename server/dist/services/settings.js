"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStage = createStage;
exports.updateStage = updateStage;
exports.deleteStage = deleteStage;
exports.listPackageTypes = listPackageTypes;
exports.createPackageType = createPackageType;
exports.deletePackageType = deletePackageType;
const database_js_1 = require("../config/database.js");
async function createStage(data) {
    return database_js_1.prisma.processStage.create({ data });
}
async function updateStage(id, data) {
    return database_js_1.prisma.processStage.update({ where: { id }, data });
}
async function deleteStage(id) {
    // Check for related records
    const progressCount = await database_js_1.prisma.progressRecord.count({ where: { stageId: id } });
    if (progressCount > 0) {
        throw new Error(`该工序已有 ${progressCount} 条进度记录，无法删除`);
    }
    return database_js_1.prisma.processStage.delete({ where: { id } });
}
// ===== Package Type CRUD =====
async function listPackageTypes() {
    return database_js_1.prisma.packageType.findMany({ orderBy: { sortOrder: "asc" } });
}
async function createPackageType(data) {
    return database_js_1.prisma.packageType.create({
        data: {
            name: data.name,
            category: data.category ?? "",
            sortOrder: data.sortOrder,
        },
    });
}
async function deletePackageType(id) {
    const pt = await database_js_1.prisma.packageType.findUnique({ where: { id } });
    if (!pt)
        throw new Error("封装形式不存在");
    const batchCount = await database_js_1.prisma.batch.count({ where: { packageType: pt.name } });
    if (batchCount > 0) {
        throw new Error(`该封装形式已有 ${batchCount} 个批次使用，无法删除`);
    }
    return database_js_1.prisma.packageType.delete({ where: { id } });
}
//# sourceMappingURL=settings.js.map