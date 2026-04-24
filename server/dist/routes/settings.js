"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_js_1 = require("../middleware/auth.js");
const validator_js_1 = require("../middleware/validator.js");
const audit_js_1 = require("../middleware/audit.js");
const parseId_js_1 = require("../utils/parseId.js");
const settings_js_1 = require("../services/settings.js");
exports.settingsRoutes = (0, express_1.Router)();
const createStageSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, "工序代码不能为空"),
    name: zod_1.z.string().min(1, "工序名称不能为空"),
    stageOrder: zod_1.z.number().int().positive("排序号必须大于0"),
    isQcStage: zod_1.z.boolean().optional(),
    description: zod_1.z.string().optional(),
});
const updateStageSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    stageOrder: zod_1.z.number().int().positive().optional(),
    isQcStage: zod_1.z.boolean().optional(),
    description: zod_1.z.string().nullable().optional(),
});
// Create stage
exports.settingsRoutes.post("/stages", auth_js_1.authGuard, (0, auth_js_1.roleGuard)("admin"), (0, audit_js_1.auditLog)("create", "stage"), (0, validator_js_1.validate)(createStageSchema), async (req, res, next) => {
    try {
        const stage = await (0, settings_js_1.createStage)(req.body);
        res.status(201).json(stage);
    }
    catch (err) {
        next(err);
    }
});
// Update stage
exports.settingsRoutes.put("/stages/:id", auth_js_1.authGuard, (0, auth_js_1.roleGuard)("admin"), (0, audit_js_1.auditLog)("update", "stage"), (0, validator_js_1.validate)(updateStageSchema), async (req, res, next) => {
    try {
        const stage = await (0, settings_js_1.updateStage)((0, parseId_js_1.parseId)(req.params.id), req.body);
        res.json(stage);
    }
    catch (err) {
        next(err);
    }
});
// Delete stage
exports.settingsRoutes.delete("/stages/:id", auth_js_1.authGuard, (0, auth_js_1.roleGuard)("admin"), (0, audit_js_1.auditLog)("delete", "stage"), async (req, res, next) => {
    try {
        const stage = await (0, settings_js_1.deleteStage)((0, parseId_js_1.parseId)(req.params.id));
        res.json(stage);
    }
    catch (err) {
        next(err);
    }
});
// ===== Package Type Routes =====
const createPackageTypeSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "封装形式名称不能为空"),
    category: zod_1.z.string().optional(),
    sortOrder: zod_1.z.number().int().optional(),
});
const updatePackageTypeSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "封装形式名称不能为空").optional(),
    category: zod_1.z.string().optional(),
    sortOrder: zod_1.z.number().int().optional(),
});
// List package types
exports.settingsRoutes.get("/package-types", auth_js_1.authGuard, async (_req, res, next) => {
    try {
        const types = await (0, settings_js_1.listPackageTypes)();
        res.json(types);
    }
    catch (err) {
        next(err);
    }
});
// Create package type
exports.settingsRoutes.post("/package-types", auth_js_1.authGuard, (0, auth_js_1.roleGuard)("admin"), (0, audit_js_1.auditLog)("create", "package_type"), (0, validator_js_1.validate)(createPackageTypeSchema), async (req, res, next) => {
    try {
        const pt = await (0, settings_js_1.createPackageType)(req.body);
        res.status(201).json(pt);
    }
    catch (err) {
        next(err);
    }
});
// Update package type
exports.settingsRoutes.put("/package-types/:id", auth_js_1.authGuard, (0, auth_js_1.roleGuard)("admin"), (0, audit_js_1.auditLog)("update", "package_type"), (0, validator_js_1.validate)(updatePackageTypeSchema), async (req, res, next) => {
    try {
        const pt = await (0, settings_js_1.updatePackageType)((0, parseId_js_1.parseId)(req.params.id), req.body);
        res.json(pt);
    }
    catch (err) {
        next(err);
    }
});
// Delete package type
exports.settingsRoutes.delete("/package-types/:id", auth_js_1.authGuard, (0, auth_js_1.roleGuard)("admin"), (0, audit_js_1.auditLog)("delete", "package_type"), async (req, res, next) => {
    try {
        const pt = await (0, settings_js_1.deletePackageType)((0, parseId_js_1.parseId)(req.params.id));
        res.json(pt);
    }
    catch (err) {
        next(err);
    }
});
// ===== Customer Code Routes =====
const createCustomerCodeSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, "客户代码不能为空"),
});
// List customer codes
exports.settingsRoutes.get("/customer-codes", auth_js_1.authGuard, async (_req, res, next) => {
    try {
        const codes = await (0, settings_js_1.listCustomerCodes)();
        res.json(codes);
    }
    catch (err) {
        next(err);
    }
});
// Create customer code
exports.settingsRoutes.post("/customer-codes", auth_js_1.authGuard, (0, auth_js_1.roleGuard)("admin"), (0, audit_js_1.auditLog)("create", "customer_code"), (0, validator_js_1.validate)(createCustomerCodeSchema), async (req, res, next) => {
    try {
        const cc = await (0, settings_js_1.createCustomerCode)(req.body);
        res.status(201).json(cc);
    }
    catch (err) {
        next(err);
    }
});
// Delete customer code
exports.settingsRoutes.delete("/customer-codes/:id", auth_js_1.authGuard, (0, auth_js_1.roleGuard)("admin"), (0, audit_js_1.auditLog)("delete", "customer_code"), async (req, res, next) => {
    try {
        const cc = await (0, settings_js_1.deleteCustomerCode)((0, parseId_js_1.parseId)(req.params.id));
        res.json(cc);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=settings.js.map