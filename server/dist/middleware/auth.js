"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authGuard = authGuard;
exports.roleGuard = roleGuard;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../config/index.js");
function authGuard(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "未提供认证令牌" });
        return;
    }
    const token = authHeader.slice(7);
    try {
        const decoded = jsonwebtoken_1.default.verify(token, index_js_1.config.jwt.secret);
        req.user = decoded;
        next();
    }
    catch {
        res.status(401).json({ error: "令牌无效或已过期" });
    }
}
function roleGuard(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: "未认证" });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: "权限不足" });
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map