import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.js";
import { prisma } from "../config/database.js";

export function auditLog(action: string, entity: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = (body as Record<string, unknown>)?.id
          ? Number((body as Record<string, unknown>).id)
          : req.params.id
            ? parseInt(req.params.id as string)
            : null;

        // Trim detail to avoid storing huge payloads
        const detailObj: Record<string, unknown> = {};
        if (req.body && typeof req.body === "object") {
          detailObj.body = req.body;
        }
        if (Object.keys(req.params).length > 0) {
          detailObj.params = req.params;
        }

        prisma.auditLog
          .create({
            data: {
              userId: req.user.id,
              action,
              entity,
              entityId: entityId && !isNaN(entityId) ? entityId : null,
              detail: Object.keys(detailObj).length > 0 ? JSON.stringify(detailObj) : null,
              ip: req.ip ?? req.socket?.remoteAddress ?? null,
            },
          })
          .catch((err: unknown) => console.error("Audit log error:", err));
      }
      return originalJson(body);
    };
    next();
  };
}
