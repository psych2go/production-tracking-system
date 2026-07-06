import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}, 60_000).unref();

/**
 * 提取客户端 IP。app.ts 在生产设置了 trust proxy=1，req.ip 已由 Express 按
 * 受信代理解析为真实客户端 IP。注意：若 3000 端口被直接暴露（未置于反向代理后），
 * 攻击者仍可伪造 X-Forwarded-For 绕过限流——必须部署于反向代理（nginx 等）之后。
 */
function getClientIp(req: Request): string {
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

export function rateLimit(options: { windowMs: number; max: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = getClientIp(req);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    entry.count++;
    if (entry.count > options.max) {
      res.status(429).json({ error: "请求过于频繁，请稍后再试" });
      return;
    }
    next();
  };
}
