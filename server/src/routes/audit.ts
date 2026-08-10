import { Router } from "express";
import { authGuard, roleGuard } from "../middleware/auth.js";
import { listAuditLogs } from "../services/audit.js";
import { parseId } from "../utils/parseId.js";
import { parsePagination } from "../utils/pagination.js";
import { boundedQuery, dateQuery } from "../utils/validation.js";

export const auditRoutes = Router();

auditRoutes.get("/logs", authGuard, roleGuard("admin"), async (req, res, next) => {
  try {
    const result = await listAuditLogs({
      userId: req.query.userId ? parseId(req.query.userId as string) : undefined,
      action: boundedQuery(req.query.action, "操作类型", 50),
      entity: boundedQuery(req.query.entity, "实体类型", 50),
      startDate: dateQuery(req.query.startDate, "开始日期"),
      endDate: dateQuery(req.query.endDate, "结束日期"),
      ...parsePagination(req.query, { pageDefault: 1, pageSizeDefault: 20 }),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
