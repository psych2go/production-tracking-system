"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const product_js_1 = require("../services/product.js");
const auth_js_1 = require("../middleware/auth.js");
const validator_js_1 = require("../middleware/validator.js");
const router = (0, express_1.Router)();
const createSchema = zod_1.z.object({
    model: zod_1.z.string().min(1, "型号不能为空"),
    name: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
});
const updateSchema = zod_1.z.object({
    model: zod_1.z.string().min(1).optional(),
    name: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
});
router.get("/", auth_js_1.authGuard, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const result = await (0, product_js_1.listProducts)(page);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
router.post("/", auth_js_1.authGuard, (0, auth_js_1.roleGuard)("admin"), (0, validator_js_1.validate)(createSchema), async (req, res, next) => {
    try {
        const product = await (0, product_js_1.createProduct)(req.body);
        res.status(201).json(product);
    }
    catch (err) {
        next(err);
    }
});
router.put("/:id", auth_js_1.authGuard, (0, auth_js_1.roleGuard)("admin"), (0, validator_js_1.validate)(updateSchema), async (req, res, next) => {
    try {
        const product = await (0, product_js_1.updateProduct)(parseInt(req.params.id), req.body);
        res.json(product);
    }
    catch (err) {
        next(err);
    }
});
router.delete("/:id", auth_js_1.authGuard, (0, auth_js_1.roleGuard)("admin"), async (req, res, next) => {
    try {
        await (0, product_js_1.deleteProduct)(parseInt(req.params.id));
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
exports.productRoutes = router;
//# sourceMappingURL=product.js.map