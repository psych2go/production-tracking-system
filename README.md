# 生产进度追踪系统

面向制造业车间的生产进度追踪系统。工人通过手机（H5 / 微信小程序）实时录入工序进度，管理员统一管理产品和人员。

## 功能概览

- **首页仪表盘** — 在线产品总批次/总数量、试验总批次、批次延迟预警、最近动态
- **进度录入** — 按工序/封装形式筛选批次，点击工序确认流转
- **批次管理** — 创建/搜索/筛选批次（产品/试验双类型），新建与排单入口
- **排单** — 按工序排列批次加工顺序，支持上下移动调整
- **统计分析** — 工序耗时（柱状图）、产量趋势（折线图）、批次延迟预警、Excel 导出
- **产品管理** — 产品型号增删改（管理员）
- **用户管理** — 角色分配、启停用（管理员）
- **系统设置** — 工序动态增删改、封装形式管理（管理员）
- **操作审计** — 自动记录所有写操作，可查看筛选（管理员）
- **企业微信登录** — 生产环境对接企业微信 OAuth

## 技术栈

```
后端: Express 4 + TypeScript + Prisma 6 + SQLite
前端: uni-app 3 (Vue 3) + Pinia + SCSS
认证: JWT (7天) + 企业微信 OAuth
校验: Zod
图表: uCharts
导出: xlsx (Excel)
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm

### 1. 启动后端

```bash
cd server
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed
npm run dev
```

后端运行在 http://localhost:3000

### 2. 启动前端

```bash
cd client
npm install
npm run dev:h5
```

前端运行在 http://localhost:5173，API 请求自动代理到后端。

### 微信小程序开发

```bash
cd client
npm run dev:mp-weixin
```

生成的文件在 `dist/dev/mp-weixin`，用微信开发者工具打开即可。

### 开发登录

开发环境下，首页点击"登录"按钮即可使用管理员账号（`dev_admin`）登录，无需配置企业微信。

## 项目结构

```
server/               # 后端 API 服务
├── src/
│   ├── routes/       # API 路由（auth/user/product/batch/progress/statistics/settings/audit/schedule）
│   ├── services/     # 业务逻辑
│   ├── middleware/    # 认证、审计、校验、错误处理
│   └── config/       # 配置管理
└── prisma/
    ├── schema.prisma # 数据库模型（8 个）
    └── seed.ts       # 种子数据（15 道工序 + 22 种封装形式 + dev_admin）

client/               # 前端 uni-app 应用
├── src/
│   ├── pages/        # 主页面（首页/录入/批次/排单/统计/我的）
│   ├── pages-admin/  # 管理员页面（产品/用户/设置/封装形式/审计）
│   ├── components/   # 公共组件（StageTimeline/BatchCard/Charts）
│   ├── api/          # API 请求封装
│   ├── store/        # Pinia 状态管理
│   ├── utils/        # 常量与工具函数
│   └── styles/       # 全局样式
└── pages.json        # 路由与 TabBar 配置
```

## 角色与权限

| 操作 | admin | worker |
|------|:-----:|:------:|
| 进度录入 | ✅ | ✅ |
| 查看批次/进度 | ✅ | ✅ |
| 统计分析 | ✅ | ✅ |
| 创建批次 | ✅ | ❌ |
| 排单 | ✅ | ❌ |
| 产品增删改 | ✅ | ❌ |
| 删除产品 | ✅ | ❌ |
| 用户管理 | ✅ | ❌ |
| 系统设置 | ✅ | ❌ |
| 审计日志 | ✅ | ❌ |

## 数据模型

```
User ──< Batch (created_by)
User ──< ProgressRecord (operator_id)
User ──< AuditLog

Product ──< Batch

Batch ──< ProgressRecord
Batch ──< ScheduleOrder

ProcessStage ──< ProgressRecord
ProcessStage ──< ScheduleOrder

PackageType
```

| 模型 | 说明 |
|------|------|
| **User** | 系统用户，企业微信 ID 关联 |
| **Product** | 产品型号（model 唯一，新建批次时 upsert） |
| **Batch** | 生产批次（产品/试验双类型，自动/手动批号） |
| **ProcessStage** | 工序定义（15 道，可动态管理） |
| **ProgressRecord** | 工序流转记录（批次+工序唯一） |
| **PackageType** | 封装形式（22 种，管理员增删） |
| **AuditLog** | 操作审计日志 |
| **ScheduleOrder** | 排单记录（工序+批次唯一，记录加工顺序） |

## 工序流程

```
来料检验 → 减划 → 镜检 → 粘片 → 压焊 → 塑封 → 超扫 → 去溢料 → 切筋 → 电镀 → 打印 → 成型 → 外观检验 → 包装 → 已完成
  (质检)         (质检)                              (质检)                                                      (质检)                  (自动)
```

共 15 道工序（4 道质检关卡），可通过系统设置页面动态增删改。流转到包装时自动标记「已完成」并完成批次。

## 常用命令

```bash
# 后端
cd server
npm run dev              # 开发模式（热重载）
npm run db:studio        # Prisma Studio 数据库可视化
npm run db:reset         # 重置数据库并重新 seed
npm test                 # 运行 Vitest 集成测试

# 前端
cd client
npm run dev:h5           # H5 开发
npm run build:h5         # H5 生产构建
npm run dev:mp-weixin    # 微信小程序开发
npm run build:mp-weixin  # 微信小程序生产构建
```

## 环境变量

后端配置文件 `server/.env`：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `DATABASE_URL` | SQLite 数据库路径 | `file:./dev.db` |
| `JWT_SECRET` | JWT 签名密钥 | 需修改 |
| `JWT_EXPIRES_IN` | Token 有效期 | `7d` |
| `WW_CORP_ID` | 企业微信 CorpID | - |
| `WW_CORP_SECRET` | 企业微信 Secret | - |
| `CLIENT_URL` | 前端地址（CORS） | `http://localhost:5173` |

## 服务器部署

### 首次部署

```bash
# 1. 安装环境
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx
npm install -g pm2

# 2. 克隆项目
git clone https://github.com/psych2go/production-tracking-system.git /opt/pts

# 3. 后端
cd /opt/pts/server
npm install
npx prisma generate
npx prisma migrate deploy
sudo DATABASE_URL="file:./dev.db" npm run db:seed
nano .env                    # 编辑 .env 填入实际配置

# 4. 前端
cd /opt/pts/client
npm install
npm run build:h5

# 5. 启动后端
cd /opt/pts/server
pm2 start npm --name pts-api --cwd /opt/pts/server -- start
pm2 save
pm2 startup

# 6. 配置 Nginx
sudo nano /etc/nginx/sites-available/pts
```

Nginx 配置：

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
sudo nginx -t
sudo systemctl reload nginx

# 7. HTTPS（备案通过后）
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名.com -d www.你的域名.com
```

### 更新部署

```bash
cd /opt/pts
sudo git pull origin main

# 后端有改动
cd server && sudo npm run build && sudo pm2 restart pts-api

# 前端有改动
cd ../client && sudo npm run build:h5

# 数据库有改动（新增迁移）
cd server && sudo DATABASE_URL="file:./dev.db" npx prisma migrate deploy

# 依赖有改动
cd server && sudo npm install
cd ../client && sudo npm install
```

## License

Private - 内部使用
