"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, _req, res, _next) {
    console.error(`[Error] ${err.message}`, err.stack);
    res.status(500).json({ error: "服务器内部错误", detail: err.message });
}
//# sourceMappingURL=errorHandler.js.map