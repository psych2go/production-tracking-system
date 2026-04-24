import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.js";
import { prisma } from "../config/database.js";

export function auditLog(action: string, entity: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    const tryLog = (body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        try {
          const entityId = (body as Record<string, unknown>)?.id
            ? Number((body as Record<string, unknown>).id)
            : req.params.id
              ? parseInt(req.params.id as string)
              : null;

          const detailObj: Record<string, unknown> = {};
          if (Object.keys(req.params).length > 0) {
            detailObj.params = req.params;
          }
          // Capture request body for create/update operations (excluding sensitive fields)
          if (req.method === "POST" || req.method === "PUT") {
            const { ...safeBody } = req.body as Record<string, unknown>;
            if (Object.keys(safeBody).length > 0) {
              detailObj.body = safeBody;
            }
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
        } catch {
          // Audit failure should not break the response
        }
      }
    };

    res.json = function (body: unknown) {
      tryLog(body);
      return originalJson(body);
    };

    // Fallback: also intercept res.send() for routes that don't use res.json()
    res.send = function (body: unknown) {
      tryLog(body);
      return originalSend(body);
    };

    next();
  };
}
