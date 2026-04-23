"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStage = createStage;
exports.updateStage = updateStage;
exports.deleteStage = deleteStage;
exports.listPackageTypes = listPackageTypes;
exports.createPackageType = createPackageType;
exports.deletePackageType = deletePackageType;
exports.listCustomerCodes = listCustomerCodes;
exports.createCustomerCode = createCustomerCode;
exports.deleteCustomerCode = deleteCustomerCode;
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
// ===== Customer Code CRUD =====
async function listCustomerCodes() {
    return database_js_1.prisma.customerCode.findMany({ orderBy: { code: "asc" } });
}
async function createCustomerCode(data) {
    return database_js_1.prisma.customerCode.create({ data: { code: data.code } });
}
async function deleteCustomerCode(id) {
    const cc = await database_js_1.prisma.customerCode.findUnique({ where: { id } });
    if (!cc)
        throw new Error("客户代码不存在");
    const batchCount = await database_js_1.prisma.batch.count({ where: { customerCode: cc.code } });
    if (batchCount > 0) {
        throw new Error(`该客户代码已有 ${batchCount} 个批次使用，无法删除`);
    }
    return database_js_1.prisma.customerCode.delete({ where: { id } });
}
//# sourceMappingURL=settings.js.map