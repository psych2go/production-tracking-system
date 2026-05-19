import express from "express";
import path from "path";
import cors from "cors";
import { config } from "./config/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { routes } from "./routes/index.js";

export const app = express();

if (config.nodeEnv === "production") {
  app.set("trust proxy", 1);
}

app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: "10mb" }));

// Static file serving for uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// API routes
app.use("/api", routes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);
