"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statisticsRoutes = void 0;
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../config/index.js");
const statistics_js_1 = require("../services/statistics.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.get("/durations", auth_js_1.authGuard, async (req, res, next) => {
    try {
        const data = await (0, statistics_js_1.getProcessDurations)({
            stageId: req.query.stageId ? parseInt(req.query.stageId) : undefined,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
        });
        res.json(data);
    }
    catch (err) {
        next(err);
    }
});
router.get("/production", auth_js_1.authGuard, async (req, res, next) => {
    try {
        const data = await (0, statistics_js_1.getProductionTrend)({
            groupBy: req.query.groupBy || "day",
            startDate: req.query.startDate,
            endDate: req.query.endDate,
        });
        res.json(data);
    }
    catch (err) {
        next(err);
    }
});
router.get("/anomalies", auth_js_1.authGuard, async (_req, res, next) => {
    try {
        const data = await (0, statistics_js_1.getAnomalies)();
        res.json(data);
    }
    catch (err) {
        next(err);
    }
});
router.get("/grouped", auth_js_1.authGuard, async (req, res, next) => {
    try {
        const groupBy = req.query.groupBy || "customerCode";
        if (groupBy !== "customerCode" && groupBy !== "packageType") {
            res.status(400).json({ error: "groupBy 必须为 customerCode 或 packageType" });
            return;
        }
        const data = await (0, statistics_js_1.getGroupedStatistics)({
            groupBy,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
        });
        res.json(data);
    }
    catch (err) {
        next(err);
    }
});
router.get("/export/excel", async (req, res, next) => {
    try {
        // Accept token via query param for file downloads (browsers can't set headers on direct downloads)
        const token = req.query.token || req.headers.authorization?.replace("Bearer ", "");
        if (!token) {
            res.status(401).json({ error: "未提供认证令牌" });
            return;
        }
        try {
            jsonwebtoken_1.default.verify(token, index_js_1.config.jwt.secret);
        }
        catch {
            res.status(401).json({ error: "认证令牌无效" });
            return;
        }
        const type = req.query.type || "durations";
        const buffer = await (0, statistics_js_1.exportExcel)({
            type,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
        });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(type)}_report.xlsx`);
        res.send(buffer);
    }
    catch (err) {
        next(err);
    }
});
exports.statisticsRoutes = router;
//# sourceMappingURL=statistics.js.map