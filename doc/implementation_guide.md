# 快速实施指南

> **文档版本**: v1.0  
> **创建日期**: 2026-01-29  
> **目标**: 帮助开发团队快速开始实施

---

## 🚀 快速开始

### 第一步：环境准备

1. **安装依赖**
```bash
pnpm install
```

2. **配置环境变量**
创建 `.env.local` 文件：
```env
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/accounting"

# 飞书
FEISHU_APP_ID="your_app_id"
FEISHU_APP_SECRET="your_app_secret"
FEISHU_ENCRYPT_KEY="your_encrypt_key"
FEISHU_VERIFICATION_TOKEN="your_verification_token"

# JWT
JWT_SECRET="your_jwt_secret_key_min_32_chars"

# Redis (定时任务需要)
REDIS_HOST="localhost"
REDIS_PORT="6379"

# AI模型 (可选)
OPENAI_API_KEY="your_openai_key"
DOUBAO_API_KEY="your_doubao_key"
```

3. **初始化数据库**
```bash
pnpm db:generate
pnpm db:push
```

### 第二步：扩展数据模型

在 `prisma/schema.prisma` 中添加定时任务相关模型（参考 `architecture_analysis.md` 第3.3节）。

然后执行：
```bash
pnpm db:generate
pnpm db:push
```

### 第三步：安装定时任务依赖

```bash
pnpm add bullmq ioredis
pnpm add -D @types/node-cron
```

---

## 📋 实施检查清单

### Phase 1: 基础服务层 (优先级: 🔴 高)

#### 1.1 创建 Repository 层

- [ ] `lib/repositories/transaction.repository.ts`
  - [ ] create()
  - [ ] findById()
  - [ ] findByDateRange()
  - [ ] findByCategory()
  - [ ] update()
  - [ ] delete()
  - [ ] query()

- [ ] `lib/repositories/category.repository.ts`
  - [ ] findAll()
  - [ ] findByLevel()
  - [ ] create()
  - [ ] update()
  - [ ] delete()

- [ ] `lib/repositories/subscription.repository.ts`
  - [ ] findAll()
  - [ ] findById()
  - [ ] create()
  - [ ] update()
  - [ ] delete()

- [ ] `lib/repositories/scheduled-task.repository.ts`
  - [ ] findAll()
  - [ ] findById()
  - [ ] create()
  - [ ] update()
  - [ ] delete()

#### 1.2 创建 Service 层

- [ ] `lib/services/transaction.service.ts`
  - [ ] createTransaction()
  - [ ] createTransactionsBatch()
  - [ ] getMonthlySummary()
  - [ ] validateCategory()

- [ ] `lib/services/category.service.ts`
  - [ ] listCategories()
  - [ ] createCategory()
  - [ ] updateCategory()
  - [ ] deleteCategory()

- [ ] `lib/services/subscription.service.ts`
  - [ ] listSubscriptions()
  - [ ] createSubscription()
  - [ ] updateSubscription()
  - [ ] deleteSubscription()

- [ ] `lib/services/report.service.ts`
  - [ ] generateMonthlyReport()
  - [ ] generateWeeklyReport()
  - [ ] generateCustomReport()

- [ ] `lib/services/ai-analysis.service.ts`
  - [ ] generateMonthlyAnalysis()
  - [ ] generateStageAnalysis()
  - [ ] generateSubscriptionAdvice()

#### 1.3 增强现有服务

- [ ] `lib/services/feishu-chat.ts`
  - [ ] 集成 transaction.service
  - [ ] 实现自然语言记账解析
  - [ ] 实现图片记账（OCR）
  - [ ] 实现查询功能

### Phase 2: 定时任务系统 (优先级: 🟡 中)

- [ ] 扩展 Prisma Schema（添加 ScheduledTask 和 TaskExecutionLog）
- [ ] `lib/schedulers/task-scheduler.ts`
  - [ ] 队列初始化
  - [ ] Worker 配置
  - [ ] 任务加载逻辑

- [ ] `lib/schedulers/executors/daily-report.executor.ts`
- [ ] `lib/schedulers/executors/weekly-report.executor.ts`
- [ ] `lib/schedulers/executors/monthly-report.executor.ts`
- [ ] `lib/schedulers/executors/subscription-reminder.executor.ts`

- [ ] `app/api/scheduled-tasks/route.ts` (CRUD API)
- [ ] 启动脚本（在 Next.js 启动时加载任务）

### Phase 3: Web管理界面 (优先级: 🟡 中)

#### 3.1 认证增强

- [ ] `app/api/auth/me/route.ts` (已存在，需验证)
- [ ] `components/AuthGuard.tsx` (路由保护组件)
- [ ] `middleware.ts` (Next.js中间件，保护路由)

#### 3.2 核心页面

- [ ] `app/dashboard/page.tsx` (仪表盘)
- [ ] `app/categories/page.tsx` (分类管理)
- [ ] `app/subscriptions/page.tsx` (订阅管理)
- [ ] `app/scheduled-tasks/page.tsx` (定时任务管理)
- [ ] `app/review/page.tsx` (记账复核)
- [ ] `app/amortization/page.tsx` (分摊管理)

#### 3.3 报表页面

- [ ] `app/reports/monthly/page.tsx`
- [ ] `app/reports/weekly/page.tsx`
- [ ] `app/reports/custom/page.tsx`

#### 3.4 UI组件

- [ ] `components/ui/Button.tsx`
- [ ] `components/ui/Card.tsx`
- [ ] `components/ui/Table.tsx`
- [ ] `components/ui/Chart.tsx`
- [ ] `components/features/TransactionList.tsx`
- [ ] `components/features/CategoryManager.tsx`
- [ ] `components/features/SubscriptionCard.tsx`
- [ ] `components/features/ReportChart.tsx`

### Phase 4: API接口 (优先级: 🟢 低，与页面并行)

- [ ] `app/api/transactions/route.ts`
- [ ] `app/api/transactions/[id]/route.ts`
- [ ] `app/api/categories/route.ts`
- [ ] `app/api/categories/[id]/route.ts`
- [ ] `app/api/subscriptions/route.ts`
- [ ] `app/api/subscriptions/[id]/route.ts`
- [ ] `app/api/reports/monthly/route.ts`
- [ ] `app/api/reports/weekly/route.ts`
- [ ] `app/api/reports/custom/route.ts`

---

## 🛠️ 开发工具和脚本

### 1. 数据库迁移脚本

创建 `scripts/migrate.ts`:
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function migrate() {
  console.log('🔄 生成 Prisma Client...');
  await execAsync('pnpm db:generate');
  
  console.log('📦 推送数据库变更...');
  await execAsync('pnpm db:push');
  
  console.log('✅ 迁移完成');
}

migrate().catch(console.error);
```

### 2. 数据种子脚本

创建 `scripts/seed.ts`:
```typescript
import { prisma } from '@/lib/prisma';

async function seed() {
  // 创建默认分类
  const categories = [
    { level1Category: '餐饮', level2Category: '早餐', defaultType: 'expense' },
    { level1Category: '餐饮', level2Category: '午餐', defaultType: 'expense' },
    { level1Category: '餐饮', level2Category: '晚餐', defaultType: 'expense' },
    { level1Category: '交通', level2Category: '地铁', defaultType: 'expense' },
    { level1Category: '交通', level2Category: '打车', defaultType: 'expense' },
    // ... 更多分类
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: {
        level1Category_level2Category: {
          level1Category: cat.level1Category,
          level2Category: cat.level2Category
        }
      },
      create: cat,
      update: cat
    });
  }

  console.log('✅ 种子数据创建完成');
}

seed().catch(console.error);
```

### 3. 定时任务启动脚本

创建 `scripts/start-scheduler.ts`:
```typescript
import { loadScheduledTasks } from '@/lib/schedulers/task-scheduler';

async function start() {
  console.log('🚀 启动定时任务调度器...');
  await loadScheduledTasks();
  console.log('✅ 定时任务调度器已启动');
}

start().catch(console.error);
```

在 `package.json` 中添加：
```json
{
  "scripts": {
    "scheduler": "tsx scripts/start-scheduler.ts"
  }
}
```

---

## 📝 代码示例

### 1. API Route 示例

```typescript
// app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { transactionService } from '@/lib/services/transaction.service';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // 1. 验证认证
    const cookieStore = await cookies();
    const token = cookieStore.get('feishu_session')?.value;
    
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return NextResponse.json({ error: 'Token无效' }, { status: 401 });
    }

    // 2. 获取查询参数
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 3. 调用服务层
    const transactions = await transactionService.query({
      userId: user.open_id,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });

    return NextResponse.json({ data: transactions });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 认证验证...
    const user = await verifyJWT(token);
    
    const body = await request.json();
    const transaction = await transactionService.createTransaction({
      ...body,
      userId: user.open_id
    });

    return NextResponse.json({ data: transaction });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}
```

### 2. Server Component 示例

```typescript
// app/reports/monthly/page.tsx
import { verifyJWT } from '@/lib/auth';
import { reportService } from '@/lib/services/report.service';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { MonthlyReportChart } from '@/components/features/ReportChart';

export default async function MonthlyReportPage({
  searchParams
}: {
  searchParams: { year?: string; month?: string }
}) {
  // 1. 验证认证
  const cookieStore = await cookies();
  const token = cookieStore.get('feishu_session')?.value;
  
  if (!token) {
    redirect('/');
  }

  const user = await verifyJWT(token);
  if (!user) {
    redirect('/');
  }

  // 2. 获取参数
  const year = parseInt(searchParams.year || new Date().getFullYear().toString());
  const month = parseInt(searchParams.month || (new Date().getMonth() + 1).toString());

  // 3. 获取数据
  const report = await reportService.generateMonthlyReport(
    year,
    month,
    user.open_id,
    true // 包含AI分析
  );

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        {year}年{month}月报表
      </h1>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="text-sm text-gray-500">收入</div>
          <div className="text-2xl font-bold">¥{report.income.toFixed(2)}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">支出</div>
          <div className="text-2xl font-bold">¥{report.expense.toFixed(2)}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">净现金流</div>
          <div className="text-2xl font-bold">¥{report.netCashflow.toFixed(2)}</div>
        </div>
      </div>

      <MonthlyReportChart data={report} />

      {report.aiAnalysis && (
        <div className="card mt-6">
          <h2 className="text-xl font-bold mb-4">AI分析</h2>
          <p className="whitespace-pre-wrap">{report.aiAnalysis}</p>
        </div>
      )}
    </div>
  );
}
```

### 3. 定时任务执行器示例

```typescript
// lib/schedulers/executors/daily-report.executor.ts
import { reportService } from '@/lib/services/report.service';
import { sendMessage } from '@/lib/feishu/messages';
import { prisma } from '@/lib/prisma';

export async function dailyReportExecutor(data: {
  taskId: string;
  userId?: string;
  config?: any;
}) {
  const { userId, config } = data;
  
  // 1. 获取昨天的日期
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = yesterday.getMonth() + 1;
  const day = yesterday.getDate();

  // 2. 查询昨天的交易
  const startDate = new Date(year, month - 1, day, 0, 0, 0);
  const endDate = new Date(year, month - 1, day, 23, 59, 59);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: userId || undefined,
      date: { gte: startDate, lte: endDate },
      type: 'expense',
      isAnalysis: true
    },
    orderBy: { amount: 'desc' },
    take: 10
  });

  // 3. 生成摘要
  const totalExpense = transactions.reduce(
    (sum, t) => sum + Math.abs(Number(t.amount)),
    0
  );

  const topCategories = transactions
    .slice(0, 3)
    .map(t => `${t.level1Category}/${t.level2Category}: ¥${Math.abs(Number(t.amount))}`)
    .join('\n');

  // 4. 构建消息
  const message = `📊 昨日消费摘要 (${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')})

总支出: ¥${totalExpense.toFixed(2)}

Top 3 消费:
${topCategories || '无消费记录'}`;

  // 5. 发送飞书消息
  if (userId) {
    await sendMessage(userId, message, 'text', 'open_id');
  }

  return {
    success: true,
    totalExpense,
    transactionCount: transactions.length
  };
}
```

---

## 🧪 测试建议

### 1. 单元测试示例

```typescript
// __tests__/services/transaction.service.test.ts
import { transactionService } from '@/lib/services/transaction.service';
import { transactionRepository } from '@/lib/repositories/transaction.repository';

jest.mock('@/lib/repositories/transaction.repository');

describe('TransactionService', () => {
  it('should create transaction', async () => {
    const mockData = {
      date: new Date(),
      type: 'expense' as const,
      level1Category: '餐饮',
      level2Category: '午餐',
      amount: 50,
      paymentChannel: 'wechat' as const
    };

    const result = await transactionService.createTransaction(mockData);
    
    expect(result).toBeDefined();
    expect(result.transactionId).toMatch(/^TX\d{8}[A-Z0-9]{5}$/);
  });
});
```

### 2. API测试示例

使用 `supertest` 或直接在浏览器中测试。

---

## 📚 参考资源

- [Next.js 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)
- [BullMQ 文档](https://docs.bullmq.io/)
- [飞书开放平台](https://open.feishu.cn/document/)

---

## ❓ 常见问题

### Q1: 定时任务如何启动？

A: 在 Next.js 启动时，调用 `loadScheduledTasks()`。可以在 `app/layout.tsx` 或单独的启动脚本中执行。

### Q2: 如何处理多用户场景？

A: 所有查询都通过 `userId` 过滤，确保数据隔离。在 Service 层统一注入 `userId`。

### Q3: AI分析如何集成？

A: 使用现有的 `modelManager`，在 `ai-analysis.service.ts` 中封装业务逻辑。

---

**文档维护**: 本文档应随开发进度持续更新，记录实际开发中的问题和解决方案。
