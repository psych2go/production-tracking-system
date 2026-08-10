const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const insecureSecrets = new Set([
  "dev-secret",
  "test-secret",
  "your-jwt-secret-change-in-production",
]);

function unwrapValue(value) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2
    && ((trimmed.startsWith('"') && trimmed.endsWith('"'))
      || (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function keyPattern(key) {
  return new RegExp(`^\\s*${key}\\s*=`);
}

function getValue(lines, key) {
  let value = "";
  for (const line of lines) {
    if (keyPattern(key).test(line)) {
      value = unwrapValue(line.slice(line.indexOf("=") + 1));
    }
  }
  return value;
}

function setValue(lines, key, value) {
  const remaining = lines.filter((line) => !keyPattern(key).test(line));
  remaining.push(`${key}=${value}`);
  return remaining;
}

function secureClientOrigin(value) {
  if (!value) {
    throw new Error("生产环境 CLIENT_URL 未配置，无法确定前端域名");
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("生产环境 CLIENT_URL 不是有效 URL");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "::1"
    || hostname === "[::1]"
  ) {
    throw new Error("生产环境 CLIENT_URL 不能使用 localhost");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("生产环境 CLIENT_URL 必须使用 http:// 或 https://");
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("生产环境 CLIENT_URL 必须是纯 origin，不能包含账号、路径、查询参数或锚点");
  }

  return `https://${url.host}`;
}

function prepareProductionEnv(envPath) {
  const examplePath = path.join(path.dirname(envPath), ".env.example");
  const fallbackExamplePath = path.resolve(".env.example");
  const sourcePath = fs.existsSync(envPath)
    ? envPath
    : fs.existsSync(examplePath)
      ? examplePath
      : fallbackExamplePath;
  let lines = fs.readFileSync(sourcePath, "utf8").split(/\r?\n/);

  const currentSecret = getValue(lines, "JWT_SECRET");
  const rotateSecret = currentSecret.length < 32 || insecureSecrets.has(currentSecret);
  const clientOrigin = secureClientOrigin(
    process.env.PRODUCTION_CLIENT_URL || getValue(lines, "CLIENT_URL"),
  );

  lines = setValue(
    lines,
    "JWT_SECRET",
    rotateSecret ? crypto.randomBytes(32).toString("hex") : currentSecret,
  );
  lines = setValue(lines, "NODE_ENV", "production");
  lines = setValue(lines, "HOST", "127.0.0.1");
  lines = setValue(lines, "CLIENT_URL", clientOrigin);

  const contents = `${lines.filter((line, index) => line || index < lines.length - 1).join("\n")}\n`;
  fs.writeFileSync(envPath, contents, { mode: 0o600 });
  fs.chmodSync(envPath, 0o600);

  console.log(`Production environment prepared for ${clientOrigin}`);
  if (rotateSecret) {
    console.log("JWT secret was rotated because the previous value was insecure");
  }
}

if (require.main === module) {
  const envPath = path.resolve(process.env.PRODUCTION_ENV_PATH || ".env");
  try {
    prepareProductionEnv(envPath);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = { prepareProductionEnv, secureClientOrigin };
