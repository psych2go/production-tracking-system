"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = auditLog;
const database_js_1 = require("../config/database.js");
function auditLog(action, entity) {
    return (req, res, next) => {
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
                const entityId = body?.id
                    ? Number(body.id)
                    : req.params.id
                        ? parseInt(req.params.id)
                        : null;
                // Trim detail to avoid storing huge payloads
                const detailObj = {};
                if (req.body && typeof req.body === "object") {
                    detailObj.body = req.body;
                }
                if (Object.keys(req.params).length > 0) {
                    detailObj.params = req.params;
                }
                database_js_1.prisma.auditLog
                    .create({
                    data: {
                        userId: req.user.id,
                        action,
                        entity,
                        entityId: entityId && !isNaN(entityId) ? entityId : null,
                        detail: Object.keys(detailObj).length > 0 ? JSON.stringify(detailObj) : null,
                        ip: req.ip ?? req.socket?.remoteAddress ?? null,
                    },
                })
                    .catch((err) => console.error("Audit log error:", err));
            }
            return originalJson(body);
        };
        next();
    };
}
//# sourceMappingURL=audit.js.map