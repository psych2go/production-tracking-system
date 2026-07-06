import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/auth.js";
import { listAuditLogs } from "../services/audit.js";
import { parseId } from "../utils/parseId.js";
import { parsePagination } from "../utils/pagination.js";

export const auditRoutes = Router();

auditRoutes.get("/logs", authGuard, roleGuard("admin"), async (req, res, next) => {
  try {
    const result = await listAuditLogs({
      userId: req.query.userId ? parseId(req.query.userId as string) : undefined,
      action: req.query.action as string | undefined,
      entity: req.query.entity as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      ...parsePagination(req.query, { pageDefault: 1, pageSizeDefault: 20 }),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
