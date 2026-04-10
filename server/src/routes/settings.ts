import { Router } from "express";
import { z } from "zod";
import { authGuard, roleGuard } from "../middleware/auth.js";
import { validate } from "../middleware/validator.js";
import { auditLog } from "../middleware/audit.js";
import { getStages } from "../services/progress.js";
import { createStage, updateStage, deleteStage } from "../services/settings.js";

export const settingsRoutes = Router();

const createStageSchema = z.object({
  code: z.string().min(1, "工序代码不能为空"),
  name: z.string().min(1, "工序名称不能为空"),
  stageOrder: z.number().int().positive("排序号必须大于0"),
  isQcStage: z.boolean().optional(),
  description: z.string().optional(),
});

const updateStageSchema = z.object({
  name: z.string().min(1).optional(),
  stageOrder: z.number().int().positive().optional(),
  isQcStage: z.boolean().optional(),
  description: z.string().nullable().optional(),
});

// List stages (reuse existing)
settingsRoutes.get("/stages", authGuard, async (_req, res, next) => {
  try {
    const stages = await getStages();
    res.json(stages);
  } catch (err) {
    next(err);
  }
});

// Create stage
settingsRoutes.post(
  "/stages",
  authGuard,
  roleGuard("admin"),
  auditLog("create", "stage"),
  validate(createStageSchema),
  async (req, res, next) => {
    try {
      const stage = await createStage(req.body);
      res.status(201).json(stage);
    } catch (err) {
      next(err);
    }
  }
);

// Update stage
settingsRoutes.put(
  "/stages/:id",
  authGuard,
  roleGuard("admin"),
  auditLog("update", "stage"),
  validate(updateStageSchema),
  async (req, res, next) => {
    try {
      const stage = await updateStage(parseInt(req.params.id as string), req.body);
      res.json(stage);
    } catch (err) {
      next(err);
    }
  }
);

// Delete stage
settingsRoutes.delete(
  "/stages/:id",
  authGuard,
  roleGuard("admin"),
  auditLog("delete", "stage"),
  async (req, res, next) => {
    try {
      const stage = await deleteStage(parseInt(req.params.id as string));
      res.json(stage);
    } catch (err) {
      next(err);
    }
  }
);
