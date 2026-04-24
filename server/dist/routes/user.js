"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const user_js_1 = require("../services/user.js");
const auth_js_1 = require("../middleware/auth.js");
const validator_js_1 = require("../middleware/validator.js");
const audit_js_1 = require("../middleware/audit.js");
const parseId_js_1 = require("../utils/parseId.js");
const router = (0, express_1.Router)();
const updateSchema = zod_1.z.object({
    role: zod_1.z.enum(["admin", "worker"]).optional(),
    department: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
});
router.get("/", auth_js_1.authGuard, (0, auth_js_1.roleGuard)("admin"), async (req, res, next) => {
    try {
        const result = await (0, user_js_1.listUsers)({
            keyword: req.query.keyword,
            role: req.query.role,
            page: parseInt(req.query.page) || 1,
            pageSize: parseInt(req.query.pageSize) || 20,
        });
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
router.put("/:id", auth_js_1.authGuard, (0, auth_js_1.roleGuard)("admin"), (0, audit_js_1.auditLog)("update", "user"), (0, validator_js_1.validate)(updateSchema), async (req, res, next) => {
    try {
        const user = await (0, user_js_1.updateUser)((0, parseId_js_1.parseId)(req.params.id), req.body);
        res.json(user);
    }
    catch (err) {
        next(err);
    }
});
router.delete("/:id", auth_js_1.authGuard, (0, auth_js_1.roleGuard)("admin"), async (req, res, next) => {
    try {
        const user = await (0, user_js_1.deactivateUser)((0, parseId_js_1.parseId)(req.params.id));
        res.json(user);
    }
    catch (err) {
        next(err);
    }
});
exports.userRoutes = router;
//# sourceMappingURL=user.js.map