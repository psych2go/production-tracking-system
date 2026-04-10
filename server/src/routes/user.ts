import { Router } from "express";
import { z } from "zod";
import { listUsers, updateUser, deactivateUser } from "../services/user.js";
import { authGuard, AuthRequest, roleGuard } from "../middleware/auth.js";
import { validate } from "../middleware/validator.js";
import { auditLog } from "../middleware/audit.js";

const router = Router();

const updateSchema = z.object({
  role: z.enum(["admin", "supervisor", "worker"]).optional(),
  department: z.string().optional(),
  isActive: z.boolean().optional(),
});

router.get("/", authGuard, roleGuard("admin"), async (req, res, next) => {
  try {
    const result = await listUsers({
      keyword: req.query.keyword as string | undefined,
      role: req.query.role as string | undefined,
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", authGuard, roleGuard("admin"), auditLog("update", "user"), validate(updateSchema), async (req, res, next) => {
  try {
    const user = await updateUser(parseInt(req.params.id as string), req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", authGuard, roleGuard("admin"), async (req, res, next) => {
  try {
    const user = await deactivateUser(parseInt(req.params.id as string));
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export const userRoutes = router;
