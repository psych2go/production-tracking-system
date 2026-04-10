import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/auth.js";
import { listAuditLogs } from "../services/audit.js";

export const auditRoutes = Router();

auditRoutes.get("/logs", authGuard, roleGuard("admin"), async (req, res) => {
  try {
    const result = await listAuditLogs({
      userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
      action: (req.query.action as string) || undefined,
      entity: (req.query.entity as string) || undefined,
      startDate: (req.query.startDate as string) || undefined,
      endDate: (req.query.endDate as string) || undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
    });
    res.json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message || "获取审计日志失败" });
  }
});
