"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statisticsRoutes = void 0;
const express_1 = require("express");
const statistics_js_1 = require("../services/statistics.js");
const auth_js_1 = require("../middleware/auth.js");
const parseId_js_1 = require("../utils/parseId.js");
const router = (0, express_1.Router)();
router.get("/durations", auth_js_1.authGuard, async (req, res, next) => {
    try {
        const data = await (0, statistics_js_1.getProcessDurations)({
            stageId: req.query.stageId ? (0, parseId_js_1.parseId)(req.query.stageId) : undefined,
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
router.get("/export/excel", auth_js_1.authGuard, async (req, res, next) => {
    try {
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