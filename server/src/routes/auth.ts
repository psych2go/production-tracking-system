import { Router } from "express";
import { z } from "zod";
import { handleWwCallback, getMe, handlePasswordLogin } from "../services/auth.js";
import { authGuard, AuthRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validator.js";
import { auditLog } from "../middleware/audit.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { config } from "../config/index.js";

const router = Router();

const callbackSchema = z.object({
  code: z.string().min(1),
});

const passwordSchema = z.object({
  password: z.string().min(1),
});

const wwLoginLimiter = rateLimit({ windowMs: 60_000, max: 10 });
const passwordLoginLimiter = rateLimit({ windowMs: 60_000, max: 10 });
const devLoginLimiter = rateLimit({ windowMs: 60_000, max: 10 });

// WeChat Work OAuth callback
router.post("/ww/callback", wwLoginLimiter, auditLog("login", "auth"), validate(callbackSchema), async (req, res, next) => {
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

// Password login
router.post("/password-login", passwordLoginLimiter, auditLog("login", "auth"), validate(passwordSchema), async (req, res, next) => {
  try {
    const { token, user } = await handlePasswordLogin(req.body.password);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

if (config.nodeEnv === "development") {
  router.post("/dev-login", devLoginLimiter, async (_req, res, next) => {
    try {
      const { token, user } = await handleWwCallback("dev_code");
      res.json({ token, user });
    } catch (err) {
      next(err);
    }
  });
}

export const authRoutes = router;
