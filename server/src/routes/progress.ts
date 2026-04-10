import { Router } from "express";
import { z } from "zod";
import {
  upsertProgress,
  listProgress,
  getDashboardData,
  getStages,
  getStageProducts,
} from "../services/progress.js";
import { authGuard, AuthRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validator.js";
import { auditLog } from "../middleware/audit.js";

const router = Router();

const progressSchema = z.object({
  batchId: z.number().int().positive(),
  stageId: z.number().int().positive(),
  inputQuantity: z.number().int().min(0).optional(),
  outputQuantity: z.number().int().min(0).optional(),
  defectQuantity: z.number().int().min(0).optional(),
  defectType: z.string().optional(),
  defectNotes: z.string().optional(),
  status: z.enum(["completed", "in_progress"]).optional(),
  notes: z.string().optional(),
});

// Dashboard
router.get("/dashboard", authGuard, async (_req, res, next) => {
  try {
    const data = await getDashboardData();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// List process stages
router.get("/stages", authGuard, async (_req, res, next) => {
  try {
    const stages = await getStages();
    res.json(stages);
  } catch (err) {
    next(err);
  }
});

// Get products at a specific stage
router.get("/stages/:stageId/products", authGuard, async (req, res, next) => {
  try {
    const records = await getStageProducts(parseInt(req.params.stageId as string));
    res.json(records);
  } catch (err) {
    next(err);
  }
});

// List progress records
router.get("/", authGuard, async (req, res, next) => {
  try {
    const result = await listProgress({
      batchId: req.query.batchId ? parseInt(req.query.batchId as string) : undefined,
      stageId: req.query.stageId ? parseInt(req.query.stageId as string) : undefined,
      operatorId: req.query.operatorId ? parseInt(req.query.operatorId as string) : undefined,
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Create/update progress record
router.post("/", authGuard, auditLog("upsert", "progress"), validate(progressSchema), async (req: AuthRequest, res, next) => {
  try {
    const record = await upsertProgress({ ...req.body, operatorId: req.user!.id });
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

export const progressRoutes = router;
