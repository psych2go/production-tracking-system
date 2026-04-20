"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const index_js_1 = require("./config/index.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const index_js_2 = require("./routes/index.js");
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)({ origin: index_js_1.config.cors.origin, credentials: true }));
exports.app.use(express_1.default.json());
// API routes
exports.app.use("/api", index_js_2.routes);
// Health check
exports.app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// Error handler (must be last)
exports.app.use(errorHandler_js_1.errorHandler);
//# sourceMappingURL=app.js.map