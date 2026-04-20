"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
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
//# sourceMappingURL=index.js.map