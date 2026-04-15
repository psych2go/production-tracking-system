import { Router } from "express";
import { authRoutes } from "./auth.js";
import { userRoutes } from "./user.js";
import { productRoutes } from "./product.js";
import { batchRoutes } from "./batch.js";
import { progressRoutes } from "./progress.js";
import { statisticsRoutes } from "./statistics.js";
import { auditRoutes } from "./audit.js";
import { settingsRoutes } from "./settings.js";
import { scheduleRoutes } from "./schedule.js";

export const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/users", userRoutes);
routes.use("/products", productRoutes);
routes.use("/batches", batchRoutes);
routes.use("/progress", progressRoutes);
routes.use("/statistics", statisticsRoutes);
routes.use("/audit", auditRoutes);
routes.use("/settings", settingsRoutes);
routes.use("/schedule", scheduleRoutes);
