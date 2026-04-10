# 生产进度追踪系统 (Production Tracking System)

制造业车间生产进度追踪应用，支持 H5 和微信小程序。目标用户：车间工人（录入进度）、班组长（管理批次）、管理员（系统管理）。

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 | Express 4 + TypeScript + Prisma 6 + SQLite |
| 前端 | uni-app 3 (Vue 3) + Pinia + SCSS |
| 认证 | JWT (7天) + 企业微信 OAuth |
| 校验 | Zod (后端) |
| 图表 | uCharts |
| 导出 | xlsx (Excel) |
| 平台 | H5 (Web) + 微信小程序 |

## 项目结构

```
production-tracking-system/
├── server/                     # 后端 API
│   ├── src/
│   │   ├── config/index.ts     # 配置（端口、JWT、企微、CORS）
│   │   ├── app.ts              # Express 应用 setup
│   │   ├── server.ts           # 入口，启动监听
│   │   ├── middleware/
│   │   │   ├── auth.ts         # authGuard + roleGuard
│   │   │   ├── audit.ts        # 操作审计日志中间件
│   │   │   ├── validator.ts    # Zod 校验中间件
│   │   │   └── errorHandler.ts # 全局错误处理
│   │   ├── routes/
│   │   │   ├── index.ts        # 路由聚合
│   │   │   ├── auth.ts         # /api/auth
│   │   │   ├── user.ts         # /api/users
│   │   │   ├── product.ts      # /api/products
│   │   │   ├── batch.ts        # /api/batches
│   │   │   ├── progress.ts     # /api/progress
│   │   │   ├── statistics.ts   # /api/statistics
│   │   │   ├── settings.ts     # /api/settings
│   │   │   └── audit.ts        # /api/audit
│   │   └── services/
│   │       ├── auth.ts         # 认证 + 企业微信 API 对接
│   │       ├── user.ts
│   │       ├── product.ts
│   │       ├── batch.ts
│   │       ├── progress.ts     # 含 dashboard 数据
│   │       ├── statistics.ts   # 耗时/趋势/异常/Excel导出
│   │       ├── settings.ts     # 工序 CRUD
│   │       └── audit.ts        # 审计日志查询
│   └── prisma/
│       ├── schema.prisma       # 5 个模型
│       ├── seed.ts             # 12 道工序 + dev_admin
│       └── dev.db
├── client/                     # 前端 uni-app
│   ├── src/
│   │   ├── api/
│   │   │   ├── index.ts        # uni.request 封装 + token 注入
│   │   │   └── modules.ts      # 各模块 API 函数
│   │   ├── store/
│   │   │   ├── user.ts         # 认证状态、token 持久化
│   │   │   └── app.ts          # 工序缓存、工具函数
│   │   ├── components/
│   │   │   ├── StageTimeline.vue  # 工序进度时间线
│   │   │   ├── BatchCard.vue      # 批次列表卡片（动态工序数）
│   │   │   └── Charts.vue         # uCharts 封装组件
│   │   ├── pages/              # 主页面 (tabBar)
│   │   │   ├── index/          # 首页仪表盘
│   │   │   ├── progress/       # 进度录入 + 历史
│   │   │   ├── batch/          # 批次管理 (列表/详情/新建)
│   │   │   ├── stats/          # 统计分析（耗时/产量/预警+Excel导出）
│   │   │   └── profile/        # 个人中心（管理入口）
│   │   ├── pages-admin/        # 管理员子包
│   │   │   ├── users/          # 用户管理
│   │   │   ├── products/       # 产品管理
│   │   │   ├── settings/       # 系统设置（工序管理）
│   │   │   └── audit/          # 审计日志
│   │   ├── styles/
│   │   │   ├── uni.scss        # SCSS 变量
│   │   │   └── global.scss     # 全局工具类
│   │   └── types/
│   │       ├── index.d.ts      # TypeScript 类型定义
│   │       └── ucharts.d.ts    # uCharts 模块声明
│   ├── vite.config.ts          # 代理 /api → localhost:3000
│   └── pages.json              # 路由 + tabBar 配置
└── CLAUDE.md                   # 本文件
```

## 开发环境

### 环境要求

- Node.js >= 18
- npm

### 启动后端

```bash
cd server
npm install
cp .env.example .env        # 首次需要
npx prisma migrate dev      # 初始化数据库
npm run db:seed             # 种子数据（12道工序 + dev_admin）
npm run dev                 # http://localhost:3000
```

### 启动前端

```bash
cd client
npm install
npm run dev:h5              # H5 开发模式 http://localhost:5173
# 或微信小程序
npm run dev:mp-weixin       # 生成到 dist/dev/mp-weixin
```

### 其他命令

```bash
# 后端
cd server
npm run db:studio           # Prisma Studio 可视化数据库
npm run db:reset            # 重置数据库

# 前端
cd client
npm run build:h5            # H5 生产构建
npm run build:mp-weixin     # 小程序生产构建
```

## 架构设计

### 后端三层架构

```
Route (参数校验 Zod + 鉴权 + 审计日志) → Service (业务逻辑) → Prisma (数据库)
```

- **Route**: 定义端点，挂载 authGuard / roleGuard / validate / auditLog 中间件
- **Service**: 纯业务逻辑，接收已校验参数，操作数据库，返回结果
- **Prisma**: 数据访问层，通过 `@prisma/client` 操作 SQLite

### 前端数据流

```
Page → API Module → uni.request (自动注入 token) → 后端
  ↕
Pinia Store (缓存/状态)
```

### 认证流程

1. 开发环境：`POST /api/auth/dev-login` 返回 JWT（dev_admin 用户）
2. 生产环境：企业微信授权回调 `POST /api/auth/ww/callback`
   - 用 code 调用企微 API 获取 userid（access_token 带缓存）
   - 获取用户详情（姓名、部门、头像）
   - 本地 upsert 用户 → 签发 JWT
3. 前端 `api/index.ts` 自动在请求头注入 `Bearer {token}`
4. 后端 `authGuard` 中间件验证 JWT，将用户信息挂到 `req.user`
5. 401 响应自动触发前端登出跳转

### 角色体系

| 角色 | 权限 |
|------|------|
| `admin` | 全部权限：用户管理、产品管理、批次管理、系统设置、审计日志 |
| `supervisor` | 产品管理（增删改）、批次管理（增删改）、进度录入、统计分析 |
| `worker` | 进度录入、查看自己负责的记录 |

## 代码约定

### 命名规范

| 类型 | 风格 | 示例 |
|------|------|------|
| 文件/目录 | kebab-case | `batch-detail.vue`, `errorHandler.ts` |
| TypeScript 变量/函数 | camelCase | `getBatchDetail`, `batchNo` |
| 数据库字段 | snake_case | `batch_no`, `created_at` |
| Prisma 字段映射 | camelCase + `@map` | `batchNo @map("batch_no")` |
| API 路径 | kebab-case | `/api/progress` |
| Vue 组件 | PascalCase | `StageTimeline.vue` |
| 常量 | UPPER_SNAKE | `DATABASE_URL` |

### API 响应格式

```typescript
// 成功 - 直接返回数据
{ id: 1, batchNo: "B20250401-001", ... }

// 分页
{ items: T[], total: number, page: number, pageSize: number }

// 校验错误 (400)
{ error: "参数验证失败", details: [{ field: "batchNo", message: "必填" }] }

// 认证错误 (401)
{ error: "未提供认证令牌" }

// 权限错误 (403)
{ error: "权限不足" }

// 服务器错误 (500)
{ error: "服务器内部错误", detail: "message" }
```

### 错误处理

- 后端路由使用 try-catch，异常传给 `next()` 由全局 `errorHandler` 处理
- 前端 `api/index.ts` 统一处理：401 自动登出，其他错误显示 `uni.showToast`
- 所有面向用户的消息使用中文

### 校验模式

后端使用 Zod schema，在路由层通过 `validate(schema)` 中间件执行：

```typescript
const createBatchSchema = z.object({
  batchNo: z.string().min(1, "批次号不能为空"),
  productId: z.number().int().positive("产品ID无效"),
  quantity: z.number().int().positive("数量必须大于0"),
  priority: z.enum(["normal", "urgent"]).optional(),
  notes: z.string().optional(),
});
```

### 审计日志

使用 `auditLog(action, entity)` 中间件自动记录写操作。中间件拦截 `res.json`，在响应成功后异步写入审计日志。

### 前端样式

- 颜色变量定义在 `client/src/styles/uni.scss`：Primary `#0083ff`、Success `#07c160`、Warning `#ff9900`、Danger `#fa5151`
- 使用 `rpx` 响应式单位（750rpx = 屏幕宽度）
- 全局工具类在 `client/src/styles/global.scss`：`.container`、`.card`、`.text-primary` 等
- 页面组件使用 `<style lang="scss" scoped>`

## API 端点一览

### 认证 `/api/auth`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/auth/ww/callback` | 企业微信回调（真实 API 对接） | 无 |
| POST | `/auth/dev-login` | 开发登录 | 无 |
| GET | `/auth/me` | 当前用户信息 | 需认证 |

### 用户 `/api/users`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/users` | 用户列表（搜索/筛选/分页） | admin |
| PUT | `/users/:id` | 更新用户角色/部门/状态 | admin |
| DELETE | `/users/:id` | 停用用户 | admin |

### 产品 `/api/products`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/products` | 产品列表（分页） | 全部角色 |
| POST | `/products` | 创建产品 | admin, supervisor |
| PUT | `/products/:id` | 更新产品 | admin, supervisor |
| DELETE | `/products/:id` | 删除产品（软删除） | admin |

### 批次 `/api/batches`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/batches` | 批次列表（支持筛选/搜索/分页） | 全部角色 |
| GET | `/batches/:id` | 批次详情（含进度记录） | 全部角色 |
| POST | `/batches` | 创建批次 | admin, supervisor |
| PUT | `/batches/:id` | 更新批次状态/优先级/备注 | 全部角色 |

### 进度 `/api/progress`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/progress/dashboard` | 仪表盘数据（含异常预警） | 全部角色 |
| GET | `/progress/stages` | 工序列表 | 全部角色 |
| GET | `/progress/stages/:stageId/products` | 工序下的产品 | 全部角色 |
| GET | `/progress` | 进度记录（筛选/分页） | 全部角色 |
| POST | `/progress` | 创建/更新进度记录 | 全部角色 |

### 统计 `/api/statistics`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/statistics/durations` | 工序耗时统计 | 需认证 |
| GET | `/statistics/production` | 产量趋势（日/周/月） | 需认证 |
| GET | `/statistics/anomalies` | 批次延迟预警 | 需认证 |
| GET | `/statistics/export/excel` | Excel 导出 | 需认证 |

### 设置 `/api/settings`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/settings/stages` | 工序列表 | 需认证 |
| POST | `/settings/stages` | 新增工序 | admin |
| PUT | `/settings/stages/:id` | 修改工序 | admin |
| DELETE | `/settings/stages/:id` | 删除工序（检查关联） | admin |

### 审计 `/api/audit`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/audit/logs` | 审计日志（多维筛选/分页） | admin |

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 服务健康状态 |

## 数据库模型

```
User ──< Batch (created_by)
User ──< ProgressRecord (operator_id)
User ──< AuditLog

Product ──< Batch

Batch ──< ProgressRecord

ProcessStage ──< ProgressRecord
```

| 模型 | 说明 |
|------|------|
| **User** | 系统用户，企业微信 ID 关联 |
| **Product** | 产品型号 |
| **Batch** | 生产批次，含数量/状态/优先级（normal/urgent） |
| **ProcessStage** | 工序定义（可动态管理） |
| **ProgressRecord** | 工序进度记录（批次+工序唯一），含不良数量/不良类型 |
| **AuditLog** | 操作审计日志（自动记录写操作） |

## 工序流程（12 道默认工序）

| 序号 | 编码 | 名称 | 质检 |
|------|------|------|------|
| 1 | incoming_inspection | 来料检验 | 是 |
| 2 | slide_inspection | 检滑 | 是 |
| 3 | in_process_inspection | 进检 | 是 |
| 4 | die_attach | 粘片 | |
| 5 | wire_bonding | 压焊 | |
| 6 | molding | 塑封 | |
| 7 | ultrasound_scan | 超扫 | 是 |
| 8 | deflashing | 去溢料 | |
| 9 | plating | 电镀 | |
| 10 | marking | 打印 | |
| 11 | trimming | 冲切 | |
| 12 | packaging | 包装 | |

> 工序可通过系统设置页面动态增删改，不再硬编码。
