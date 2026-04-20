"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_js_1 = require("../services/auth.js");
const auth_js_2 = require("../middleware/auth.js");
const validator_js_1 = require("../middleware/validator.js");
const audit_js_1 = require("../middleware/audit.js");
const index_js_1 = require("../config/index.js");
const router = (0, express_1.Router)();
const callbackSchema = zod_1.z.object({
    code: zod_1.z.string().min(1),
});
// WeChat Work OAuth callback
router.post("/ww/callback", (0, audit_js_1.auditLog)("login", "auth"), (0, validator_js_1.validate)(callbackSchema), async (req, res, next) => {
    try {
        const { token, user } = await (0, auth_js_1.handleWwCallback)(req.body.code);
        res.json({ token, user });
    }
    catch (err) {
        next(err);
    }
});
// Get current user
router.get("/me", auth_js_2.authGuard, async (req, res, next) => {
    try {
        const user = await (0, auth_js_1.getMe)(req.user.id);
        if (!user) {
            res.status(404).json({ error: "用户不存在" });
            return;
        }
        res.json(user);
    }
    catch (err) {
        next(err);
    }
});
// Dev login (development only)
router.post("/dev-login", async (_req, res, next) => {
    if (index_js_1.config.nodeEnv !== "development") {
        res.status(403).json({ error: "开发登录仅在开发环境可用" });
        return;
    }
    try {
        const { token, user } = await (0, auth_js_1.handleWwCallback)("dev_code");
        res.json({ token, user });
    }
    catch (err) {
        next(err);
    }
});
exports.authRoutes = router;
//# sourceMappingURL=auth.js.map