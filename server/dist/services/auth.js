"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.handleWwCallback = handleWwCallback;
exports.getMe = getMe;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../config/index.js");
const database_js_1 = require("../config/database.js");
// Access token cache for WeChat Work API
let tokenCache = { token: "", expiresAt: 0 };
function generateToken(user) {
    return jsonwebtoken_1.default.sign(user, index_js_1.config.jwt.secret, { expiresIn: index_js_1.config.jwt.expiresIn });
}
async function getWwAccessToken() {
    if (tokenCache.token && Date.now() < tokenCache.expiresAt) {
        return tokenCache.token;
    }
    const { corpId, corpSecret } = index_js_1.config.wechatWork;
    if (!corpId || !corpSecret) {
        throw new Error("企业微信配置缺失，请设置 WW_CORP_ID 和 WW_CORP_SECRET");
    }
    const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${corpSecret}`;
    const res = await fetch(url);
    const data = (await res.json());
    if (!data.access_token) {
        throw new Error(`获取企业微信 access_token 失败: ${data.errmsg || "未知错误"}`);
    }
    tokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + 7000 * 1000, // Cache for ~2 hours minus margin
    };
    return data.access_token;
}
async function handleWwCallback(code) {
    // Development mode: use dev_code for testing
    if (index_js_1.config.nodeEnv === "development" && code === "dev_code") {
        const user = await database_js_1.prisma.user.upsert({
            where: { wwUserId: "dev_admin" },
            update: {},
            create: { wwUserId: "dev_admin", name: "开发管理员", role: "admin", department: "开发部" },
        });
        const token = generateToken({
            id: user.id,
            wwUserId: user.wwUserId,
            name: user.name,
            role: user.role,
        });
        return { token, user };
    }
    // Production: call WeChat Work API
    const accessToken = await getWwAccessToken();
    // Step 1: Exchange code for user identity
    const userUrl = `https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=${accessToken}&code=${code}`;
    const userRes = await fetch(userUrl);
    const userData = (await userRes.json());
    if (!userData.userid) {
        throw new Error(`企业微信认证失败: ${userData.errmsg || "code 无效或已过期"}`);
    }
    // Step 2: Get user details
    const detailUrl = `https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${accessToken}&userid=${userData.userid}`;
    const detailRes = await fetch(detailUrl);
    const detail = (await detailRes.json());
    if (detail.errcode && detail.errcode !== 0) {
        throw new Error(`获取企业微信用户信息失败: ${detail.errmsg || "未知错误"}`);
    }
    // Step 3: Upsert local user
    const user = await database_js_1.prisma.user.upsert({
        where: { wwUserId: userData.userid },
        update: {
            name: detail.name || userData.userid,
            avatarUrl: detail.avatar || null,
        },
        create: {
            wwUserId: userData.userid,
            name: detail.name || userData.userid,
            avatarUrl: detail.avatar || null,
            role: "worker",
            department: detail.department?.[0]?.toString() ?? null,
        },
    });
    const token = generateToken({
        id: user.id,
        wwUserId: user.wwUserId,
        name: user.name,
        role: user.role,
    });
    return { token, user };
}
async function getMe(userId) {
    return database_js_1.prisma.user.findUnique({ where: { id: userId } });
}
//# sourceMappingURL=auth.js.map