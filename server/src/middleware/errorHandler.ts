import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(`[Error] ${err.message}`, err.stack);

  // Prisma unique constraint error
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const fields = (err.meta?.target as string[])?.join(", ") || "字段";
    res.status(409).json({ error: `${fields}已存在，请使用其他值` });
    return;
  }

  // Prisma not found error
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    res.status(404).json({ error: "记录不存在" });
    return;
  }

  // User-facing errors (thrown with throw new Error("message"))
  // These are business logic errors, not internal errors
  if (err.message && !err.message.includes("Invalid") && !err.message.includes("invoke")) {
    // Check if this looks like a user-facing error
    const userFacingPatterns = ["已存在", "不能为空", "不存在", "请使用"];
    if (userFacingPatterns.some(p => err.message.includes(p))) {
      res.status(400).json({ error: err.message });
      return;
    }
  }

  res.status(500).json({ error: "服务器内部错误", detail: err.message });
}
