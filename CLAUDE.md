# 生产进度追踪系统

制造业车间生产进度追踪应用（H5 + 微信小程序）。用户：车间工人（录入进度）、管理员（系统管理）。

## 技术栈

Express 4 + TypeScript + Prisma 6 + SQLite | uni-app 3 (Vue 3) + Pinia + SCSS | JWT + 企业微信 OAuth | Zod | uCharts | xlsx

## 开发

```bash
# 后端 http://localhost:3000
cd server && npm install && cp .env.example .env && npx prisma migrate dev && npm run db:seed && npm run dev

# 前端 http://localhost:5173（vite proxy 转发 /api → :3000）
cd client && npm install && npm run dev:h5
```

## 架构

```
Route (Zod 校验 + authGuard/roleGuard + auditLog) → Service (业务逻辑) → Prisma (SQLite)
```

前端：`Page → api/modules.ts → uni.request (自动 Bearer token) → 后端`，Pinia 缓存工序/用户状态。

## 认证

- 开发：`POST /api/auth/dev-login` → JWT（dev_admin，显示为"冯部长/研发部"）
- 生产：企业微信 OAuth 回调 → upsert 用户 → JWT
- 401 仅在已登录时触发登出（防未登录循环重定向）

## 角色权限

| 角色 | 权限 |
|------|------|
| admin | 全部：用户/工序/封装形式/批次管理、排单、审计日志 |
| worker | 进度录入、查看批次 |

## 核心业务

### 工序流转
只记录流转，不记录加工数/合格数。所有工序可自由点击（允许跳过）。流转到包装自动创建「已完成」记录并标记批次 completed。

### 批次（产品/试验双类型）

**产品批次**：手动批号、产品型号（upsert Product）、数量、封装形式、客户代码、订单编号、客户要求交期、生产预计交期、优先级、备注

**试验批次**：自动批号 `S{yyyyMMdd}-{序号}`、试验内容、封装形式、数量（支持「条」「只」双单位）、要求完成时间、备注。无产品关联。

### 客户代码
预设客户代码列表（管理员维护），创建/编辑产品批次时从列表选择。客户代码管理入口：个人中心 → 客户代码管理。

### 排单
管理员按工位排列批次加工顺序。工人可在首页查看排单队列（按工位展开/收起）。默认按流转到工位的时间排序，管理员可手动调整。

### 工序流转防重复
已流转的工序不可再次流转。前后端双重校验，后端返回明确错误信息（含工序名和流转时间）。

### 管理员功能入口
个人中心 → 工序管理 → 封装形式管理 → 客户代码管理 → 用户管理 → 审计日志

## 代码约定

- 文件/目录: kebab-case | TS 变量: camelCase | DB 字段: snake_case + Prisma `@map`
- API 响应：成功直接返回数据，分页 `{ items, total, page, pageSize }`，错误 `{ error }`
- 错误处理：Route try-catch → `next(err)` → errorHandler；前端统一 `uni.showToast`
- Zod 校验在路由层通过 `validate(schema)` 中间件执行
- 审计日志：`auditLog(action, entity)` 中间件拦截 `res.json`，异步写入
- 样式：`rpx` 单位，颜色变量在 `global.scss`（Primary `#0083ff`、Success `#07c160`、Warning `#ff9900`、Danger `#fa5151`）
- 产品批次显示：`批号 型号`（同一行）。试验批次：批号 + 橙色「试验」标签

## 显示约定

- 紧急标签：全局 `.urgent-tag`（红色背景白字）
- 试验标签：全局 `.trial-tag`（橙色）
- 状态：active→正在加工、completed→已完成、archived→已归档
- 产品交期显示「客户交期」和「预计交期」，试验显示「要求完成时间」
- 试验批次数量：`quantityDetail` 存 JSON 如 `{"条":100,"只":50}`，`quantity` 存总和。显示格式 "100条 50只"，老数据 fallback 到 `quantity` 数字

## 数据模型（8 个）

User、Product、Batch（产品/试验双类型）、ProcessStage、ProgressRecord（批次+工序唯一）、PackageType、AuditLog、ScheduleOrder（工序+批次唯一）

## 工序（16 道，4 道质检）

来料检验(质检) → 减划 → 镜检(质检) → 粘片库 → 粘片 → 压焊 → 塑封 → 超扫(质检) → 去溢料 → 切筋 → 电镀 → 打印 → 成型 → 外观检验(质检) → 包装 → 已完成

工序和封装形式可通过管理页面动态增删改。
