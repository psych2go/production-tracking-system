"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_js_1 = require("../middleware/auth.js");
const validator_js_1 = require("../middleware/validator.js");
const audit_js_1 = require("../middleware/audit.js");
const schedule_js_1 = require("../services/schedule.js");
exports.scheduleRoutes = (0, express_1.Router)();
const reorderSchema = zod_1.z.object({
    batchId: zod_1.z.number().int().positive(),
    direction: zod_1.z.enum(["up", "down"]),
});
// GET /api/schedule/:stageId — view schedule queue
exports.scheduleRoutes.get("/:stageId", auth_js_1.authGuard, async (req, res, next) => {
    try {
        const stageId = parseInt(req.params.stageId, 10);
        if (isNaN(stageId)) {
            res.status(400).json({ error: "无效的工序ID" });
            return;
        }
        const queue = await (0, schedule_js_1.getScheduleQueue)(stageId);
        res.json(queue);
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/schedule/:stageId/reorder — reorder batch (admin only)
exports.scheduleRoutes.put("/:stageId/reorder", auth_js_1.authGuard, (0, auth_js_1.roleGuard)("admin"), (0, audit_js_1.auditLog)("reorder", "schedule"), (0, validator_js_1.validate)(reorderSchema), async (req, res, next) => {
    try {
        const stageId = parseInt(req.params.stageId, 10);
        if (isNaN(stageId)) {
            res.status(400).json({ error: "无效的工序ID" });
            return;
        }
        await (0, schedule_js_1.reorderSchedule)(stageId, req.body.batchId, req.body.direction);
        const queue = await (0, schedule_js_1.getScheduleQueue)(stageId);
        res.json(queue);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=schedule.js.map