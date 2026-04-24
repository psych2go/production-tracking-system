"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = rateLimit;
const store = new Map();
// Periodic cleanup to prevent memory leak
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now > entry.resetAt)
            store.delete(key);
    }
}, 60_000).unref();
function rateLimit(options) {
    return (req, res, next) => {
        const key = req.ip ?? req.socket?.remoteAddress ?? "unknown";
        const now = Date.now();
        const entry = store.get(key);
        if (!entry || now > entry.resetAt) {
            store.set(key, { count: 1, resetAt: now + options.windowMs });
            next();
            return;
        }
        entry.count++;
        if (entry.count > options.max) {
            res.status(429).json({ error: "请求过于频繁，请稍后再试" });
            return;
        }
        next();
    };
}
//# sourceMappingURL=rateLimit.js.map