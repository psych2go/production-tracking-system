import { Router } from "express";
import { exportExcel } from "../services/statistics.js";
import { authGuard } from "../middleware/auth.js";

const router = Router();

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
