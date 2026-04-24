"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const client_1 = require("@prisma/client");
// Business logic errors use Chinese text — detect them by checking for CJK characters.
// This ensures user-facing messages pass through while internal errors get sanitized.
const HAS_CJK = /[一-鿿]/;
function errorHandler(err, _req, res, _next) {
    console.error(`[Error] ${err.message}`, err.stack);
    // Prisma unique constraint error
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const fields = err.meta?.target?.join(", ") || "字段";
        res.status(409).json({ error: `${fields}已存在，请使用其他值` });
        return;
    }
    // Prisma not found error
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        res.status(404).json({ error: "记录不存在" });
        return;
    }
    // User-facing business logic errors contain Chinese text.
    // Internal errors (TypeErrors, ReferenceErrors, etc.) are in English — sanitize those.
    if (err.message && HAS_CJK.test(err.message)) {
        res.status(400).json({ error: err.message });
        return;
    }
    res.status(500).json({ error: "服务器内部错误" });
}
//# sourceMappingURL=errorHandler.js.map