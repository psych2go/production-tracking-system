import { Router } from "express";
import { z } from "zod";
import { handleWwCallback, getMe } from "../services/auth.js";
import { authGuard, AuthRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validator.js";
import { auditLog } from "../middleware/audit.js";
import { config } from "../config/index.js";

const router = Router();

const callbackSchema = z.object({
  code: z.string().min(1),
});

// WeChat Work OAuth callback
router.post("/ww/callback", auditLog("login", "auth"), validate(callbackSchema), async (req, res, next) => {
  try {
    const { token, user } = await handleWwCallback(req.body.code);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

// Get current user
router.get("/me", authGuard, async (req: AuthRequest, res, next) => {
  try {
    const user = await getMe(req.user!.id);
    if (!user) {
      res.status(404).json({ error: "用户不存在" });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Dev login (development only)
router.post("/dev-login", async (_req, res, next) => {
  if (config.nodeEnv !== "development") {
    res.status(403).json({ error: "开发登录仅在开发环境可用" });
    return;
  }
  try {
    const { token, user } = await handleWwCallback("dev_code");
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

export const authRoutes = router;
