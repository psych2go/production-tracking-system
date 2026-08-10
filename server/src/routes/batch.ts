import { Router } from "express";
import { z } from "zod";
import { listBatches, getBatchDetail, createBatch, updateBatch, deleteBatch } from "../services/batch.js";
import { authGuard, roleGuard, AuthRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validator.js";
import { auditLog } from "../middleware/audit.js";
import { parseId } from "../utils/parseId.js";
import { parsePagination } from "../utils/pagination.js";
import {
  boundedQuery,
  isoDate,
  nullableText,
  optionalText,
  requiredText,
  TEXT_LIMITS,
} from "../utils/validation.js";

const router = Router();

// Product batch schema
const createProductSchema = z.object({
  batchNo: requiredText(TEXT_LIMITS.shortCode, "批号不能为空"),
  productModel: requiredText(TEXT_LIMITS.name, "产品型号不能为空"),
  quantity: z.number().int().positive("加工数量必须大于0"),
  packageType: requiredText(TEXT_LIMITS.packageType, "请选择封装形式"),
  customerCode: optionalText(TEXT_LIMITS.shortCode),
  orderNo: optionalText(TEXT_LIMITS.shortCode),
  customerDelivery: isoDate("客户要求交期").optional(),
  productionDelivery: isoDate("生产预计交期").optional(),
  priority: z.enum(["normal", "urgent"]).optional(),
  notes: optionalText(TEXT_LIMITS.notes),
});

const createSchema = createProductSchema;

const updateSchema = z.object({
  status: z.enum(["active", "completed", "archived"]).optional(),
  priority: z.enum(["normal", "urgent"]).optional(),
  batchNo: optionalText(TEXT_LIMITS.shortCode),
  productModel: optionalText(TEXT_LIMITS.name),
  quantity: z.number().int().min(0).optional(),
  customerCode: nullableText(TEXT_LIMITS.shortCode),
  orderNo: nullableText(TEXT_LIMITS.shortCode),
  packageType: nullableText(TEXT_LIMITS.packageType),
  customerDelivery: isoDate("客户要求交期").nullable().optional(),
  productionDelivery: isoDate("生产预计交期").nullable().optional(),
  notes: optionalText(TEXT_LIMITS.notes),
});

router.get("/", authGuard, async (req, res, next) => {
  try {
    const result = await listBatches({
      status: boundedQuery(req.query.status, "批次状态", 20),
      productId: req.query.productId ? parseId(req.query.productId as string) : undefined,
      keyword: boundedQuery(req.query.keyword, "搜索关键词"),
      customerCode: boundedQuery(req.query.customerCode, "客户代码"),
      packageType: boundedQuery(req.query.packageType, "封装形式", TEXT_LIMITS.packageType),
      ...parsePagination(req.query, { pageDefault: 1, pageSizeDefault: 50 }),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", authGuard, async (req, res, next) => {
  try {
    const batch = await getBatchDetail(parseId(req.params.id));
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

router.put("/:id", authGuard, roleGuard("admin"), auditLog("update", "batch"), validate(updateSchema), async (req, res, next) => {
  try {
    const batch = await updateBatch(parseId(req.params.id), req.body);
    res.json(batch);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", authGuard, roleGuard("admin"), auditLog("delete", "batch"), async (req: AuthRequest, res, next) => {
  try {
    await deleteBatch(parseId(req.params.id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export const batchRoutes = router;
