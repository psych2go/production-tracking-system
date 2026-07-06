import dotenv from "dotenv";
import crypto from "crypto";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
  jwt: {
    secret: (() => {
      if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
      if (process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET 环境变量未设置，生产环境必须配置");
      }
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
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  },
};
