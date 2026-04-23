"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = auditLog;
const database_js_1 = require("../config/database.js");
function auditLog(action, entity) {
    return (req, res, next) => {
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);
        const tryLog = (body) => {
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
        // Fallback: also intercept res.send() for routes that don't use res.json()
        res.send = function (body) {
            tryLog(body);
            return originalSend(body);
        };
        next();
    };
}
//# sourceMappingURL=audit.js.map