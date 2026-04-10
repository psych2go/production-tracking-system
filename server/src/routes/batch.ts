import { Router } from "express";
import { z } from "zod";
import { listBatches, getBatchDetail, createBatch, updateBatch } from "../services/batch.js";
import { authGuard, roleGuard, AuthRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validator.js";
import { auditLog } from "../middleware/audit.js";

const router = Router();

const createSchema = z.object({
  batchNo: z.string().min(1, "批号不能为空"),
  productId: z.number().int().positive("请选择产品"),
  quantity: z.number().int().positive("加工数量必须大于0"),
  priority: z.enum(["normal", "urgent"]).optional(),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  status: z.enum(["active", "completed", "archived"]).optional(),
  priority: z.enum(["normal", "urgent"]).optional(),
  notes: z.string().optional(),
});

router.get("/", authGuard, async (req, res, next) => {
  try {
    const result = await listBatches({
      status: req.query.status as string,
      productId: req.query.productId ? parseInt(req.query.productId as string) : undefined,
      keyword: req.query.keyword as string,
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", authGuard, async (req, res, next) => {
  try {
    const batch = await getBatchDetail(parseInt(req.params.id as string));
    if (!batch) {
      res.status(404).json({ error: "批次不存在" });
      return;
    }
    res.json(batch);
  } catch (err) {
    next(err);
  }
});

router.post("/", authGuard, roleGuard("admin", "supervisor"), auditLog("create", "batch"), validate(createSchema), async (req: AuthRequest, res, next) => {
  try {
    const batch = await createBatch({ ...req.body, createdBy: req.user!.id });
    res.status(201).json(batch);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", authGuard, auditLog("update", "batch"), validate(updateSchema), async (req, res, next) => {
  try {
    const batch = await updateBatch(parseInt(req.params.id as string), req.body);
    res.json(batch);
  } catch (err) {
    next(err);
  }
});

export const batchRoutes = router;
