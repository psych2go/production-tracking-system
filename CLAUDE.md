# 生产进度追踪系统 (Production Tracking System)

制造业车间生产进度追踪应用，支持 H5 和微信小程序。目标用户：车间工人（录入进度）、管理员（系统管理）。

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
│   │   ├── config/
│   │   │   ├── index.ts        # 配置（端口、JWT、企微、CORS）
│   │   │   └── database.ts     # Prisma 单例
│   │   ├── middleware/
│   │   │   ├── auth.ts         # authGuard + roleGuard + AuthRequest
│   │   │   ├── audit.ts        # 操作审计日志中间件
│   │   │   ├── validator.ts    # Zod 校验中间件
│   │   │   └── errorHandler.ts # 全局错误处理
│   │   ├── routes/
│   │   │   ├── index.ts        # 路由聚合
│   │   │   ├── auth.ts         # /api/auth
│   │   │   ├── user.ts         # /api/users
│   │   │   ├── product.ts      # /api/products
│   │   │   ├── batch.ts        # /api/batches（产品/试验 discriminated union）
│   │   │   ├── progress.ts     # /api/progress
│   │   │   ├── statistics.ts   # /api/statistics
│   │   │   ├── settings.ts     # /api/settings（工序 + 封装形式）
│   │   │   ├── audit.ts        # /api/audit
│   │   │   └── schedule.ts     # /api/schedule（排单）
│   │   ├── services/
│   │   │   ├── auth.ts         # 认证 + 企业微信 API 对接
│   │   │   ├── user.ts
│   │   │   ├── product.ts
│   │   │   ├── batch.ts        # 产品/试验双类型，试验自动生成 S 前缀批号
│   │   │   ├── progress.ts     # dashboard 数据；流转到包装自动完成批次
│   │   │   ├── statistics.ts   # 耗时/趋势/异常/分组统计/Excel导出
│   │   │   ├── settings.ts     # 工序 CRUD + 封装形式 CRUD
│   │   │   ├── audit.ts        # 审计日志查询
│   │   │   └── schedule.ts     # 排单查询与排序
│   │   ├── app.ts              # Express 应用 setup
│   │   └── server.ts           # 入口，启动监听
│   └── prisma/
│       ├── schema.prisma       # 8 个模型
│       ├── seed.ts             # 15 道工序 + 22 种封装形式 + dev_admin
│       ├── dev.db
│       └── tests/              # Vitest 集成测试
├── client/                     # 前端 uni-app
│   ├── src/
│   │   ├── api/
│   │   │   ├── index.ts        # uni.request 封装 + token 注入
│   │   │   └── modules.ts      # 各模块 API 函数
│   │   ├── store/
│   │   │   ├── user.ts         # 认证状态、token 持久化、isAdmin()
│   │   │   └── app.ts          # 工序缓存、getStatusColor、getPriorityLabel
│   │   ├── utils/
│   │   │   ├── constants.ts    # PRIORITIES、ROLE_LABELS、STATUS_LABELS、STATUS_COLORS
│   │   │   └── format.ts       # formatDate、formatTime、formatDateShort
│   │   ├── components/
│   │   │   ├── StageTimeline.vue  # 工序进度时间线
│   │   │   ├── BatchCard.vue      # 批次列表卡片（产品/试验双展示）
│   │   │   └── Charts.vue         # uCharts 封装组件
│   │   ├── pages/              # 主页面 (tabBar)
│   │   │   ├── index/          # 首页仪表盘
│   │   │   ├── progress/       # 进度录入（工序流转） + 历史
│   │   │   ├── batch/          # 批次管理（列表/详情/新建）
│   │   │   ├── schedule/       # 排单
│   │   │   ├── stats/          # 统计分析（耗时/产量/预警+Excel导出）
│   │   │   └── profile/        # 个人中心（管理入口）
│   │   ├── pages-admin/        # 管理员子包
│   │   │   ├── users/          # 用户管理
│   │   │   ├── products/       # 产品管理
│   │   │   ├── settings/       # 工序管理
│   │   │   ├── package-types/  # 封装形式管理
│   │   │   └── audit/          # 审计日志
│   │   ├── styles/
│   │   │   ├── uni.scss        # SCSS 变量
│   │   │   └── global.scss     # 全局工具类
│   │   └── types/
│   │       ├── index.d.ts      # TypeScript 类型定义
│   │       └── ucharts.d.ts    # uCharts 模块声明
│   ├── vite.config.ts          # 代理 /api → localhost:3000，host 0.0.0.0（WSL2）
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
npm run db:seed             # 种子数据（15道工序 + 22种封装形式 + dev_admin）
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
npm run db:seed             # 重新导入种子数据
npm test                    # 运行 Vitest 集成测试

# 前端
cd client
npm run build:h5            # H5 生产构建
npm run build:mp-weixin     # 小程序生产构建
```

### WSL2 开发注意

- 前端 `vite.config.ts` 已配置 `host: "0.0.0.0"`，Windows 浏览器可直接访问 `http://localhost:5173`
- 后端监听 `localhost:3000`，前端通过 vite proxy 转发 `/api` 请求

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
5. 401 响应仅在已登录状态时触发前端登出跳转（防止未登录时循环重定向）

### 角色体系

| 角色 | 权限 |
|------|------|
| `admin` | 全部权限：用户管理、工序管理、封装形式管理、批次管理、排单、审计日志 |
| `worker` | 进度录入、查看批次 |

### 核心业务流程

#### 进度录入（工序流转）

简化设计：只记录工序流转，不记录加工数/合格数/不良数。

1. 选择批次（仅显示 `status=active` 即"正在加工"的批次）
2. 可按工序或封装形式筛选批次
3. 点击目标工序 → 确认弹窗 → 提交流转记录
4. 所有工序可自由点击（允许跳过工序）
5. 已完成工序灰色显示带勾号，当前工序蓝色高亮
6. 第 15 道「已完成」工序闪烁显示在包装下方
7. 流转到包装工序后，系统自动创建「已完成」工序记录，批次自动变为 `completed` 状态；也可直接流转到「已完成」工序

#### 批次状态

| 状态 | 标签 | 说明 |
|------|------|------|
| `active` | 正在加工 | 显示在录入界面的可选批次中 |
| `completed` | 已完成 | 流转到包装后自动变更 |
| `archived` | 已归档 | 手动归档 |

#### 新建批次（产品/试验双类型）

页面顶部有类型切换器（产品 / 试验），切换后显示不同的表单模板。

**产品批次**：
- **生产批号**：必填，手动输入
- **产品型号**：必填，手动输入（后端自动查找或创建 Product 记录，相同型号复用）
- **加工数量**：必填，正整数
- **封装形式**：必填，从数据库动态加载选择
- **客户代码**：可选
- **订单编号**：可选
- **优先级**：普通/紧急，默认普通
- **交期**：可选，日期选择
- **备注**：可选

**试验批次**：
- **批号**：系统自动生成，格式 `S{yyyyMMdd}-{序号}`（如 `S20260412-001`），同日递增
- **试验内容**：必填，文本
- **封装形式**：可选，支持从列表选择或手动输入
- **要求完成时间**：可选，日期选择
- **备注**：可选
- 无产品关联（productId 为空），数量默认 0

#### 排单

管理员可为每个工序内的批次排列加工顺序。支持上移/下移调整。

#### 管理员功能入口

个人中心"系统管理"菜单（仅 admin 可见），顺序：工序管理 → 封装形式管理 → 用户管理 → 审计日志

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
- 前端 `api/index.ts` 统一处理：401 仅在已登录时登出，其他错误显示 `uni.showToast`
- 所有面向用户的消息使用中文

### 校验模式

后端使用 Zod schema，在路由层通过 `validate(schema)` 中间件执行。批次创建使用 discriminated union 按类型区分校验：

```typescript
// 产品批次
const createProductSchema = z.object({
  batchType: z.literal("product").optional().default("product"),
  batchNo: z.string().min(1, "批号不能为空"),
  productModel: z.string().min(1, "产品型号不能为空"),
  quantity: z.number().int().positive("加工数量必须大于0"),
  packageType: z.string().min(1, "请选择封装形式"),
  // ... 可选字段
});

// 试验批次
const createTrialSchema = z.object({
  batchType: z.literal("trial"),
  trialContent: z.string().min(1, "试验内容不能为空"),
  packageType: z.string().optional(),
  expectedDelivery: z.string().optional(),
  notes: z.string().optional(),
});

const createSchema = z.discriminatedUnion("batchType", [
  createProductSchema,
  createTrialSchema,
]);
```

### 审计日志

使用 `auditLog(action, entity)` 中间件自动记录写操作。中间件拦截 `res.json`，在响应成功后异步写入审计日志。

### 前端样式

- 颜色变量定义在 `client/src/styles/global.scss`：Primary `#0083ff`、Success `#07c160`、Warning `#ff9900`、Danger `#fa5151`
- 使用 `rpx` 响应式单位（750rpx = 屏幕宽度）
- 全局工具类在 `client/src/styles/global.scss`：`.container`、`.card`、`.text-primary` 等
- 页面组件使用 `<style lang="scss" scoped>`

### 显示约定

- 产品批次：批号和产品型号显示在同一行，空格分隔，如 `B20260404-004 GD32F303`（适用于所有页面）
- 试验批次：显示批号 + 橙色「试验」标签，卡片下方显示试验内容摘要，不显示数量和产品型号
- 试验批号格式：`S{yyyyMMdd}-{序号}`，如 `S20260412-001`
- 批次状态标签：`active` → "正在加工"、`completed` → "已完成"、`archived` → "已归档"
- 详情页字段名称：产品批次用「产品型号」（显示 product.model），产品批次用「交期」（非「期望交期」）
- 试验批次详情展示：试验内容、封装形式、要求完成时间、创建时间、备注

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
| GET | `/products` | 产品列表（分页） | 需认证 |
| POST | `/products` | 创建产品 | admin |
| PUT | `/products/:id` | 更新产品 | admin |
| DELETE | `/products/:id` | 删除产品（软删除） | admin |

> 产品记录由新建批次时自动创建（输入产品型号后 upsert），无需单独管理页面。

### 批次 `/api/batches`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/batches` | 批次列表（支持 status/keyword/packageType/batchType 筛选） | 需认证 |
| GET | `/batches/:id` | 批次详情（含进度记录） | 需认证 |
| POST | `/batches` | 创建批次（产品/试验双类型，discriminated union 校验） | admin |
| PUT | `/batches/:id` | 更新批次状态/优先级/备注 | 需认证 |

### 进度 `/api/progress`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/progress/dashboard` | 仪表盘数据（含异常预警） | 需认证 |
| GET | `/progress/stages` | 工序列表 | 需认证 |
| GET | `/progress/stages/:stageId/products` | 工序下的产品 | 需认证 |
| GET | `/progress` | 进度记录（筛选/分页） | 需认证 |
| POST | `/progress` | 创建工序流转记录 | 需认证 |

### 统计 `/api/statistics`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/statistics/durations` | 工序耗时统计 | 需认证 |
| GET | `/statistics/production` | 产量趋势（日/周/月） | 需认证 |
| GET | `/statistics/anomalies` | 批次延迟预警 | 需认证 |
| GET | `/statistics/grouped` | 分组统计（按客户/封装形式） | 需认证 |
| GET | `/statistics/export/excel` | Excel 导出 | 需认证 |

### 设置 `/api/settings`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/settings/stages` | 新增工序 | admin |
| PUT | `/settings/stages/:id` | 修改工序 | admin |
| DELETE | `/settings/stages/:id` | 删除工序（检查关联） | admin |
| GET | `/settings/package-types` | 封装形式列表 | 需认证 |
| POST | `/settings/package-types` | 新增封装形式 | admin |
| DELETE | `/settings/package-types/:id` | 删除封装形式（检查关联批次） | admin |

### 审计 `/api/audit`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/audit/logs` | 审计日志（多维筛选/分页） | admin |

### 排单 `/api/schedule`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/schedule/:stageId` | 查看工序排单队列 | 需认证 |
| PUT | `/schedule/:stageId/reorder` | 调整批次顺序 | admin |

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 服务健康状态 |

## 数据库模型

```
User ──< Batch (created_by)
User ──< ProgressRecord (operator_id)
User ──< AuditLog

Product ──< Batch              (model 字段 @unique，新建批次时 upsert)

Batch ──< ProgressRecord       (流转到包装自动 completed)
Batch ──< ScheduleOrder

ProcessStage ──< ProgressRecord
ProcessStage ──< ScheduleOrder

PackageType                   (独立表，管理员 CRUD)
```

| 模型 | 说明 |
|------|------|
| **User** | 系统用户，企业微信 ID 关联 |
| **Product** | 产品型号（model 字段唯一，新建批次时自动查找或创建） |
| **Batch** | 生产批次，支持产品/试验双类型。含 batchType/trialContent 字段，产品批次关联 Product，试验批次自动生成 S 前缀批号 |
| **ProcessStage** | 工序定义（可动态管理） |
| **ProgressRecord** | 工序流转记录（批次+工序唯一），记录流转时间和操作人 |
| **PackageType** | 封装形式定义（管理员增删，新建批次时引用） |
| **AuditLog** | 操作审计日志（自动记录写操作） |
| **ScheduleOrder** | 排单记录（工序+批次唯一，记录加工顺序） |

## 工序流程（15 道默认工序）

| 序号 | 编码 | 名称 | 质检 | 描述 |
|------|------|------|------|------|
| 1 | incoming_inspection | 来料检验 | 是 | 原材料入库检验 |
| 2 | slide_inspection | 减划 | | 减薄划片 |
| 3 | in_process_inspection | 镜检 | 是 | 显微镜检验 |
| 4 | die_bonding_prep | 粘片库 | | 粘片备料 |
| 5 | die_attach | 粘片 | | 芯片粘接 |
| 6 | wire_bonding | 压焊 | | 引线键合 |
| 7 | molding | 塑封 | | 塑封封装 |
| 8 | ultrasound_scan | 超扫 | 是 | 超声波扫描检测 |
| 9 | deflashing | 去溢料 | | 去除溢料 |
| 10 | lead_cutting | 切筋 | | 切筋成型 |
| 11 | plating | 电镀 | | 电镀处理 |
| 12 | marking | 打印 | | 激光打标/打印 |
| 13 | trimming | 成型 | | 冲切成型 |
| 14 | visual_inspection | 外观检验 | 是 | 成品外观质量检验 |
| 15 | packaging | 包装 | | 成品包装 |
| 16 | completed | 已完成 | | 生产完成（流转到包装时自动标记，也可手动流转） |

> 工序可通过管理员工序管理页面动态增删改。

## 封装形式（22 种，按系列分组）

| 系列 | 型号 |
|------|------|
| DIP | DIP8L, DIP14L, DIP16L, DIP18L |
| SOP | SOP8L, SOP14L, SOP16L, SOP16L (W), SOP20L, SOP24L, SOP28L |
| SSOP | SSOP20L (0.65), SSOP24L (0.635), SSOP24L (0.65) |
| MSOP | MSOP12L |
| LQFP | LQFP32L, LQFP44L, LQFP48L, LQFP64L (10×10), LQFP64L (7×7), LQFP100L, LQFP128L |

> 封装形式可通过管理员封装形式管理页面增删。删除时检查是否有关联批次。
