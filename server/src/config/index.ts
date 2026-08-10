import dotenv from "dotenv";
import crypto from "crypto";
dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";
const jwtSecret = process.env.JWT_SECRET;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const insecureJwtSecrets = new Set([
  "dev-secret",
  "test-secret",
  "your-jwt-secret-change-in-production",
]);

if (nodeEnv === "production") {
  if (!jwtSecret || jwtSecret.length < 32 || insecureJwtSecrets.has(jwtSecret)) {
    throw new Error("生产环境 JWT_SECRET 必须设置为至少32位的非示例随机密钥");
  }
  if (!clientUrl.startsWith("https://")) {
    throw new Error("生产环境 CLIENT_URL 必须使用 https://");
  }
}

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  host: process.env.HOST || (nodeEnv === "production" ? "127.0.0.1" : "0.0.0.0"),
  nodeEnv,
  databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
  jwt: {
    secret: (() => {
      if (jwtSecret) return jwtSecret;
      console.warn("[WARN] JWT_SECRET 未设置，使用随机开发密钥（服务重启后所有已签发 token 将失效）");
      return crypto.randomBytes(32).toString("hex");
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  wechatWork: {
    corpId: process.env.WW_CORP_ID || "",
    corpSecret: process.env.WW_CORP_SECRET || "",
  },
  loginPassword: process.env.LOGIN_PASSWORD || "",
  cors: {
    origin: clientUrl,
  },
};
