"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRoutes = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const audit_js_1 = require("../services/audit.js");
exports.auditRoutes = (0, express_1.Router)();
exports.auditRoutes.get("/logs", auth_js_1.authGuard, (0, auth_js_1.roleGuard)("admin"), async (req, res) => {
    try {
        const result = await (0, audit_js_1.listAuditLogs)({
            userId: req.query.userId ? parseInt(req.query.userId) : undefined,
            action: req.query.action || undefined,
            entity: req.query.entity || undefined,
            startDate: req.query.startDate || undefined,
            endDate: req.query.endDate || undefined,
            page: req.query.page ? parseInt(req.query.page) : 1,
            pageSize: req.query.pageSize ? parseInt(req.query.pageSize) : 20,
        });
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ error: e.message || "获取审计日志失败" });
    }
});
//# sourceMappingURL=audit.js.map