"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = auditLog;
const database_js_1 = require("../config/database.js");
function auditLog(action, entity) {
    return (req, res, next) => {
        const originalJson = res.json.bind(res);
        let logged = false;
        const tryLog = (body) => {
            if (logged)
                return;
            logged = true;
            if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
                try {
                    const entityId = body?.id
                        ? Number(body.id)
                        : req.params.id
                            ? parseInt(req.params.id)
                            : null;
                    const detailObj = {};
                    if (Object.keys(req.params).length > 0) {
                        detailObj.params = req.params;
                    }
                    // Capture request body for create/update operations (excluding sensitive fields)
                    if (req.method === "POST" || req.method === "PUT") {
                        const { password, ...safeBody } = req.body;
                        if (Object.keys(safeBody).length > 0) {
                            detailObj.body = safeBody;
                        }
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
                catch {
                    // Audit failure should not break the response
                }
            }
        };
        res.json = function (body) {
            tryLog(body);
            return originalJson(body);
        };
        next();
    };
}
//# sourceMappingURL=audit.js.map