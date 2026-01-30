# MVP快速开始指南

> **目标**: 2周内完成最小可行产品  
> **核心功能**: 飞书机器人记账 + 基础查询

---

## 🎯 MVP功能清单

### 必须实现（P0）
- [x] 飞书机器人接收消息
- [ ] AI解析记账消息（"瑞幸 35" → 交易流水）
- [ ] 用户确认/修改/删除流水
- [ ] 查询本月消费总额
- [ ] 预设分类数据

### 暂不实现（后续阶段）
- [ ] Web管理界面
- [ ] 图片记账
- [ ] 批量记账
- [ ] 定时任务
- [ ] 报表分析

---

## 📅 2周实施计划

### Week 1: 核心功能开发

#### Day 1: 数据层基础
```bash
# 1. 检查Prisma Schema（Transaction和Category表）
# 2. 生成Prisma Client
pnpm db:generate
pnpm db:push

# 3. 创建种子脚本（预设分类）
# scripts/seed-categories.ts
```

**交付物**:
- ✅ 数据库表就绪
- ✅ 预设分类数据

#### Day 2-3: Repository层
```typescript
// lib/repositories/transaction.repository.ts
export class TransactionRepository {
  async create(data) { ... }
  async findById(id) { ... }
  async findByDateRange(start, end, userId?) { ... }
}

// lib/repositories/category.repository.ts
export class CategoryRepository {
  async findAll() { ... }
  async findByLevel(level1, level2) { ... }
}
```

**交付物**:
- ✅ TransactionRepository
- ✅ CategoryRepository

#### Day 4-5: Service层 + AI集成
```typescript
// lib/services/transaction.service.ts
export class TransactionService {
  async createTransaction(data) { ... }
  async getMonthlySummary(year, month, userId?) { ... }
}

// 增强 lib/services/feishu-chat.ts
// 集成AI模型，解析消息，生成交易
```

**交付物**:
- ✅ TransactionService
- ✅ 增强的feishu-chat.service
- ✅ AI记账功能

### Week 2: 完善和测试

#### Day 6-7: 用户确认流程
- [ ] 发送确认卡片消息
- [ ] 处理用户操作（确认/修改/删除）
- [ ] 保存到数据库

#### Day 8-9: 查询功能
- [ ] "这个月花了多少钱"
- [ ] "餐饮花了多少"
- [ ] 简单统计查询

#### Day 10: 测试和优化
- [ ] 端到端测试
- [ ] 修复bug
- [ ] 优化AI提示词

---

## 🚀 第一天任务清单

### 上午任务（4小时）

**1. 检查数据模型** (30分钟)
```bash
# 查看 prisma/schema.prisma
# 确认 Transaction 和 Category 表存在
```

**2. 创建种子脚本** (1小时)
```typescript
// scripts/seed-categories.ts
import { prisma } from '@/lib/prisma';

const categories = [
  { level1Category: '餐饮', level2Category: '早餐', defaultType: 'expense' },
  { level1Category: '餐饮', level2Category: '午餐', defaultType: 'expense' },
  { level1Category: '餐饮', level2Category: '晚餐', defaultType: 'expense' },
  { level1Category: '交通', level2Category: '地铁', defaultType: 'expense' },
  { level1Category: '交通', level2Category: '打车', defaultType: 'expense' },
  { level1Category: '购物', level2Category: '日用品', defaultType: 'expense' },
  { level1Category: '娱乐', level2Category: '电影', defaultType: 'expense' },
  { level1Category: '收入', level2Category: '工资', defaultType: 'income' },
];

async function seed() {
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
  console.log('✅ 分类数据已创建');
}

seed();
```

**3. 创建Repository层** (2.5小时)
```typescript
// lib/repositories/transaction.repository.ts
import { prisma } from '@/lib/prisma';

export class TransactionRepository {
  async create(data: any) {
    return await prisma.transaction.create({ data });
  }

  async findById(transactionId: string) {
    return await prisma.transaction.findUnique({
      where: { transactionId }
    });
  }

  async findByDateRange(startDate: Date, endDate: Date, userId?: string) {
    return await prisma.transaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        ...(userId && { userId })
      },
      orderBy: { date: 'desc' }
    });
  }
}

export const transactionRepository = new TransactionRepository();
```

### 下午任务（4小时）

**4. 创建Service层** (2小时)
```typescript
// lib/services/transaction.service.ts
import { transactionRepository } from '@/lib/repositories/transaction.repository';

export class TransactionService {
  generateTransactionId(date: Date): string {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `TX${dateStr}${random}`;
  }

  async createTransaction(data: {
    date: Date;
    type: 'income' | 'expense' | 'asset_change';
    level1Category: string;
    level2Category: string;
    amount: number;
    paymentChannel: string;
    userId?: string;
    description?: string;
  }) {
    const transactionId = this.generateTransactionId(data.date);
    
    return await transactionRepository.create({
      transactionId,
      ...data,
      isAnalysis: true,
      sourceType: 'ai_generated'
    });
  }

  async getMonthlySummary(year: number, month: number, userId?: string) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const transactions = await transactionRepository.findByDateRange(
      startDate,
      endDate,
      userId
    );

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = transactions
      .filter(t => t.type === 'expense' && t.isAnalysis)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    return {
      income,
      expense,
      netCashflow: income - expense,
      transactionCount: transactions.length
    };
  }
}

export const transactionService = new TransactionService();
```

**5. 增强飞书聊天服务** (2小时)
```typescript
// lib/services/feishu-chat.ts (增强)
import { transactionService } from './transaction.service';
import { modelManager } from '@/lib/models/manager';
import { replyMessage, sendMessage } from '@/lib/feishu/messages';

export const feishuChatService = {
  async handleUserMessage(context: FeishuMessageContext) {
    this.processAITask(context).catch(err => {
      console.error(`[FeishuChatService] 异步任务执行失败:`, err);
    });
    return { success: true };
  },

  async processAITask(context: FeishuMessageContext) {
    const { messageId, text, senderId } = context;

    try {
      // 1. 判断是查询还是记账
      if (this.isQuery(text)) {
        await this.handleQuery(messageId, text, senderId);
        return;
      }

      // 2. 记账流程
      await replyMessage(messageId, `⏳ 正在解析记账信息...`);

      // 3. 调用AI解析
      const prompt = this.buildAccountingPrompt(text);
      const result = await modelManager.chat('doubao', [
        { role: 'user', content: prompt }
      ]);

      // 4. 解析AI返回结果
      const transactionData = this.parseAIResponse(result.choices[0].message.content);

      // 5. 生成确认消息
      await this.sendConfirmationMessage(messageId, transactionData, senderId);

    } catch (err: any) {
      console.error(`[FeishuChatService] 流程执行失败:`, err);
      await replyMessage(messageId, `❌ 处理失败: ${err.message}`);
    }
  },

  isQuery(text: string): boolean {
    const queryKeywords = ['花了', '消费', '支出', '收入', '查询', '统计'];
    return queryKeywords.some(keyword => text.includes(keyword));
  },

  async handleQuery(messageId: string, text: string, userId: string) {
    // 简单查询逻辑
    const now = new Date();
    const summary = await transactionService.getMonthlySummary(
      now.getFullYear(),
      now.getMonth() + 1,
      userId
    );

    const message = `📊 本月消费统计

收入: ¥${summary.income.toFixed(2)}
支出: ¥${summary.expense.toFixed(2)}
净现金流: ¥${summary.netCashflow.toFixed(2)}
交易笔数: ${summary.transactionCount}笔`;

    await replyMessage(messageId, message);
  },

  buildAccountingPrompt(text: string): string {
    return `你是一个记账助手。请从以下文本中提取记账信息，返回JSON格式：
{
  "date": "YYYY-MM-DD",
  "type": "expense" 或 "income",
  "level1Category": "一级分类",
  "level2Category": "二级分类",
  "amount": 金额（数字）,
  "paymentChannel": "wechat" 或 "alipay" 或 "cash" 等,
  "description": "备注"
}

用户输入: ${text}

如果信息不完整，请根据常见场景推断。日期默认为今天。`;
  },

  parseAIResponse(content: string): any {
    try {
      // 提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('无法解析AI返回结果');
    } catch (e) {
      throw new Error('AI返回格式错误');
    }
  },

  async sendConfirmationMessage(
    messageId: string,
    data: any,
    userId: string
  ) {
    // 发送确认卡片（简化版，使用文本消息）
    const message = `✅ 已解析记账信息：

日期: ${data.date || new Date().toLocaleDateString()}
类型: ${data.type === 'expense' ? '支出' : '收入'}
分类: ${data.level1Category}/${data.level2Category}
金额: ¥${data.amount}
支付渠道: ${data.paymentChannel}

回复"确认"保存，或回复"取消"放弃。`;

    await replyMessage(messageId, message);
  }
};
```

---

## 🧪 测试脚本

```typescript
// scripts/test-mvp.ts
import { transactionService } from '@/lib/services/transaction.service';
import { prisma } from '@/lib/prisma';

async function testMVP() {
  console.log('🧪 测试MVP功能...\n');

  // 1. 测试创建交易
  console.log('1. 测试创建交易...');
  const tx = await transactionService.createTransaction({
    date: new Date(),
    type: 'expense',
    level1Category: '餐饮',
    level2Category: '午餐',
    amount: 35,
    paymentChannel: 'wechat',
    userId: 'test_user',
    description: '测试交易'
  });
  console.log('✅ 交易创建成功:', tx.transactionId);

  // 2. 测试月度统计
  console.log('\n2. 测试月度统计...');
  const now = new Date();
  const summary = await transactionService.getMonthlySummary(
    now.getFullYear(),
    now.getMonth() + 1,
    'test_user'
  );
  console.log('✅ 月度统计:', summary);

  // 3. 清理测试数据
  console.log('\n3. 清理测试数据...');
  await prisma.transaction.delete({
    where: { transactionId: tx.transactionId }
  });
  console.log('✅ 测试完成');
}

testMVP().catch(console.error);
```

---

## ✅ MVP验收 checklist

### 功能验收
- [ ] 发送"瑞幸 35" → AI解析成功
- [ ] 发送"确认" → 交易保存到数据库
- [ ] 发送"这个月花了多少钱" → 返回统计结果
- [ ] 发送"取消" → 交易不保存

### 数据验收
- [ ] 交易数据正确保存
- [ ] 分类数据存在
- [ ] 月度统计计算正确

### 性能验收
- [ ] 消息处理时间 < 5秒
- [ ] 数据库查询 < 500ms

---

## 🐛 常见问题

### Q1: AI解析不准确怎么办？
A: MVP阶段接受70%准确率，重点优化提示词，后续通过用户反馈学习提升。

### Q2: 如何处理用户修改？
A: MVP阶段简化处理，用户回复"修改"后重新解析，后续版本实现交互式修改。

### Q3: 数据库连接失败？
A: 检查 `.env.local` 中的 `DATABASE_URL` 配置。

---

## 📚 下一步

MVP完成后，进入 **Phase 1: V1.0**，添加：
- 图片记账功能
- 批量记账功能
- 增强的查询功能

详见 `mvp_implementation_plan.md`
