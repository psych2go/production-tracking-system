import { Router } from "express";
import {
  getProcessDurations,
  getProductionTrend,
  getAnomalies,
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

router.get("/export/excel", authGuard, async (req, res, next) => {
  try {
    const type = (req.query.type as string) || "yield";
    const buffer = await exportExcel({
      type,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${type}_report.xlsx`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

export const statisticsRoutes = router;
