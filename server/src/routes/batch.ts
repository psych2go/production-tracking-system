import { Router } from "express";
import { z } from "zod";
import {
  BATCH_STATUSES,
  cancelOrder,
  confirmBatchCard,
  createOrder,
  getBatchCounts,
  getBatchDetail,
  getProductSuggestions,
  listBatches,
  pauseBatch,
  resumeBatch,
  startBatchProduction,
  updateBatch,
} from "../services/batch.js";
import { authGuard, roleGuard, AuthRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validator.js";
import { auditLog } from "../middleware/audit.js";
import { parseId } from "../utils/parseId.js";
import { parsePagination } from "../utils/pagination.js";
import {
  boundedQuery,
  isoDate,
  optionalText,
  requiredText,
  TEXT_LIMITS,
} from "../utils/validation.js";

const router = Router();

const orderNoSchema = z.string()
  .min(1, "订单编号不能为空")
  .max(TEXT_LIMITS.shortCode, `订单编号不能超过${TEXT_LIMITS.shortCode}个字符`)
  .regex(/^\d+$/, "订单编号只能包含数字");

const createOrderSchema = z.object({
  productModel: requiredText(TEXT_LIMITS.name, "产品型号不能为空"),
  quantity: z.number().int("订单数量必须为整数").positive("订单数量必须大于0"),
  packageType: requiredText(TEXT_LIMITS.packageType, "请选择封装形式"),
  customerCode: requiredText(TEXT_LIMITS.shortCode, "请选择客户代码"),
  orderNo: orderNoSchema,
  customerDelivery: isoDate("客户要求交期").optional(),
  priority: z.enum(["normal", "urgent"]).optional(),
  notes: optionalText(TEXT_LIMITS.notes),
});

const confirmCardSchema = z.object({
  batchNo: requiredText(TEXT_LIMITS.shortCode, "生产批号不能为空"),
  productionDelivery: isoDate("生产预计交期").nullable().optional(),
  notes: optionalText(TEXT_LIMITS.notes),
});

const pauseSchema = z.object({
  reason: requiredText(TEXT_LIMITS.notes, "请填写暂停原因"),
});

const updateSchema = z.object({
  status: z.enum(BATCH_STATUSES).optional(),
  priority: z.enum(["normal", "urgent"]).optional(),
  batchNo: requiredText(TEXT_LIMITS.shortCode, "生产批号不能为空").optional(),
  productModel: requiredText(TEXT_LIMITS.name, "产品型号不能为空").optional(),
  quantity: z.number().int("订单数量必须为整数").positive("订单数量必须大于0").optional(),
  customerCode: requiredText(TEXT_LIMITS.shortCode, "请选择客户代码").optional(),
  orderNo: orderNoSchema.optional(),
  packageType: requiredText(TEXT_LIMITS.packageType, "请选择封装形式").optional(),
  customerDelivery: isoDate("客户要求交期").nullable().optional(),
  productionDelivery: isoDate("生产预计交期").nullable().optional(),
  notes: optionalText(TEXT_LIMITS.notes),
});

router.get("/counts", authGuard, async (req: AuthRequest, res, next) => {
  try {
    res.json(await getBatchCounts(req.user!.role));
  } catch (err) {
    next(err);
  }
});

router.get("/product-suggestions", authGuard, async (req, res, next) => {
  try {
    const keyword = boundedQuery(req.query.keyword, "产品型号") || "";
    res.json(await getProductSuggestions(keyword));
  } catch (err) {
    next(err);
  }
});

router.get("/", authGuard, async (req: AuthRequest, res, next) => {
  try {
    const result = await listBatches({
      status: boundedQuery(req.query.status, "生产状态", 20),
      productId: req.query.productId ? parseId(req.query.productId as string) : undefined,
      keyword: boundedQuery(req.query.keyword, "搜索关键词"),
      customerCode: boundedQuery(req.query.customerCode, "客户代码"),
      packageType: boundedQuery(req.query.packageType, "封装形式", TEXT_LIMITS.packageType),
      paused: req.query.paused === "true" ? true : req.query.paused === "false" ? false : undefined,
      role: req.user!.role,
      ...parsePagination(req.query, { pageDefault: 1, pageSizeDefault: 50 }),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", authGuard, async (req: AuthRequest, res, next) => {
  try {
    const batch = await getBatchDetail(parseId(req.params.id), req.user!.role);
    if (!batch) {
      res.status(404).json({ error: "生产任务不存在" });
      return;
    }
    res.json(batch);
  } catch (err) {
    next(err);
  }
});

router.post("/", authGuard, roleGuard("admin"), auditLog("create", "production"), validate(createOrderSchema), async (req: AuthRequest, res, next) => {
  try {
    const batch = await createOrder({ ...req.body, createdBy: req.user!.id });
    res.status(201).json(batch);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/confirm-card", authGuard, roleGuard("admin"), auditLog("confirm_card", "production"), validate(confirmCardSchema), async (req: AuthRequest, res, next) => {
  try {
    const batch = await confirmBatchCard(parseId(req.params.id), { ...req.body, operatorId: req.user!.id });
    res.json(batch);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/start-production", authGuard, roleGuard("admin"), auditLog("start", "production"), async (req: AuthRequest, res, next) => {
  try {
    res.json(await startBatchProduction(parseId(req.params.id), req.user!.id));
  } catch (err) {
    next(err);
  }
});

router.post("/:id/cancel", authGuard, roleGuard("admin"), auditLog("cancel", "production"), async (req: AuthRequest, res, next) => {
  try {
    res.json(await cancelOrder(parseId(req.params.id), req.user!.id));
  } catch (err) {
    next(err);
  }
});

// 暂停/恢复：管理员和工人都可操作（异常多由工人发现），全部留审计。
router.post("/:id/pause", authGuard, auditLog("pause", "production"), validate(pauseSchema), async (req: AuthRequest, res, next) => {
  try {
    res.json(await pauseBatch(parseId(req.params.id), req.body.reason, req.user!.id));
  } catch (err) {
    next(err);
  }
});

router.post("/:id/resume", authGuard, auditLog("resume", "production"), async (req: AuthRequest, res, next) => {
  try {
    res.json(await resumeBatch(parseId(req.params.id), req.user!.id));
  } catch (err) {
    next(err);
  }
});

router.put("/:id", authGuard, roleGuard("admin"), auditLog("update", "production"), validate(updateSchema), async (req, res, next) => {
  try {
    res.json(await updateBatch(parseId(req.params.id), req.body));
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", authGuard, roleGuard("admin"), (_req, res) => {
  res.status(405).json({ error: "生产任务不可直接删除，请使用取消订单" });
});

export const batchRoutes = router;
