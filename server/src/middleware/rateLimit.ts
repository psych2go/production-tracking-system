import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * 提取客户端 IP。生产环境仅信任回环代理，且 Node 只监听 127.0.0.1，
 * 因此只有本机 Nginx 提供的 X-Forwarded-For 会参与解析。
 */
function getClientIp(req: Request): string {
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

export function rateLimit(options: { windowMs: number; max: number }) {
  const store = new Map<string, RateLimitEntry>();

  // Each middleware instance owns an independent bucket.
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) store.delete(key);
    }
  }, 60_000).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = getClientIp(req);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
      const resetAt = now + options.windowMs;
      store.set(key, { count: 1, resetAt });
      setRateLimitHeaders(res, options.max, options.max - 1, resetAt, now);
      next();
      return;
    }

    entry.count++;
    const remaining = Math.max(0, options.max - entry.count);
    setRateLimitHeaders(res, options.max, remaining, entry.resetAt, now);

    if (entry.count > options.max) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))));
      res.status(429).json({ error: "请求过于频繁，请稍后再试" });
      return;
    }
    next();
  };
}

function setRateLimitHeaders(
  res: Response,
  limit: number,
  remaining: number,
  resetAt: number,
  now: number,
) {
  res.setHeader("RateLimit-Limit", String(limit));
  res.setHeader("RateLimit-Remaining", String(remaining));
  res.setHeader("RateLimit-Reset", String(Math.max(1, Math.ceil((resetAt - now) / 1000))));
}
