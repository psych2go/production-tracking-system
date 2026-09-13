import { Router } from "express";
import { exportExcel, exportDeliveryCycleExcel, exportShipmentExcel, exportYieldExcel, getDeliveryCycleStats, getShipmentStats, getYieldStats } from "../services/statistics.js";
import { authGuard, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.get("/delivery-cycle", authGuard, async (req: AuthRequest, res, next) => {
  try {
    res.json(await getDeliveryCycleStats(String(req.query.start || ""), String(req.query.end || "")));
  } catch (err) {
    next(err);
  }
});

router.get("/delivery-cycle/export", authGuard, async (req: AuthRequest, res, next) => {
  try {
    const start = String(req.query.start || "");
    const end = String(req.query.end || "");
    const buffer = await exportDeliveryCycleExcel(start, end);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(`delivery_cycle_${start}_${end}`)}.xlsx`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

router.get("/shipment", authGuard, async (req: AuthRequest, res, next) => {
  try {
    const period = String(req.query.quarter || req.query.month || "");
    res.json(await getShipmentStats(period));
  } catch (err) {
    next(err);
  }
});

router.get("/shipment/export", authGuard, async (req: AuthRequest, res, next) => {
  try {
    const period = String(req.query.quarter || req.query.month || "");
    const buffer = await exportShipmentExcel(period);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(`shipment_${period}`)}.xlsx`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

router.get("/yield", authGuard, async (req: AuthRequest, res, next) => {
  try {
    const period = String(req.query.quarter || req.query.month || "");
    res.json(await getYieldStats(period));
  } catch (err) {
    next(err);
  }
});

router.get("/yield/export", authGuard, async (req: AuthRequest, res, next) => {
  try {
    const period = String(req.query.quarter || req.query.month || "");
    const buffer = await exportYieldExcel(period);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(`yield_${period}`)}.xlsx`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

router.get("/export/excel", authGuard, async (_req, res, next) => {
  try {
    const buffer = await exportExcel();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent("online_report")}.xlsx`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

export const statisticsRoutes = router;
