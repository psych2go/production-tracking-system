import { Router } from "express";
import { z } from "zod";
import { authGuard, roleGuard } from "../middleware/auth.js";
import { validate } from "../middleware/validator.js";
import { auditLog } from "../middleware/audit.js";
import { parseId } from "../utils/parseId.js";
import { getScheduleQueue, getScheduleCounts, reorderSchedule } from "../services/schedule.js";

export const scheduleRoutes = Router();

const reorderSchema = z.object({
  batchId: z.number().int().positive(),
  direction: z.enum(["up", "down"]),
});

// GET /api/schedule/counts — batch counts for all stages
scheduleRoutes.get("/counts", authGuard, async (_req, res, next) => {
  try {
    const counts = await getScheduleCounts();
    res.json(counts);
  } catch (err) {
    next(err);
  }
});

// GET /api/schedule/:stageId — view schedule queue
scheduleRoutes.get("/:stageId", authGuard, async (req, res, next) => {
  try {
    const stageId = parseId(req.params.stageId, "工序ID");
    const queue = await getScheduleQueue(stageId);
    res.json(queue);
  } catch (err) {
    next(err);
  }
});

// PUT /api/schedule/:stageId/reorder — reorder batch (admin only)
scheduleRoutes.put(
  "/:stageId/reorder",
  authGuard,
  roleGuard("admin"),
  auditLog("reorder", "schedule"),
  validate(reorderSchema),
  async (req, res, next) => {
    try {
      const stageId = parseId(req.params.stageId, "工序ID");
      await reorderSchedule(stageId, req.body.batchId, req.body.direction);
      const queue = await getScheduleQueue(stageId);
      res.json(queue);
    } catch (err) {
      next(err);
    }
  }
);
