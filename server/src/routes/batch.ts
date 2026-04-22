import { Router } from "express";
import { z } from "zod";
import { listBatches, getBatchDetail, createBatch, updateBatch } from "../services/batch.js";
import { authGuard, roleGuard, AuthRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validator.js";
import { auditLog } from "../middleware/audit.js";

const router = Router();

// Product batch schema
const createProductSchema = z.object({
  batchType: z.literal("product").optional().default("product"),
  batchNo: z.string().min(1, "批号不能为空"),
  productModel: z.string().min(1, "产品型号不能为空"),
  quantity: z.number().int().positive("加工数量必须大于0"),
  packageType: z.string().min(1, "请选择封装形式"),
  customerCode: z.string().optional(),
  orderNo: z.string().optional(),
  customerDelivery: z.string().optional(),
  productionDelivery: z.string().optional(),
  priority: z.enum(["normal", "urgent"]).optional(),
  notes: z.string().optional(),
});

// Trial batch schema
const createTrialSchema = z.object({
  batchType: z.literal("trial"),
  trialContent: z.string().min(1, "试验内容不能为空"),
  quantity: z.number().int().optional(),
  quantityDetail: z.string().optional(),
  packageType: z.string().optional(),
  customerDelivery: z.string().optional(),
  notes: z.string().optional(),
});

// Union: discriminate by batchType
const createSchema = z.discriminatedUnion("batchType", [
  createProductSchema,
  createTrialSchema,
]);

const updateSchema = z.object({
  status: z.enum(["active", "completed", "archived"]).optional(),
  priority: z.enum(["normal", "urgent"]).optional(),
  batchNo: z.string().optional(),
  productModel: z.string().optional(),
  quantity: z.number().int().min(0).optional(),
  quantityDetail: z.string().optional(),
  trialContent: z.string().optional(),
  customerCode: z.string().nullable().optional(),
  orderNo: z.string().nullable().optional(),
  packageType: z.string().nullable().optional(),
  customerDelivery: z.string().nullable().optional(),
  productionDelivery: z.string().nullable().optional(),
  notes: z.string().optional(),
});

router.get("/", authGuard, async (req, res, next) => {
  try {
    const result = await listBatches({
      status: req.query.status as string,
      productId: req.query.productId ? parseInt(req.query.productId as string) : undefined,
      keyword: req.query.keyword as string,
      customerCode: req.query.customerCode as string,
      packageType: req.query.packageType as string,
      batchType: req.query.batchType as string,
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

router.post("/", authGuard, roleGuard("admin"), auditLog("create", "batch"), validate(createSchema), async (req: AuthRequest, res, next) => {
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
