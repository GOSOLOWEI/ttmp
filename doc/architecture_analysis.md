# 个人记账分析系统 - 架构分析与开发规划

> **文档版本**: v1.0  
> **创建日期**: 2026-01-29  
> **分析视角**: 系统架构师

---

## 📋 目录

1. [业务模型分析](#1-业务模型分析)
2. [当前代码设计评估](#2-当前代码设计评估)
3. [开发架构规划](#3-开发架构规划)
4. [技术栈选型](#4-技术栈选型)
5. [实施路线图](#5-实施路线图)

---

## 1. 业务模型分析

### 1.1 核心业务域

基于 Prisma Schema 分析，系统包含以下核心业务域：

#### 📊 **交易流水域 (Transaction Domain)**
- **核心实体**: `Transaction`
- **业务特征**:
  - 支持收入/支出/资产变动三种类型
  - 多维度分类体系（一级/二级分类）
  - 轻账户设计（accountName 可选）
  - 支持多种来源：手工/AI生成/订阅/预付
  - AI元数据追踪（置信度、用户修改记录等）

#### 🏷️ **分类管理域 (Category Domain)**
- **核心实体**: `Category`
- **业务特征**:
  - 两级分类体系
  - 使用频率统计（AI推荐排序）
  - 僵尸分类识别（lastUsedAt）
  - 启用/停用状态管理

#### 💳 **账户管理域 (Account Domain)**
- **核心实体**: `Account`
- **业务特征**:
  - 轻量级账户设计（可选）
  - 支持多种账户类型（现金/储蓄/信用卡/投资/电子钱包）
  - 初始余额管理
  - 净资产计算支持

#### 📅 **订阅管理域 (Subscription Domain)**
- **核心实体**: `Subscription`
- **业务特征**:
  - 月付/年付周期管理
  - 自动续费规则
  - 使用频率评估（低/中/高）
  - 决策状态（保留/观察/取消）

#### 💰 **预付费用域 (Prepaid Domain)**
- **核心实体**: `PrepaidExpense`
- **业务特征**:
  - 预付总金额管理
  - 按月摊销机制
  - 摊销进度追踪（lastAmortizedMonth）
  - 付款流水关联

#### 🎯 **AI智能域 (AI Intelligence Domain)**
- **核心实体**: 
  - `AIGenerationLog` - AI生成审计日志
  - `AIFeedbackLearning` - 反馈学习
  - `TaggingRule` - 个人规则库
  - `AIStageAnalysis` - 阶段分析
- **业务特征**:
  - 多场景支持（记账打标/报告生成/阶段分析/订阅优化/预算建议）
  - 置信度评估
  - 用户反馈闭环
  - 规则自动提炼

#### 📈 **分析报表域 (Analytics Domain)**
- **核心实体**:
  - `MonthlyFinancialSnapshot` - 月度财务快照
  - `UserHistorySummary` - 历史消费摘要
  - `FinancialGoal` - 财务目标
  - `Budget` - 预算管理
- **业务特征**:
  - 多时间窗口分析（30天/90天/12个月）
  - 阶段标签识别（稳定期/扩张期/冲动消费期等）
  - 目标进度追踪

### 1.2 业务模型优势

✅ **数据完整性**: 覆盖记账全生命周期  
✅ **AI友好**: 丰富的元数据和反馈机制  
✅ **扩展性**: 多用户/多账本预留（userId/ledgerId）  
✅ **轻量设计**: 账户可选，降低使用门槛  
✅ **审计追踪**: 完整的AI生成日志和用户操作记录

### 1.3 业务模型待优化点

⚠️ **缺少定时任务模型**: 需要新增 `ScheduledTask` 表  
⚠️ **缺少报表模板模型**: 需要新增 `ReportTemplate` 表  
⚠️ **缺少用户偏好模型**: 需要新增 `UserPreference` 表（推送时间、报表格式等）

---

## 2. 当前代码设计评估

### 2.1 架构层次分析

```
┌─────────────────────────────────────────┐
│   Presentation Layer (展示层)           │
│   - Next.js App Router                  │
│   - Feishu Webhook Handler              │
│   - Web Pages (待开发)                  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   Service Layer (服务层)                 │
│   - feishu-chat.ts (飞书聊天服务)        │
│   - vision.service.ts (图片识别)         │
│   - task.ts (任务服务，待完善)           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   Domain Layer (领域层)                  │
│   - Prisma Models (数据模型)             │
│   - Business Logic (待补充)             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   Infrastructure Layer (基础设施层)      │
│   - Prisma Client                       │
│   - Feishu SDK                          │
│   - AI Model Manager                    │
└─────────────────────────────────────────┘
```

### 2.2 现有模块评估

#### ✅ **已实现模块**

1. **飞书集成层** (`lib/feishu/`)
   - ✅ Webhook事件处理
   - ✅ 消息发送/接收
   - ✅ 资源获取（图片等）
   - ✅ 客户端封装
   - ✅ 事件分发器

2. **AI模型管理** (`lib/models/`)
   - ✅ 多模型支持（doubao等）
   - ✅ 模型管理器
   - ✅ Fallback机制

3. **提示词管理** (`lib/prompts/`)
   - ✅ 提示词构建器
   - ✅ 数据源注入
   - ✅ 模板系统

4. **认证系统** (`lib/auth.ts`)
   - ✅ JWT签发/验证
   - ✅ 飞书登录集成
   - ✅ Session管理（HttpOnly Cookie）

#### ⚠️ **待完善模块**

1. **业务服务层** (`lib/services/`)
   - ⚠️ 记账服务（Transaction Service）缺失
   - ⚠️ 分类服务（Category Service）缺失
   - ⚠️ 订阅服务（Subscription Service）缺失
   - ⚠️ 报表服务（Report Service）缺失
   - ⚠️ AI分析服务（AI Analysis Service）缺失

2. **定时任务系统**
   - ❌ 完全缺失
   - 需要：任务调度器、任务执行器、任务状态管理

3. **Web页面**
   - ⚠️ 仅有基础首页
   - 需要：报表页、管理页、复核页等

4. **数据访问层**
   - ⚠️ 直接使用 Prisma Client，缺少 Repository 模式
   - 建议：封装 Repository 层，统一数据访问

### 2.3 代码质量评估

#### ✅ **优点**

- **分层清晰**: Service/Infrastructure 分离良好
- **类型安全**: TypeScript 全面覆盖
- **错误处理**: 有基础的错误处理机制
- **可扩展性**: 模块化设计，易于扩展

#### ⚠️ **改进建议**

1. **缺少统一异常处理**: 建议引入全局异常处理器
2. **缺少日志系统**: 建议引入结构化日志（如 winston/pino）
3. **缺少数据校验**: 建议引入 Zod 进行输入校验
4. **缺少单元测试**: 建议补充测试覆盖

---

## 3. 开发架构规划

### 3.1 整体架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                     用户交互层                                │
├──────────────────────┬──────────────────────────────────────┤
│  飞书机器人单聊      │          Web管理界面                  │
│  (主要入口)          │  (报表/管理/复核)                     │
└──────────────────────┴──────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    API网关层                                  │
│  - /api/feishu/webhook  (飞书Webhook)                       │
│  - /api/feishu/auth/*   (飞书认证)                          │
│  - /api/reports/*       (报表API)                            │
│  - /api/categories/*    (分类管理API)                        │
│  - /api/subscriptions/* (订阅管理API)                        │
│  - /api/scheduled-tasks/* (定时任务API)                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    业务服务层                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 记账服务     │  │ 分析服务     │  │ 报表服务     │      │
│  │ Transaction │  │ AI Analysis  │  │ Report       │      │
│  │ Service     │  │ Service      │  │ Service      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 分类服务     │  │ 订阅服务     │  │ 定时任务服务 │      │
│  │ Category     │  │ Subscription │  │ Scheduled    │      │
│  │ Service      │  │ Service      │  │ Task Service │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    数据访问层                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Transaction  │  │ Category     │  │ Subscription │      │
│  │ Repository   │  │ Repository   │  │ Repository   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Report       │  │ Scheduled    │  │ AI Log       │      │
│  │ Repository   │  │ Task Repo    │  │ Repository   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    基础设施层                                  │
│  - Prisma ORM                                                │
│  - PostgreSQL Database                                       │
│  - AI Model Manager (Doubao/OpenAI)                          │
│  - Feishu SDK                                                │
│  - Task Scheduler (node-cron / BullMQ)                       │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 核心模块设计

#### 3.2.1 飞书机器人单聊模块

**职责**: 处理用户通过飞书机器人发送的记账消息

**流程设计**:
```
用户消息 → Webhook接收 → 消息解析 → 业务路由 → AI处理 → 生成流水 → 用户确认 → 保存数据库
```

**关键组件**:
- `lib/services/feishu-chat.ts` (已存在，需增强)
- `lib/services/transaction.service.ts` (待创建)
- `lib/services/ai-analysis.service.ts` (待创建)

**增强点**:
1. 支持自然语言记账（"瑞幸 35" → 自动解析分类/金额）
2. 支持图片记账（OCR识别小票）
3. 支持批量记账（"今天花了：咖啡35，午餐50"）
4. 支持查询（"这个月花了多少钱"）

#### 3.2.2 定时任务模块

**职责**: 定时执行AI分析并推送报告

**架构设计**:
```
┌─────────────────┐
│  ScheduledTask  │ (数据库表)
│  - taskId       │
│  - taskType     │ (daily_report/weekly_report/monthly_report)
│  - schedule     │ (cron表达式)
│  - userId       │
│  - isActive     │
└─────────────────┘
         ↓
┌─────────────────┐
│  Task Scheduler │ (node-cron / BullMQ)
│  - 加载任务     │
│  - 执行任务     │
│  - 记录日志     │
└─────────────────┘
         ↓
┌─────────────────┐
│  Task Executor  │
│  - 生成报告     │
│  - 调用AI分析   │
│  - 发送飞书消息 │
└─────────────────┘
```

**技术选型**:
- **轻量级**: `node-cron` (适合简单场景)
- **生产级**: `BullMQ` + Redis (适合复杂场景，支持分布式)

**任务类型**:
1. **每日报告**: 每天推送昨日消费摘要
2. **每周报告**: 每周推送周度分析报告
3. **每月报告**: 每月推送月度财务分析报告
4. **订阅提醒**: 定期提醒订阅续费/取消建议

#### 3.2.3 Web管理界面模块

**页面结构**:
```
/dashboard              # 仪表盘（概览）
  ├─ /reports          # 报表查看
  │   ├─ /monthly      # 月度报表
  │   ├─ /weekly       # 周度报表
  │   └─ /custom       # 自定义报表
  ├─ /categories       # 分类管理
  ├─ /subscriptions    # 订阅管理
  ├─ /scheduled-tasks  # 定时任务管理
  ├─ /review           # 记账复核预览页
  ├─ /amortization     # 分摊管理页
  └─ /settings         # 设置
```

**技术栈**:
- **UI框架**: Next.js 16 + React 19
- **样式**: Tailwind CSS 4
- **状态管理**: React Context / Zustand (可选)
- **数据获取**: Server Components + API Routes
- **图表**: Recharts / Chart.js

**关键页面设计**:

1. **记账复核预览页** (`/review`)
   - 显示待确认的AI生成流水
   - 支持批量确认/修改/删除
   - 显示AI置信度和推荐理由

2. **订阅查看页** (`/subscriptions`)
   - 订阅列表（卡片式展示）
   - 使用频率分析
   - 续费提醒
   - 一键取消/保留

3. **分摊管理页** (`/amortization`)
   - 预付费用列表
   - 摊销进度可视化
   - 手动触发摊销
   - 摊销历史记录

#### 3.2.4 报表服务模块

**职责**: 生成各类财务分析报表

**报表类型**:
1. **消费分析报表**
   - 分类支出统计
   - 趋势分析（环比/同比）
   - Top N 分类

2. **预算执行报表**
   - 预算 vs 实际
   - 超支预警
   - 预算完成度

3. **订阅分析报表**
   - 订阅总览
   - 使用频率分析
   - 优化建议

4. **AI分析报告**
   - 阶段分析（稳定期/扩张期等）
   - 消费行为洞察
   - 风险提示
   - 优化建议

**实现方式**:
- **实时报表**: 直接查询数据库生成
- **预计算报表**: 定时任务预计算，存储到 `MonthlyFinancialSnapshot`

### 3.3 数据模型扩展

#### 3.3.1 定时任务表

```prisma
model ScheduledTask {
  taskId          String   @id @map("task_id") @db.VarChar(50)
  taskType        String   @map("task_type") @db.VarChar(50) // daily_report/weekly_report/monthly_report/subscription_reminder
  taskName        String   @map("task_name") @db.VarChar(100)
  schedule        String   @db.VarChar(100) // cron表达式
  userId          String?  @map("user_id") @db.VarChar(50)
  isActive        Boolean  @map("is_active") @default(true)
  lastRunAt       DateTime? @map("last_run_at")
  nextRunAt       DateTime? @map("next_run_at")
  config          Json?    // 任务配置（推送时间、报表类型等）
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  @@index([userId, isActive])
  @@map("scheduled_tasks")
}
```

#### 3.3.2 任务执行日志表

```prisma
model TaskExecutionLog {
  logId           String   @id @map("log_id") @db.VarChar(50)
  taskId          String   @map("task_id") @db.VarChar(50)
  status          String   // success/fail
  startedAt       DateTime @map("started_at")
  completedAt     DateTime? @map("completed_at")
  errorMessage    String?  @map("error_message") @db.Text
  result          Json?    // 执行结果
  
  @@index([taskId, startedAt])
  @@map("task_execution_logs")
}
```

#### 3.3.3 用户偏好表

```prisma
model UserPreference {
  userId          String   @id @map("user_id") @db.VarChar(50)
  reportTime      String?  @map("report_time") @db.VarChar(10) // "09:00"
  reportFormat    String?  @map("report_format") @db.VarChar(20) // "text"/"card"/"rich"
  timezone        String?  @default("Asia/Shanghai") @db.VarChar(50)
  language        String?  @default("zh-CN") @db.VarChar(10)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  @@map("user_preferences")
}
```

---

## 4. 技术栈选型

### 4.1 后端技术栈

| 模块 | 技术选型 | 理由 |
|------|---------|------|
| **框架** | Next.js 16 | 全栈框架，支持SSR/SSG，API Routes |
| **ORM** | Prisma 7 | 类型安全，迁移管理，性能优秀 |
| **数据库** | PostgreSQL | 支持JSON字段，事务支持，性能稳定 |
| **定时任务** | BullMQ + Redis | 分布式支持，任务队列，重试机制 |
| **AI模型** | 豆包/OpenAI | 多模型支持，已有封装 |
| **认证** | JWT + HttpOnly Cookie | 安全，无状态，易扩展 |

### 4.2 前端技术栈

| 模块 | 技术选型 | 理由 |
|------|---------|------|
| **UI框架** | React 19 | 最新特性，Server Components |
| **样式** | Tailwind CSS 4 | 原子化CSS，开发效率高 |
| **状态管理** | React Context / Zustand | 轻量，适合中小型应用 |
| **数据获取** | Server Components | Next.js原生，性能优秀 |
| **图表** | Recharts | React友好，类型支持好 |
| **表单** | React Hook Form + Zod | 性能好，校验强 |

### 4.3 基础设施

| 模块 | 技术选型 | 理由 |
|------|---------|------|
| **部署** | Vercel / 自建服务器 | 根据需求选择 |
| **缓存** | Redis | 定时任务队列，Session缓存 |
| **日志** | Winston / Pino | 结构化日志，生产环境必需 |
| **监控** | Sentry (可选) | 错误追踪，性能监控 |

---

## 5. 实施路线图

### Phase 1: 基础服务层完善 (2-3周)

**目标**: 建立完整的业务服务层和数据访问层

**任务清单**:
- [ ] 创建 Repository 层（Transaction/Category/Subscription等）
- [ ] 创建 Service 层（Transaction/Category/Subscription/Report等）
- [ ] 实现记账业务逻辑（创建/更新/删除流水）
- [ ] 实现分类管理逻辑
- [ ] 实现订阅管理逻辑
- [ ] 实现预付摊销逻辑
- [ ] 完善AI分析服务（集成现有模型）

**交付物**:
- Repository层代码
- Service层代码
- 单元测试（可选）

### Phase 2: 飞书机器人增强 (1-2周)

**目标**: 增强飞书机器人单聊功能，支持完整记账流程

**任务清单**:
- [ ] 实现自然语言记账解析
- [ ] 实现图片记账（OCR）
- [ ] 实现批量记账
- [ ] 实现查询功能（"这个月花了多少钱"）
- [ ] 实现流水确认流程
- [ ] 优化AI提示词，提升准确率

**交付物**:
- 增强的 `feishu-chat.service.ts`
- 记账解析器
- 用户交互流程

### Phase 3: 定时任务系统 (2周)

**目标**: 实现定时任务调度和执行系统

**任务清单**:
- [ ] 设计并创建 ScheduledTask 数据模型
- [ ] 实现任务调度器（BullMQ + Redis）
- [ ] 实现任务执行器
- [ ] 实现报告生成服务
- [ ] 实现飞书消息推送
- [ ] 实现任务管理API（创建/更新/删除/启用/停用）
- [ ] 实现任务执行日志

**交付物**:
- 定时任务系统
- 任务管理API
- 报告生成服务

### Phase 4: Web管理界面 - 核心页面 (3-4周)

**目标**: 实现核心管理页面

**任务清单**:
- [ ] 实现飞书登录集成（已有基础，需完善）
- [ ] 实现仪表盘页面（概览数据）
- [ ] 实现分类管理页面（CRUD）
- [ ] 实现订阅管理页面（列表/详情/操作）
- [ ] 实现定时任务管理页面（列表/创建/编辑）
- [ ] 实现记账复核预览页（待确认流水列表）
- [ ] 实现分摊管理页（预付费用列表/摊销操作）

**交付物**:
- Web页面代码
- 响应式设计
- 基础交互功能

### Phase 5: Web管理界面 - 报表页面 (2-3周)

**目标**: 实现报表查看功能

**任务清单**:
- [ ] 实现月度报表页面（数据可视化）
- [ ] 实现周度报表页面
- [ ] 实现自定义报表页面（时间范围选择）
- [ ] 实现报表导出功能（PDF/Excel）
- [ ] 优化报表性能（预计算/缓存）

**交付物**:
- 报表页面
- 图表组件
- 导出功能

### Phase 6: 优化与测试 (2周)

**目标**: 系统优化、测试、文档

**任务清单**:
- [ ] 性能优化（数据库索引、查询优化）
- [ ] 错误处理完善
- [ ] 日志系统完善
- [ ] 单元测试补充
- [ ] 集成测试
- [ ] 用户文档编写
- [ ] 部署文档编写

**交付物**:
- 优化后的系统
- 测试报告
- 用户文档
- 部署文档

---

## 6. 关键设计决策

### 6.1 定时任务执行策略

**决策**: 使用 BullMQ + Redis 而非 node-cron

**理由**:
1. **分布式支持**: 多实例部署时，node-cron 会重复执行
2. **任务队列**: 支持任务优先级、延迟执行、重试机制
3. **持久化**: Redis 持久化，服务重启不丢失任务
4. **监控**: 提供任务状态监控和管理界面

**替代方案**: 如果资源有限，可先用 node-cron，后续迁移到 BullMQ

### 6.2 报表生成策略

**决策**: 预计算 + 实时查询混合模式

**理由**:
1. **月度快照**: 月度报表使用预计算的 `MonthlyFinancialSnapshot`
2. **自定义报表**: 实时查询，支持灵活时间范围
3. **性能平衡**: 常用报表预计算，特殊需求实时计算

### 6.3 数据访问层设计

**决策**: 引入 Repository 模式

**理由**:
1. **解耦**: Service 层不直接依赖 Prisma
2. **测试**: 易于 Mock，单元测试友好
3. **扩展**: 未来切换 ORM 时影响范围小

**实现方式**:
```typescript
// lib/repositories/transaction.repository.ts
export class TransactionRepository {
  async create(data: CreateTransactionDto) { ... }
  async findByDateRange(start: Date, end: Date) { ... }
  // ...
}
```

### 6.4 认证策略

**决策**: JWT + HttpOnly Cookie（已实现）

**理由**:
1. **安全性**: HttpOnly Cookie 防止 XSS
2. **无状态**: 适合分布式部署
3. **飞书集成**: 与飞书 Ticket 机制兼容

---

## 7. 风险与挑战

### 7.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **AI识别准确率低** | 高 | 持续优化提示词，增加用户反馈学习 |
| **定时任务执行失败** | 中 | 实现重试机制，错误告警 |
| **数据库性能瓶颈** | 中 | 合理设计索引，考虑读写分离 |
| **飞书API限流** | 低 | 实现请求队列，控制发送频率 |

### 7.2 业务风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **用户数据隐私** | 高 | 数据加密，访问控制，合规审查 |
| **数据丢失** | 高 | 定期备份，事务保证 |
| **服务可用性** | 中 | 监控告警，故障恢复预案 |

---

## 8. 总结

### 8.1 当前状态

✅ **优势**:
- 业务模型设计完善
- 基础架构清晰
- 飞书集成已有基础
- 认证系统已实现

⚠️ **待完善**:
- 业务服务层不完整
- 定时任务系统缺失
- Web页面缺失
- 数据访问层需优化

### 8.2 下一步行动

1. **立即开始**: Phase 1 - 基础服务层完善
2. **并行进行**: 设计定时任务数据模型
3. **准备资源**: Redis 环境（定时任务需要）

### 8.3 成功标准

- ✅ 用户可通过飞书机器人完成记账
- ✅ 定时任务可自动推送AI分析报告
- ✅ Web页面可查看报表和管理数据
- ✅ 系统稳定运行，错误率 < 1%

---

**文档维护**: 本文档应随开发进度持续更新，记录架构演进和关键决策。
