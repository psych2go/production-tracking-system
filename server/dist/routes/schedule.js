"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_js_1 = require("../middleware/auth.js");
const validator_js_1 = require("../middleware/validator.js");
const audit_js_1 = require("../middleware/audit.js");
const parseId_js_1 = require("../utils/parseId.js");
const schedule_js_1 = require("../services/schedule.js");
exports.scheduleRoutes = (0, express_1.Router)();
const reorderSchema = zod_1.z.object({
    batchId: zod_1.z.number().int().positive(),
    direction: zod_1.z.enum(["up", "down"]),
});
// GET /api/schedule/counts — batch counts for all stages
exports.scheduleRoutes.get("/counts", auth_js_1.authGuard, async (_req, res, next) => {
    try {
        const counts = await (0, schedule_js_1.getScheduleCounts)();
        res.json(counts);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/schedule/:stageId — view schedule queue
exports.scheduleRoutes.get("/:stageId", auth_js_1.authGuard, async (req, res, next) => {
    try {
        const stageId = (0, parseId_js_1.parseId)(req.params.stageId, "工序ID");
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
        const stageId = (0, parseId_js_1.parseId)(req.params.stageId, "工序ID");
        await (0, schedule_js_1.reorderSchedule)(stageId, req.body.batchId, req.body.direction);
        const queue = await (0, schedule_js_1.getScheduleQueue)(stageId);
        res.json(queue);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=schedule.js.map