import { Router } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import {
  getProcessDurations,
  getProductionTrend,
  getAnomalies,
  getGroupedStatistics,
  exportExcel,
} from "../services/statistics.js";
import { authGuard } from "../middleware/auth.js";

const router = Router();

router.get("/durations", authGuard, async (req, res, next) => {
  try {
    const data = await getProcessDurations({
      stageId: req.query.stageId ? parseInt(req.query.stageId as string) : undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/production", authGuard, async (req, res, next) => {
  try {
    const data = await getProductionTrend({
      groupBy: (req.query.groupBy as string) || "day",
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/anomalies", authGuard, async (_req, res, next) => {
  try {
    const data = await getAnomalies();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/grouped", authGuard, async (req, res, next) => {
  try {
    const groupBy = (req.query.groupBy as string) || "customerCode";
    if (groupBy !== "customerCode" && groupBy !== "packageType") {
      res.status(400).json({ error: "groupBy 必须为 customerCode 或 packageType" });
      return;
    }
    const data = await getGroupedStatistics({
      groupBy,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/export/excel", async (req, res, next) => {
  try {
    // Accept token via query param for file downloads (browsers can't set headers on direct downloads)
    const token = req.query.token as string || req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      res.status(401).json({ error: "未提供认证令牌" });
      return;
    }
    try {
      jwt.verify(token, config.jwt.secret);
    } catch {
      res.status(401).json({ error: "认证令牌无效" });
      return;
    }

    const type = (req.query.type as string) || "durations";
    const buffer = await exportExcel({
      type,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(type)}_report.xlsx`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

export const statisticsRoutes = router;
