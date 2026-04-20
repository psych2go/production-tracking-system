"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProducts = listProducts;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
const database_js_1 = require("../config/database.js");
async function listProducts(page = 1, pageSize = 50) {
    const [items, total] = await Promise.all([
        database_js_1.prisma.product.findMany({
            where: { isActive: true },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        database_js_1.prisma.product.count({ where: { isActive: true } }),
    ]);
    return { items, total, page, pageSize };
}
async function createProduct(data) {
    return database_js_1.prisma.product.create({ data });
}
async function updateProduct(id, data) {
    return database_js_1.prisma.product.update({ where: { id }, data });
}
async function deleteProduct(id) {
    return database_js_1.prisma.product.update({ where: { id }, data: { isActive: false } });
}
//# sourceMappingURL=product.js.map