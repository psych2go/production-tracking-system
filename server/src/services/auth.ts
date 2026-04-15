import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { prisma } from "../config/database.js";

// Access token cache for WeChat Work API
let tokenCache = { token: "", expiresAt: 0 };

export function generateToken(user: { id: number; wwUserId: string; name: string; role: string }) {
  return jwt.sign(user, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as jwt.SignOptions);
}

async function getWwAccessToken(): Promise<string> {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const { corpId, corpSecret } = config.wechatWork;
  if (!corpId || !corpSecret) {
    throw new Error("企业微信配置缺失，请设置 WW_CORP_ID 和 WW_CORP_SECRET");
  }

  const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${corpSecret}`;
  const res = await fetch(url);
  const data = (await res.json()) as { access_token?: string; errcode?: number; errmsg?: string };

  if (!data.access_token) {
    throw new Error(`获取企业微信 access_token 失败: ${data.errmsg || "未知错误"}`);
  }

  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + 7000 * 1000, // Cache for ~2 hours minus margin
  };
  return data.access_token;
}

export async function handleWwCallback(code: string) {
  // Development mode: use dev_code for testing
  if (config.nodeEnv === "development" && code === "dev_code") {
    const user = await prisma.user.upsert({
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
  const userData = (await userRes.json()) as { userid?: string; errcode?: number; errmsg?: string };

  if (!userData.userid) {
    throw new Error(`企业微信认证失败: ${userData.errmsg || "code 无效或已过期"}`);
  }

  // Step 2: Get user details
  const detailUrl = `https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${accessToken}&userid=${userData.userid}`;
  const detailRes = await fetch(detailUrl);
  const detail = (await detailRes.json()) as {
    name?: string;
    department?: number[];
    avatar?: string;
    errcode?: number;
    errmsg?: string;
  };

  if (detail.errcode && detail.errcode !== 0) {
    throw new Error(`获取企业微信用户信息失败: ${detail.errmsg || "未知错误"}`);
  }

  // Step 3: Upsert local user
  const user = await prisma.user.upsert({
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

export async function getMe(userId: number) {
  return prisma.user.findUnique({ where: { id: userId } });
}
