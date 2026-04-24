import { Router } from "express";
import { z } from "zod";
import { listProducts, createProduct, updateProduct, deleteProduct } from "../services/product.js";
import { authGuard, roleGuard } from "../middleware/auth.js";
import { validate } from "../middleware/validator.js";
import { parseId } from "../utils/parseId.js";

const router = Router();

const createSchema = z.object({
  model: z.string().min(1, "型号不能为空"),
  name: z.string().optional(),
  description: z.string().optional(),
});

const updateSchema = z.object({
  model: z.string().min(1).optional(),
  name: z.string().optional(),
  description: z.string().optional(),
});

router.get("/", authGuard, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const result = await listProducts(page);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/", authGuard, roleGuard("admin"), validate(createSchema), async (req, res, next) => {
  try {
    const product = await createProduct(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", authGuard, roleGuard("admin"), validate(updateSchema), async (req, res, next) => {
  try {
    const product = await updateProduct(parseId(req.params.id), req.body);
    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", authGuard, roleGuard("admin"), async (req, res, next) => {
  try {
    await deleteProduct(parseId(req.params.id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export const productRoutes = router;
