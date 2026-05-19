import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../config/database.js";
import { authGuard, roleGuard } from "../middleware/auth.js";
import { parseId } from "../utils/parseId.js";

const router = Router();

// Multer config: images only, max 10MB each, up to 9 files
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), "uploads", "trial-plans");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext) {
      const mimeMap: Record<string, string> = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
      };
      ext = mimeMap[file.mimetype] || ".jpg";
    }
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 9 },
  fileFilter: (_req, file, cb) => {
    const allowedExts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype?.toLowerCase() || "";
    if (allowedExts.includes(ext) || allowedMimes.includes(mime)) {
      cb(null, true);
    } else {
      cb(new Error("仅支持图片文件（jpg/png/gif/webp）"));
    }
  },
});

// Upload attachments to a batch
router.post(
  "/:id/attachments",
  authGuard,
  roleGuard("admin"),
  upload.array("files", 9),
  async (req, res, next) => {
    try {
      const batchId = parseId(req.params.id);
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: "请选择要上传的图片" });
        return;
      }

      // Verify batch exists
      const batch = await prisma.batch.findUnique({ where: { id: batchId } });
      if (!batch) {
        // Clean up uploaded files
        files.forEach((f) => fs.unlinkSync(f.path));
        res.status(404).json({ error: "批次不存在" });
        return;
      }

      const attachments = await Promise.all(
        files.map((f) =>
          prisma.batchAttachment.create({
            data: {
              batchId,
              fileName: f.originalname,
              filePath: `/uploads/trial-plans/${f.filename}`,
              fileSize: f.size,
            },
          })
        )
      );

      res.status(201).json(attachments);
    } catch (err) {
      next(err);
    }
  }
);

// List attachments for a batch
router.get("/:id/attachments", authGuard, async (req, res, next) => {
  try {
    const batchId = parseId(req.params.id);
    const attachments = await prisma.batchAttachment.findMany({
      where: { batchId },
      orderBy: { createdAt: "asc" },
    });
    res.json(attachments);
  } catch (err) {
    next(err);
  }
});

// Delete a single attachment
router.delete(
  "/:id/attachments/:attachmentId",
  authGuard,
  roleGuard("admin"),
  async (req, res, next) => {
    try {
      const batchId = parseId(req.params.id);
      const attachmentId = parseId(req.params.attachmentId);

      const attachment = await prisma.batchAttachment.findUnique({
        where: { id: attachmentId },
      });
      if (!attachment || attachment.batchId !== batchId) {
        res.status(404).json({ error: "附件不存在" });
        return;
      }

      // Delete file from disk
      const fullPath = path.join(process.cwd(), attachment.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      await prisma.batchAttachment.delete({ where: { id: attachmentId } });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export const uploadRoutes = router;
