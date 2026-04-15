import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  wechatWork: {
    corpId: process.env.WW_CORP_ID || "",
    corpSecret: process.env.WW_CORP_SECRET || "",
  },
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  },
};
