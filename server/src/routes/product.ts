import { Router } from "express";
import { z } from "zod";
import { listProducts, createProduct, updateProduct, deleteProduct } from "../services/product.js";
import { authGuard, roleGuard, AuthRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validator.js";

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

router.post("/", authGuard, roleGuard("admin"), validate(createSchema), async (req: AuthRequest, res, next) => {
  try {
    const product = await createProduct(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", authGuard, roleGuard("admin"), validate(updateSchema), async (req: AuthRequest, res, next) => {
  try {
    const product = await updateProduct(parseInt(req.params.id as string), req.body);
    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", authGuard, roleGuard("admin"), async (req, res, next) => {
  try {
    await deleteProduct(parseInt(req.params.id as string));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export const productRoutes = router;
