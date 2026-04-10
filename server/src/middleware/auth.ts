import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    wwUserId: string;
    name: string;
    role: string;
  };
}

export function authGuard(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "未提供认证令牌" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      id: number;
      wwUserId: string;
      name: string;
      role: string;
    };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "令牌无效或已过期" });
  }
}

export function roleGuard(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "未认证" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "权限不足" });
      return;
    }
    next();
  };
}
