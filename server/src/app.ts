import express from "express";
import cors from "cors";
import { config } from "./config/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { routes } from "./routes/index.js";

export const app = express();

if (config.nodeEnv === "production") {
  app.set("trust proxy", 1);
}

app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json());

// API routes
app.use("/api", routes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);
