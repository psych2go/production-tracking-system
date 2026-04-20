"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const batch_js_1 = require("../services/batch.js");
const auth_js_1 = require("../middleware/auth.js");
const validator_js_1 = require("../middleware/validator.js");
const audit_js_1 = require("../middleware/audit.js");
const router = (0, express_1.Router)();
// Product batch schema
const createProductSchema = zod_1.z.object({
    batchType: zod_1.z.literal("product").optional().default("product"),
    batchNo: zod_1.z.string().min(1, "批号不能为空"),
    productModel: zod_1.z.string().min(1, "产品型号不能为空"),
    quantity: zod_1.z.number().int().positive("加工数量必须大于0"),
    packageType: zod_1.z.string().min(1, "请选择封装形式"),
    customerCode: zod_1.z.string().optional(),
    orderNo: zod_1.z.string().optional(),
    customerDelivery: zod_1.z.string().optional(),
    productionDelivery: zod_1.z.string().optional(),
    priority: zod_1.z.enum(["normal", "urgent"]).optional(),
    notes: zod_1.z.string().optional(),
});
// Trial batch schema
const createTrialSchema = zod_1.z.object({
    batchType: zod_1.z.literal("trial"),
    trialContent: zod_1.z.string().min(1, "试验内容不能为空"),
    quantity: zod_1.z.number().int().optional(),
    packageType: zod_1.z.string().optional(),
    customerDelivery: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
// Union: discriminate by batchType
const createSchema = zod_1.z.discriminatedUnion("batchType", [
    createProductSchema,
    createTrialSchema,
]);
const updateSchema = zod_1.z.object({
    status: zod_1.z.enum(["active", "completed", "archived"]).optional(),
    priority: zod_1.z.enum(["normal", "urgent"]).optional(),
    batchNo: zod_1.z.string().optional(),
    productModel: zod_1.z.string().optional(),
    quantity: zod_1.z.number().int().positive().optional(),
    trialContent: zod_1.z.string().optional(),
    customerCode: zod_1.z.string().nullable().optional(),
    orderNo: zod_1.z.string().nullable().optional(),
    packageType: zod_1.z.string().nullable().optional(),
    customerDelivery: zod_1.z.string().nullable().optional(),
    productionDelivery: zod_1.z.string().nullable().optional(),
    notes: zod_1.z.string().optional(),
});
router.get("/", auth_js_1.authGuard, async (req, res, next) => {
    try {
        const result = await (0, batch_js_1.listBatches)({
            status: req.query.status,
            productId: req.query.productId ? parseInt(req.query.productId) : undefined,
            keyword: req.query.keyword,
            customerCode: req.query.customerCode,
            packageType: req.query.packageType,
            batchType: req.query.batchType,
            page: parseInt(req.query.page) || 1,
            pageSize: parseInt(req.query.pageSize) || 20,
        });
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
router.get("/:id", auth_js_1.authGuard, async (req, res, next) => {
    try {
        const batch = await (0, batch_js_1.getBatchDetail)(parseInt(req.params.id));
        if (!batch) {
            res.status(404).json({ error: "批次不存在" });
            return;
        }
        res.json(batch);
    }
    catch (err) {
        next(err);
    }
});
router.post("/", auth_js_1.authGuard, (0, auth_js_1.roleGuard)("admin"), (0, audit_js_1.auditLog)("create", "batch"), (0, validator_js_1.validate)(createSchema), async (req, res, next) => {
    try {
        const batch = await (0, batch_js_1.createBatch)({ ...req.body, createdBy: req.user.id });
        res.status(201).json(batch);
    }
    catch (err) {
        next(err);
    }
});
router.put("/:id", auth_js_1.authGuard, (0, audit_js_1.auditLog)("update", "batch"), (0, validator_js_1.validate)(updateSchema), async (req, res, next) => {
    try {
        const batch = await (0, batch_js_1.updateBatch)(parseInt(req.params.id), req.body);
        res.json(batch);
    }
    catch (err) {
        next(err);
    }
});
exports.batchRoutes = router;
//# sourceMappingURL=batch.js.map