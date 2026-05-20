"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_js_1 = require("../config/database.js");
const auth_js_1 = require("../middleware/auth.js");
const parseId_js_1 = require("../utils/parseId.js");
const router = (0, express_1.Router)();
// Multer config: images only, max 10MB each, up to 9 files
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const dir = path_1.default.join(process.cwd(), "uploads", "trial-plans");
        fs_1.default.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        let ext = path_1.default.extname(file.originalname).toLowerCase();
        if (!ext) {
            const mimeMap = {
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
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 50 * 1024 * 1024, files: 9 },
    fileFilter: (_req, file, cb) => {
        const allowedExts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
        const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const mime = file.mimetype?.toLowerCase() || "";
        if (allowedExts.includes(ext) || allowedMimes.includes(mime)) {
            cb(null, true);
        }
        else {
            cb(new Error("仅支持图片文件（jpg/png/gif/webp）"));
        }
    },
});
// Upload attachments to a batch
router.post("/:id/attachments", auth_js_1.authGuard, (0, auth_js_1.roleGuard)("admin"), upload.array("files", 9), async (req, res, next) => {
    try {
        const batchId = (0, parseId_js_1.parseId)(req.params.id);
        const files = req.files;
        if (!files || files.length === 0) {
            res.status(400).json({ error: "请选择要上传的图片" });
            return;
        }
        // Verify batch exists
        const batch = await database_js_1.prisma.batch.findUnique({ where: { id: batchId } });
        if (!batch) {
            // Clean up uploaded files
            files.forEach((f) => fs_1.default.unlinkSync(f.path));
            res.status(404).json({ error: "批次不存在" });
            return;
        }
        const attachments = await Promise.all(files.map((f) => database_js_1.prisma.batchAttachment.create({
            data: {
                batchId,
                fileName: f.originalname,
                filePath: `/uploads/trial-plans/${f.filename}`,
                fileSize: f.size,
            },
        })));
        res.status(201).json(attachments);
    }
    catch (err) {
        next(err);
    }
});
// List attachments for a batch
router.get("/:id/attachments", auth_js_1.authGuard, async (req, res, next) => {
    try {
        const batchId = (0, parseId_js_1.parseId)(req.params.id);
        const attachments = await database_js_1.prisma.batchAttachment.findMany({
            where: { batchId },
            orderBy: { createdAt: "asc" },
        });
        res.json(attachments);
    }
    catch (err) {
        next(err);
    }
});
// Delete a single attachment
router.delete("/:id/attachments/:attachmentId", auth_js_1.authGuard, (0, auth_js_1.roleGuard)("admin"), async (req, res, next) => {
    try {
        const batchId = (0, parseId_js_1.parseId)(req.params.id);
        const attachmentId = (0, parseId_js_1.parseId)(req.params.attachmentId);
        const attachment = await database_js_1.prisma.batchAttachment.findUnique({
            where: { id: attachmentId },
        });
        if (!attachment || attachment.batchId !== batchId) {
            res.status(404).json({ error: "附件不存在" });
            return;
        }
        // Delete file from disk
        const fullPath = path_1.default.join(process.cwd(), attachment.filePath);
        if (fs_1.default.existsSync(fullPath)) {
            fs_1.default.unlinkSync(fullPath);
        }
        await database_js_1.prisma.batchAttachment.delete({ where: { id: attachmentId } });
        res.json({ success: true });
    }
    catch (err) {
        next(err);
    }
});
exports.uploadRoutes = router;
//# sourceMappingURL=upload.js.map