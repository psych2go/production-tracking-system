import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { prisma } from "../config/database.js";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    wwUserId: string;
    name: string;
    role: string;
  };
}

export async function authGuard(req: AuthRequest, res: Response, next: NextFunction) {
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
    // 实时校验用户状态与角色：防止停用/降级后旧 token 在过期前仍有效
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, wwUserId: true, name: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      res.status(401).json({ error: "用户不存在或已停用" });
      return;
    }
    req.user = { id: user.id, wwUserId: user.wwUserId, name: user.name, role: user.role };
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
