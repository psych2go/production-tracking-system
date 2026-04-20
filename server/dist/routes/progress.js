"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const progress_js_1 = require("../services/progress.js");
const auth_js_1 = require("../middleware/auth.js");
const validator_js_1 = require("../middleware/validator.js");
const audit_js_1 = require("../middleware/audit.js");
const router = (0, express_1.Router)();
const progressSchema = zod_1.z.object({
    batchId: zod_1.z.number().int().positive(),
    stageId: zod_1.z.number().int().positive(),
    status: zod_1.z.enum(["completed", "in_progress"]).optional(),
    notes: zod_1.z.string().optional(),
});
// Dashboard
router.get("/dashboard", auth_js_1.authGuard, async (_req, res, next) => {
    try {
        const data = await (0, progress_js_1.getDashboardData)();
        res.json(data);
    }
    catch (err) {
        next(err);
    }
});
// List process stages
router.get("/stages", auth_js_1.authGuard, async (_req, res, next) => {
    try {
        const stages = await (0, progress_js_1.getStages)();
        res.json(stages);
    }
    catch (err) {
        next(err);
    }
});
// Get products at a specific stage
router.get("/stages/:stageId/products", auth_js_1.authGuard, async (req, res, next) => {
    try {
        const records = await (0, progress_js_1.getStageProducts)(parseInt(req.params.stageId));
        res.json(records);
    }
    catch (err) {
        next(err);
    }
});
// List progress records
router.get("/", auth_js_1.authGuard, async (req, res, next) => {
    try {
        const result = await (0, progress_js_1.listProgress)({
            batchId: req.query.batchId ? parseInt(req.query.batchId) : undefined,
            stageId: req.query.stageId ? parseInt(req.query.stageId) : undefined,
            operatorId: req.query.operatorId ? parseInt(req.query.operatorId) : undefined,
            page: parseInt(req.query.page) || 1,
            pageSize: parseInt(req.query.pageSize) || 20,
        });
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// Create/update progress record
router.post("/", auth_js_1.authGuard, (0, audit_js_1.auditLog)("upsert", "progress"), (0, validator_js_1.validate)(progressSchema), async (req, res, next) => {
    try {
        const record = await (0, progress_js_1.upsertProgress)({ ...req.body, operatorId: req.user.id });
        res.status(201).json(record);
    }
    catch (err) {
        next(err);
    }
});
exports.progressRoutes = router;
//# sourceMappingURL=progress.js.map