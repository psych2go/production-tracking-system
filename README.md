# 生产进度追踪系统

面向制造业车间的生产进度追踪系统。工人通过手机（H5 / 微信小程序）实时录入工序进度，管理员统一管理产品和人员。

## 功能

- **首页仪表盘** — 在线产品批次/数量、试验批次、延迟预警、最近动态
- **进度录入** — 按工序/封装形式筛选，点击工序确认流转
- **批次管理** — 创建/搜索/筛选（产品/试验双类型），管理员可编辑批次
- **排单** — 按工序排列批次加工顺序
- **统计分析** — 工序耗时、产量趋势、延迟预警、Excel 导出
- **系统管理** — 工序/封装形式/用户/产品管理，审计日志（管理员）

## 技术栈

Express 4 + TypeScript + Prisma 6 + SQLite | uni-app 3 (Vue 3) + Pinia + SCSS | JWT + 企业微信 OAuth | Zod | uCharts | xlsx

## 快速开始

**环境要求**: Node.js >= 20

```bash
# 后端 http://localhost:3000
cd server
npm install && cp .env.example .env
npx prisma migrate dev && npm run db:seed
npm run dev

# 前端 http://localhost:5173
cd client
npm install && npm run dev:h5
```

开发环境首页点击"登录"即可使用管理员账号。

### 密码保护

在 `.env` 中设置 `LOGIN_PASSWORD` 即可启用密码登录（无需企业微信）：

```bash
# server/.env
LOGIN_PASSWORD=your-password-here
```

启动后访问系统，输入密码即可登录。

### 常用命令

```bash
cd server
npm run dev              # 开发（热重载）
npm run db:studio        # 数据库可视化
npm run db:reset         # 重置数据库
npm test                 # 集成测试

cd client
npm run build:h5         # H5 生产构建
npm run dev:mp-weixin    # 微信小程序开发
```

## 项目结构

```
server/src/
  routes/       # API 路由（auth/user/product/batch/progress/statistics/settings/audit/schedule）
  services/     # 业务逻辑
  middleware/    # 认证、限流、审计、Zod 校验、错误处理
  utils/        # 工具函数（parseId）
  config/       # 配置与 Prisma 单例
server/tests/   # 集成测试（Vitest）
server/prisma/
  schema.prisma # 数据模型（9 个）
  seed.ts       # 16 道工序 + 27 种封装形式 + 13 个客户代码 + dev_admin
client/src/
  pages/        # 首页/录入/批次/排单/统计/我的
  pages-admin/  # 产品/用户/设置/封装形式/客户代码/审计
  components/   # StageTimeline/BatchCard/Charts
  api/ store/ utils/ styles/ types/
```

## 部署

### 首次部署

```bash
# 1. 环境
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx && npm install -g pm2

# 2. 克隆
git clone https://github.com/psych2go/production-tracking-system.git /opt/pts

# 3. 后端
cd /opt/pts/server && npm install
npx prisma generate && npx prisma migrate deploy
DATABASE_URL="file:./dev.db" npm run db:seed
cp .env.example .env && nano .env  # 填入实际配置
npm run build

# 4. 前端
cd /opt/pts/client && npm install && npm run build:h5

# 5. 启动
pm2 start npm --name pts --cwd /opt/pts/server -- start
pm2 save && pm2 startup

# 6. Nginx
```

Nginx 配置 `/etc/nginx/sites-available/pts`：

```nginx
server {
    listen 80;
    server_name 你的域名.com www.你的域名.com;

    location / {
        root /opt/pts/client/dist/build/h5;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/pts /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# HTTPS（备案后）
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名.com -d www.你的域名.com
```

### 自动部署（GitHub Actions）

已配置 `.github/workflows/deploy.yml`，push 到 main 分支自动部署前后端。

需在 GitHub 仓库 Settings → Secrets 添加：

| Secret | 值 |
|-------|---|
| `SERVER_HOST` | 服务器 IP |
| `SERVER_USER` | SSH 用户名 |
| `SERVER_SSH_KEY` | SSH 私钥 |

服务器端设置：
```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_actions  # 复制私钥到 GitHub Secrets
```

### 手动更新

```bash
cd /opt/pts && git pull origin main
cd server && npm install && npx prisma migrate deploy && npm run build && pm2 restart pts
cd ../client && npm install && npm run build:h5
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `DATABASE_URL` | SQLite 路径 | `file:./dev.db` |
| `JWT_SECRET` | JWT 密钥 | 需修改 |
| `JWT_EXPIRES_IN` | Token 有效期 | `7d` |
| `WW_CORP_ID` | 企业微信 CorpID | - |
| `WW_CORP_SECRET` | 企业微信 Secret | - |
| `CLIENT_URL` | 前端地址（CORS） | `http://localhost:5173` |
| `LOGIN_PASSWORD` | 密码登录密码 | 空（未设置则密码登录不可用） |

## License

Private - 内部使用
