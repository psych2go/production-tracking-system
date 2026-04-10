import { Request, Response, NextFunction } from "express";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(`[Error] ${err.message}`, err.stack);
  res.status(500).json({ error: "服务器内部错误", detail: err.message });
}
