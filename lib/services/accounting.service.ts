import { prisma } from '../prisma';
import { tagService } from './tag.service';
import { modelManager } from '../models/manager';
import { buildPrompt, getPromptConfig } from '../prompts';
import { 
  TransactionType, 
  PaymentChannel, 
  SourceType, 
  PrepaidStatus, 
  GoalStatus, 
  GoalType, 
  Prisma,
  BillingCycle,
  SubscriptionDecision,
  UsageLevel,
  StageLabel,
  Scenario,
  InputType,
  LogStatus
} from '@/generated/prisma/client';

export interface CreateSubscriptionData {
  subscriptionName: string;
  level1Category: string;
  level2Category: string;
  billingCycle: BillingCycle;
  amount: number;
  paymentChannel: PaymentChannel;
  startDate: Date;
  renewalRule?: string;
  usageLevel?: UsageLevel;
  decision?: SubscriptionDecision;
  userId?: string;
}

export interface CreateTransactionData {
  date: Date;
  type: TransactionType;
  level1Category: string;
  level2Category: string;
  amount: number;
  paymentChannel: PaymentChannel;
  description?: string;
  isAnalysis: boolean;
  sourceType: SourceType;
  sourceId?: string;
  tags?: string[];
  userId?: string;
  aiMetadata?: any;
}

// 预付费用数据
export interface CreatePrepaidData {
  expenseName: string;
  level1Category: string;
  level2Category: string;
  totalAmount: number;
  startMonth: string;
  endMonth: string;
  months: number;
  paymentChannel: PaymentChannel;
  remark?: string;
  userId?: string;
  aiMetadata?: any;
}

// 财务服务
export const accountingService = {
  /**
   * 更新分类使用统计 (私有逻辑)
   */
  async _updateCategoryUsage(level1: string, level2: string) {
    try {
      await prisma.category.update({
        where: {
          level1Category_level2Category: {
            level1Category: level1,
            level2Category: level2,
          }
        },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        }
      });
    } catch (e: any) {
      // 容错处理：如果分类不存在（比如 AI 幻觉了一个分类），不影响主记账流程
      console.warn(`[AccountingService] 更新分类频率失败: ${level1}/${level2}. Error: ${e.message}`);
    }
  },

  /**
   * 创建通用记账流水 (Mode A, B, C)
   */
  async createTransaction(data: CreateTransactionData) {
    const transactionId = `TX${Date.now()}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
    
    const result = await prisma.transaction.create({
      data: {
        transactionId,
        date: data.date,
        type: data.type,
        level1Category: data.level1Category,
        level2Category: data.level2Category,
        amount: new Prisma.Decimal(data.amount),
        paymentChannel: data.paymentChannel,
        description: data.description,
        isAnalysis: data.isAnalysis,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        tags: data.tags || [],
        userId: data.userId,
        aiMetadata: data.aiMetadata,
      }
    });

    // 🚀 写触发：同步更新频率、快照和目标进度
    this._updateCategoryUsage(data.level1Category, data.level2Category);
    
    // 异步同步标签统计 (优化 2)
    if (data.tags && data.tags.length > 0) {
      tagService.processTransactionTags(data.tags).catch(e => {
        console.error(`[AccountingService] 异步刷新标签失败: ${e.message}`);
      });
    }
    
    const month = data.date.toISOString().slice(0, 7);
    this.generateMonthlySnapshot(month, data.userId).catch(e => {
      console.error(`[AccountingService] 异步刷新快照失败: ${e.message}`);
    });

    return result;
  },

  /**
   * 获取财务统计数据 (用于查询意图)
   */
  async getStatistics(filter: {
    startDate: Date;
    endDate: Date;
    type?: TransactionType;
    level1Category?: string;
    level2Category?: string;
    isAnalysis?: boolean;
    userId?: string;
  }) {
    const where: Prisma.TransactionWhereInput = {
      date: {
        gte: filter.startDate,
        lte: filter.endDate,
      },
    };

    if (filter.type) where.type = filter.type;
    if (filter.level1Category) where.level1Category = filter.level1Category;
    if (filter.level2Category) where.level2Category = filter.level2Category;
    if (filter.isAnalysis !== undefined) where.isAnalysis = filter.isAnalysis;
    if (filter.userId) where.userId = filter.userId;

    const stats = await prisma.transaction.aggregate({
      where,
      _sum: {
        amount: true,
      },
      _count: {
        transactionId: true,
      },
    });

    return {
      totalAmount: stats._sum.amount ? Number(stats._sum.amount) : 0,
      count: stats._count.transactionId,
      period: {
        start: filter.startDate.toISOString().split('T')[0],
        end: filter.endDate.toISOString().split('T')[0],
      }
    };
  },

  /**
   * 获取分类明细统计
   */
  async getCategoryBreakdown(filter: {
    startDate: Date;
    endDate: Date;
    type?: TransactionType;
    userId?: string;
  }) {
    const where: Prisma.TransactionWhereInput = {
      date: {
        gte: filter.startDate,
        lte: filter.endDate,
      },
    };
    if (filter.type) where.type = filter.type;
    if (filter.userId) where.userId = filter.userId;

    const groups = await prisma.transaction.groupBy({
      by: ['level1Category', 'level2Category'],
      where,
      _sum: {
        amount: true,
      },
      _count: {
        transactionId: true,
      },
      orderBy: {
        _sum: {
          amount: 'asc', // 支出为负，asc 会将绝对值大的排在前面
        }
      }
    });

    return groups.map(g => ({
      level1: g.level1Category,
      level2: g.level2Category,
      amount: g._sum.amount ? Number(g._sum.amount) : 0,
      count: g._count.transactionId,
    }));
  },

  /**
   * 执行预付分摊 (由定时任务或手动触发)
   */
  async runAmortization(targetMonth?: string) {
    const month = targetMonth || new Date().toISOString().slice(0, 7); // YYYY-MM
    console.log(`[Amortization] 开始执行 ${month} 份的分摊任务...`);

    // 1. 查找所有需要摊销的项目
    const prepaids = await prisma.prepaidExpense.findMany({
      where: {
        status: PrepaidStatus.in_progress,
        startMonth: { lte: month },
        endMonth: { gte: month },
        // 确保本月还未分摊过
        OR: [
          { lastAmortizedMonth: null },
          { lastAmortizedMonth: { lt: month } }
        ]
      }
    });

    console.log(`[Amortization] 发现 ${prepaids.length} 条待摊销项目`);

    const results = [];
    for (const item of prepaids) {
      try {
        const tx = await this._processSingleAmortization(item, month);
        results.push({ id: item.prepaidId, success: true, transactionId: tx.transactionId });
      } catch (e: any) {
        console.error(`[Amortization] 项目 ${item.prepaidId} 分摊失败: ${e.message}`);
        results.push({ id: item.prepaidId, success: false, error: e.message });
      }
    }

    return { month, total: prepaids.length, results };
  },

  /**
   * 处理单笔预付分摊
   */
  async _processSingleAmortization(item: any, month: string) {
    const result = await prisma.$transaction(async (tx) => {
      // 1. 计算摊销金额
      let amortAmount = Number(item.monthlyAmount);
      
      // 尾差处理：如果是最后一个月，则取剩余全部金额
      if (month === item.endMonth) {
        // 查询该项目已有的摊销总额 (不含本次)
        const alreadyAmortized = await tx.transaction.aggregate({
          where: {
            sourceType: SourceType.prepaid_amortization,
            sourceId: item.prepaidId,
            type: TransactionType.expense,
          },
          _sum: { amount: true }
        });
        
        const sum = alreadyAmortized._sum.amount ? Math.abs(Number(alreadyAmortized._sum.amount)) : 0;
        amortAmount = Number(item.totalAmount) - sum;
      }

      // 2. 创建支出流水
      const transactionId = `TX${Date.now()}AMORT-${item.prepaidId.slice(-4)}`;
      const amortResult = await tx.transaction.create({
        data: {
          transactionId,
          date: new Date(`${month}-01`), // 默认摊销在每月1号
          type: TransactionType.expense,
          level1Category: item.level1Category,
          level2Category: item.level2Category,
          amount: new Prisma.Decimal(-amortAmount),
          paymentChannel: item.paymentChannel,
          description: `[预付摊销] ${item.expenseName} (${month})`,
          isAnalysis: true,
          sourceType: SourceType.prepaid_amortization,
          sourceId: item.prepaidId,
          userId: item.userId, // ✅ 修复点：继承预付项目的 userId
          ledgerId: item.ledgerId, // 同时继承账本 ID
        }
      });

      // 3. 更新预付项目进度
      await tx.prepaidExpense.update({
        where: { prepaidId: item.prepaidId },
        data: {
          lastAmortizedMonth: month,
          status: month === item.endMonth ? PrepaidStatus.completed : PrepaidStatus.in_progress
        }
      });

      return amortResult;
    });

    // 🚀 写触发：摊销也是真实支出，刷新快照
    this.generateMonthlySnapshot(month, item.userId).catch(e => {
      console.error(`[AccountingService] 摊销后刷新快照失败: ${e.message}`);
    });

    return result;
  },

  /**
   * 创建预付费用 (Mode D)
   */
  async createPrepaidExpense(data: CreatePrepaidData) {
    const prepaidId = `PRE${Date.now()}`;
    const monthlyAmount = Number((data.totalAmount / data.months).toFixed(2));

    const result = await prisma.$transaction(async (tx) => {
      // 1. 创建预付事项记录
      const prepaid = await (tx.prepaidExpense as any).create({
        data: {
          prepaidId,
          expenseName: data.expenseName,
          level1Category: data.level1Category,
          level2Category: data.level2Category,
          totalAmount: new Prisma.Decimal(data.totalAmount),
          startMonth: data.startMonth,
          endMonth: data.endMonth,
          months: data.months,
          monthlyAmount: new Prisma.Decimal(monthlyAmount),
          paymentChannel: data.paymentChannel,
          status: PrepaidStatus.in_progress,
          remark: data.remark,
          userId: data.userId, // ✅ 修复点：记录创建者的 userId
        }
      });

      // 2. 创建一笔“资产变动”流水记录现金流出 (Mode D 的现金流发生当下)
      const transactionId = `TX${Date.now()}PRE`;
      await tx.transaction.create({
        data: {
          transactionId,
          date: new Date(),
          type: TransactionType.asset_change,
          level1Category: '资产变动',
          level2Category: '预付费用',
          amount: new Prisma.Decimal(-data.totalAmount),
          paymentChannel: data.paymentChannel,
          description: `[预付付款] ${data.expenseName}`,
          isAnalysis: false,
          sourceType: SourceType.prepaid_payment,
          sourceId: prepaidId,
          userId: data.userId,
          aiMetadata: data.aiMetadata,
        }
      });

      return { ...prepaid, transactionId };
    });

    // 预付费用针对的是最终消费分类的预定，更新其频率
    this._updateCategoryUsage(data.level1Category, data.level2Category);

    // 🚀 写触发：虽然资产变动不计入消费，但会计入现金流，刷新快照
    const month = new Date().toISOString().slice(0, 7);
    this.generateMonthlySnapshot(month, data.userId).catch(e => {
      console.error(`[AccountingService] 创建预付后刷新快照失败: ${e.message}`);
    });

    return result;
  },

  /**
   * 设置或更新预算 (PRD §7)
   */
  async setBudget(data: {
    month: string;
    level1Category: string;
    level2Category: string;
    budgetAmount: number;
    remark?: string;
    userId?: string;
  }) {
    const userId = data.userId || 'system';
    return await prisma.budget.upsert({
      where: {
        month_level1Category_level2Category_userId: {
          month: data.month,
          level1Category: data.level1Category,
          level2Category: data.level2Category,
          userId
        }
      },
      update: {
        budgetAmount: new Prisma.Decimal(data.budgetAmount),
        remark: data.remark,
      },
      create: {
        month: data.month,
        level1Category: data.level1Category,
        level2Category: data.level2Category,
        budgetAmount: new Prisma.Decimal(data.budgetAmount),
        remark: data.remark,
        userId
      }
    });
  },

  /**
   * 获取月度预算执行进度 (PRD §7)
   * 优化版：使用 groupBy 解决 N+1 查询问题
   */
  async getBudgetStatus(month: string, userId?: string) {
    // 1. 获取该月所有预算
    const budgets = await prisma.budget.findMany({
      where: { month }
    });

    if (budgets.length === 0) {
      return { month, budgets: [], totalBudget: 0, totalActual: 0 };
    }

    // 2. 准备时间范围
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    // 3. 一次性聚合所有预算分类的支出情况 (模式 A)
    const actuals = await prisma.transaction.groupBy({
      by: ['level1Category', 'level2Category'],
      where: {
        type: TransactionType.expense,
        isAnalysis: true,
        date: { gte: startDate, lte: endDate },
        userId
      },
      _sum: { amount: true }
    });

    // 4. 将聚合结果转为 Map 方便匹配
    const actualMap = new Map<string, number>();
    actuals.forEach(a => {
      const key = `${a.level1Category}/${a.level2Category}`;
      actualMap.set(key, Math.abs(Number(a._sum.amount || 0)));
    });

    // 5. 组装结果
    const results = budgets.map(budget => {
      const key = `${budget.level1Category}/${budget.level2Category}`;
      const actualAmount = actualMap.get(key) || 0;
      const budgetAmount = Number(budget.budgetAmount);
      
      return {
        level1: budget.level1Category,
        level2: budget.level2Category,
        budget: budgetAmount,
        actual: actualAmount,
        remaining: budgetAmount - actualAmount,
        percent: budgetAmount > 0 ? Number((actualAmount / budgetAmount * 100).toFixed(1)) : 0
      };
    });
    
    return {
      month,
      budgets: results,
      totalBudget: results.reduce((sum, b) => sum + b.budget, 0),
      totalActual: results.reduce((sum, b) => sum + b.actual, 0)
    };
  },

  /**
   * 创建或更新财务目标 (PRD §12.2)
   */
  async createOrUpdateGoal(data: {
    goalId?: string;
    goalText: string;
    goalType: any;
    targetAmount?: number;
    currentAmount?: number;
    targetDate?: Date;
    priority?: number;
    userId?: string;
  }) {
    const goalId = data.goalId || `G${Date.now()}`;
    return await prisma.financialGoal.upsert({
      where: { goalId },
      update: {
        goalText: data.goalText,
        goalType: data.goalType,
        targetAmount: data.targetAmount ? new Prisma.Decimal(data.targetAmount) : null,
        currentAmount: data.currentAmount ? new Prisma.Decimal(data.currentAmount) : null,
        targetDate: data.targetDate,
        priority: data.priority,
        userId: data.userId,
      },
      create: {
        goalId,
        goalText: data.goalText,
        goalType: data.goalType,
        targetAmount: data.targetAmount ? new Prisma.Decimal(data.targetAmount) : null,
        currentAmount: data.currentAmount ? new Prisma.Decimal(data.currentAmount) : null,
        targetDate: data.targetDate,
        priority: data.priority || 0,
        userId: data.userId,
      }
    });
  },

  /**
   * 获取所有财务目标及进度摘要
   */
  async getFinancialGoals(userId?: string) {
    const goals = await (prisma.financialGoal as any).findMany({
      where: { userId },
      orderBy: { priority: 'desc' }
    });

    return goals.map((g: any) => {
      const target = g.targetAmount ? Number(g.targetAmount) : 0;
      const current = g.currentAmount ? Number(g.currentAmount) : 0;
      const progress = target > 0 ? Number((current / target * 100).toFixed(1)) : 0;
      
      return {
        id: g.goalId,
        text: g.goalText,
        type: g.goalType,
        targetAmount: target,
        currentAmount: current,
        targetDate: g.targetDate ? g.targetDate.toISOString().split('T')[0] : null,
        progress,
        status: g.status
      };
    });
  },

  /**
   * 检查单笔交易是否触发预算预警 (用于主动预警)
   */
  async checkBudgetAlert(params: {
    month: string;
    level1: string;
    level2: string;
    userId?: string;
  }) {
    const userId = params.userId || 'system';
    // 1. 查找是否存在对应预算
    const budget = await prisma.budget.findUnique({
      where: {
        month_level1Category_level2Category_userId: {
          month: params.month,
          level1Category: params.level1,
          level2Category: params.level2,
          userId
        }
      }
    });

    if (!budget) return null;

    // 2. 统计当前总支出
    const startDate = new Date(`${params.month}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    const actual = await prisma.transaction.aggregate({
      where: {
        type: TransactionType.expense,
        isAnalysis: true,
        level1Category: params.level1,
        level2Category: params.level2,
        date: { gte: startDate, lte: endDate },
        userId: params.userId
      },
      _sum: { amount: true }
    });

    const actualAmount = actual._sum.amount ? Math.abs(Number(actual._sum.amount)) : 0;
    const budgetAmount = Number(budget.budgetAmount);
    const percent = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0;

    // 3. 只有超过 80% 才触发预警
    if (percent >= 80) {
      return {
        percent: Number(percent.toFixed(1)),
        budgetAmount,
        actualAmount,
        isOver: percent >= 100
      };
    }
    return null;
  },

  /**
   * 生成并保存月度财务快照 (PRD §12.3)
   * 🚀 写触发核心：计算收入、支出、结余及 Top3 分类
   */
  async generateMonthlySnapshot(month: string, userId?: string) {
    console.log(`[Snapshot] 正在刷新 ${month} 的财务快照...`);
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    // 1. 计算总收入 (所有 type=income)
    const incomeStats = await prisma.transaction.aggregate({
      where: { 
        type: TransactionType.income, 
        date: { gte: startDate, lte: endDate },
        userId 
      },
      _sum: { amount: true }
    });

    // 2. 计算总消费 (Mode A: type=expense AND isAnalysis=true)
    const expenseStats = await prisma.transaction.aggregate({
      where: { 
        type: TransactionType.expense, 
        isAnalysis: true, 
        date: { gte: startDate, lte: endDate },
        userId 
      },
      _sum: { amount: true }
    });

    // 3. 获取 Top 3 消费分类 (一级分类)
    const topCats = await prisma.transaction.groupBy({
      by: ['level1Category'],
      where: { 
        type: TransactionType.expense, 
        isAnalysis: true, 
        date: { gte: startDate, lte: endDate },
        userId 
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'asc' } }, // 支出为负，asc 会将绝对值大的排在前面
      take: 3
    });

    const monthlyIncome = Number(incomeStats._sum.amount || 0);
    const monthlyExpense = Math.abs(Number(expenseStats._sum.amount || 0));
    const netCashflow = monthlyIncome - monthlyExpense;
    
    const topCategoriesText = topCats.map(c => {
      const amt = Math.abs(Number(c._sum.amount || 0));
      const ratio = monthlyExpense > 0 ? (amt / monthlyExpense * 100).toFixed(1) : '0';
      return `${c.level1Category}(¥${amt.toFixed(0)}/${ratio}%)`;
    }).join('、');

    // 4. 保存快照
    const snapshot = await prisma.monthlyFinancialSnapshot.upsert({
      where: { 
        month_userId: {
          month,
          userId: userId || 'system'
        }
      },
      update: {
        monthlyIncome: new Prisma.Decimal(monthlyIncome),
        monthlyExpense: new Prisma.Decimal(monthlyExpense),
        netCashflow: new Prisma.Decimal(netCashflow),
        topCategories: topCategoriesText
      },
      create: {
        month,
        userId: userId || 'system',
        monthlyIncome: new Prisma.Decimal(monthlyIncome),
        monthlyExpense: new Prisma.Decimal(monthlyExpense),
        netCashflow: new Prisma.Decimal(netCashflow),
        topCategories: topCategoriesText
      }
    });

    // 5. 🚀 联动：根据最新结余校准财务目标进度
    await this.reconcileGoalProgress(userId);

    return snapshot;
  },

  /**
   * 自动对账财务目标进度
   * 逻辑：当前进度 = 目标创建以来的所有月度结余之和
   */
  async reconcileGoalProgress(userId?: string) {
    const activeGoals = await prisma.financialGoal.findMany({
      where: { 
        userId, 
        status: GoalStatus.in_progress, 
        goalType: GoalType.save_money 
      }
    });

    if (activeGoals.length === 0) return;

    for (const goal of activeGoals) {
      // 汇总从目标创建月份至今的所有快照结余
      const startMonth = goal.createdAt.toISOString().slice(0, 7);
      const snapshots = await prisma.monthlyFinancialSnapshot.findMany({
        where: { month: { gte: startMonth } }
      });
      
      const totalSurplus = snapshots.reduce((sum, s) => sum + Number(s.netCashflow), 0);
      
      await prisma.financialGoal.update({
        where: { goalId: goal.goalId },
        data: { currentAmount: new Prisma.Decimal(totalSurplus) }
      });
      
      console.log(`[GoalSync] 目标 [${goal.goalText}] 进度已校准为: ¥${totalSurplus.toFixed(2)}`);
    }
  },

  /**
   * 生成历史消费行为摘要 (优化 思考部分)
   * 职责：统计 -> AI 分析 -> 持久化
   */
  async generateHistorySummary(params: {
    userId: string;
    window: 'last_30_days' | 'last_90_days' | 'last_12_months';
  }) {
    const { userId, window } = params;
    const startTime = Date.now();
    const logId = `LOG_SUM_${Date.now()}`;
    console.log(`[HistorySummary] 正在为用户 ${userId} 生成 ${window} 摘要...`);

    // 1. 计算时间范围（当前周期 & 对比周期）
    // ... 原有逻辑 ...
    const now = new Date();
    let startDate = new Date();
    let compStartDate = new Date();
    let compEndDate = new Date();

    if (window === 'last_30_days') {
      startDate.setDate(now.getDate() - 30);
      compEndDate.setDate(now.getDate() - 31);
      compStartDate.setDate(now.getDate() - 60);
    } else if (window === 'last_90_days') {
      startDate.setDate(now.getDate() - 90);
      compEndDate.setDate(now.getDate() - 91);
      compStartDate.setDate(now.getDate() - 180);
    } else if (window === 'last_12_months') {
      startDate.setFullYear(now.getFullYear() - 1);
      compEndDate.setFullYear(now.getFullYear() - 1);
      compEndDate.setDate(compEndDate.getDate() - 1);
      compStartDate.setFullYear(now.getFullYear() - 2);
    }

    // 2. 统计核心数据
    const [stats, breakdown, compStats] = await Promise.all([
      this.getStatistics({
        startDate,
        endDate: now,
        type: TransactionType.expense,
        isAnalysis: true,
        userId
      }),
      this.getCategoryBreakdown({
        startDate,
        endDate: now,
        type: TransactionType.expense,
        userId
      }),
      this.getStatistics({
        startDate: compStartDate,
        endDate: compEndDate,
        type: TransactionType.expense,
        isAnalysis: true,
        userId
      })
    ]);

    // 3. 调用 AI 生成解读
    const config = await getPromptConfig('financial-analyst');
    if (!config) throw new Error('未找到分析助手预设 [financial-analyst]');

    const statsText = `
    - 总支出: ¥${stats.totalAmount.toFixed(2)}
    - 交易笔数: ${stats.count}
    - 消费构成: ${breakdown.slice(0, 5).map(b => `${b.level1}/${b.level2}(¥${Math.abs(b.amount).toFixed(0)})`).join('、')}
    `;

    const compStatsText = `
    - 总支出: ¥${compStats.totalAmount.toFixed(2)}
    - 交易笔数: ${compStats.count}
    `;

    const builtPrompt = buildPrompt(config, {
      userId,
      window,
      stats: statsText,
      comparisonStats: compStatsText
    });

    const aiResult = await modelManager.chat('doubao', builtPrompt.messages, { 
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    let historySummary = '生成失败';
    let keyPatterns = '';
    let anomalies = '';
    let finalStatus: LogStatus = LogStatus.success;
    let errorMessage = '';

    try {
      const content = aiResult.choices[0].message.content?.toString();
      if (content) {
        const parsed = JSON.parse(content);
        historySummary = parsed.summary || '解析失败';
        keyPatterns = typeof parsed.patterns === 'string' ? parsed.patterns : JSON.stringify(parsed.patterns);
        anomalies = typeof parsed.risks === 'string' ? parsed.risks : JSON.stringify(parsed.risks);
      }
    } catch (e: any) {
      console.error('[HistorySummary] 解析 AI 结果失败:', e);
      finalStatus = LogStatus.fail;
      errorMessage = e.message;
    }

    // 🚀 补全：记录审计日志 (优化实现)
    await prisma.aIGenerationLog.create({
      data: {
        logId,
        userId,
        scenario: Scenario.stage_analysis,
        inputType: InputType.text,
        inputText: `Generate history summary for window: ${window}`,
        modelName: aiResult.model || 'doubao',
        outputRaw: JSON.stringify(aiResult.choices[0].message),
        outputParsed: historySummary,
        confidence: 0.9,
        status: finalStatus,
        errorMessage: errorMessage || null,
        latencyMs: Date.now() - startTime,
        tokenUsage: aiResult.usage?.total_tokens || 0,
        promptVersion: config.version || 'unknown'
      }
    }).catch(err => console.error('[HistorySummary] 保存审计日志失败:', err));

    // 4. 持久化到数据库
    return await prisma.userHistorySummary.upsert({
      where: {
        userId_window: { userId, window }
      },
      update: {
        historySummary,
        keyPatterns,
        anomalies,
        updatedAt: new Date()
      },
      create: {
        userId,
        window,
        historySummary,
        keyPatterns,
        anomalies
      }
    });
  },

  /**
   * 生成 AI 阶段分析报告 (PRD §12.5)
   * 职责：聚合快照、目标、历史摘要 -> AI 诊断 -> 持久化
   */
  async generateStageAnalysis(params: {
    userId: string;
    period: string; // YYYY-MM
  }) {
    const { userId, period } = params;
    const startTime = Date.now();
    const logId = `LOG_STAGE_${Date.now()}`;
    console.log(`[StageAnalysis] 正在为用户 ${userId} 生成 ${period} 阶段诊断...`);

    // 1. 聚合上下文数据
    const [snapshot, historySummary, goals] = await Promise.all([
      prisma.monthlyFinancialSnapshot.findUnique({
        where: { month_userId: { month: period, userId: userId || 'system' } }
      }),
      prisma.userHistorySummary.findFirst({
        where: { userId, window: 'last_90_days' },
        orderBy: { updatedAt: 'desc' }
      }),
      this.getFinancialGoals(userId)
    ]);

    if (!snapshot) {
      throw new Error(`[StageAnalysis] 未找到 ${period} 的财务快照，请先生成快照`);
    }

    // 2. 调用 AI 进行诊断
    const config = await getPromptConfig('stage-analyst');
    if (!config) throw new Error('未找到阶段分析预设 [stage-analyst]');

    const snapshotText = `
    - 收入: ¥${snapshot.monthlyIncome.toFixed(2)}
    - 支出: ¥${snapshot.monthlyExpense.toFixed(2)}
    - 净结余: ¥${snapshot.netCashflow.toFixed(2)}
    - Top 分类: ${snapshot.topCategories}
    `;

    const goalsText = goals.length > 0 
      ? goals.map((g: any) => `- ${g.text} (进度: ${g.progress}%)`).join('\n')
      : '未设定明确目标';

    const builtPrompt = buildPrompt(config, {
      period,
      snapshot: snapshotText,
      historySummary: historySummary?.historySummary || '暂无历史摘要',
      financialGoals: goalsText
    });

    const aiResult = await modelManager.chat('doubao', builtPrompt.messages, {
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    let stageLabel: StageLabel = 'stable' as StageLabel;
    let stageAnalysis = '生成失败';
    let recommendations = '';
    let confidence = 0.5;
    let finalStatus: LogStatus = LogStatus.success;
    let errorMessage = '';

    try {
      const content = aiResult.choices[0].message.content?.toString();
      if (content) {
        const parsed = JSON.parse(content);
        stageLabel = (parsed.stage_label?.toLowerCase() || 'stable') as StageLabel;
        stageAnalysis = parsed.analysis || '解析失败';
        recommendations = Array.isArray(parsed.recommendations) 
          ? parsed.recommendations.join('\n') 
          : (parsed.recommendations || '');
        confidence = parsed.confidence || 0.8;
      }
    } catch (e: any) {
      console.error('[StageAnalysis] 解析 AI 结果失败:', e);
      finalStatus = LogStatus.fail;
      errorMessage = e.message;
    }

    // 3. 记录审计日志
    await prisma.aIGenerationLog.create({
      data: {
        logId,
        userId,
        scenario: Scenario.stage_analysis,
        inputType: InputType.text,
        inputText: `Generate stage analysis for period: ${period}`,
        modelName: aiResult.model || 'doubao',
        outputRaw: JSON.stringify(aiResult.choices[0].message),
        outputParsed: stageAnalysis,
        confidence: new Prisma.Decimal(confidence),
        status: finalStatus,
        errorMessage: errorMessage || null,
        latencyMs: Date.now() - startTime,
        tokenUsage: aiResult.usage?.total_tokens || 0,
        promptVersion: config.version || 'unknown',
        contextMonth: period
      }
    }).catch(err => console.error('[StageAnalysis] 保存审计日志失败:', err));

    if (finalStatus === LogStatus.fail) {
      throw new Error(`[StageAnalysis] AI 生成失败: ${errorMessage}`);
    }

    // 4. 持久化到数据库
    return await prisma.aIStageAnalysis.upsert({
      where: {
        userId_period_stageLabel: {
          userId: userId || 'system',
          period,
          stageLabel
        }
      },
      update: {
        stageAnalysis,
        recommendations,
        confidence: new Prisma.Decimal(confidence),
        modelVersion: `${aiResult.model}-${config.version}`,
        updatedAt: new Date()
      },
      create: {
        userId: userId || 'system',
        period,
        stageLabel,
        stageAnalysis,
        recommendations,
        confidence: new Prisma.Decimal(confidence),
        modelVersion: `${aiResult.model}-${config.version}`
      }
    });
  },

  /**
   * 创建订阅记录
   */
  async createSubscription(data: CreateSubscriptionData) {
    const subscriptionId = `SUB${Date.now()}`;
    const sub = await prisma.subscription.create({
      data: {
        subscriptionId,
        subscriptionName: data.subscriptionName,
        level1Category: data.level1Category,
        level2Category: data.level2Category,
        billingCycle: data.billingCycle,
        amount: new Prisma.Decimal(data.amount),
        paymentChannel: data.paymentChannel,
        startDate: data.startDate,
        renewalRule: data.renewalRule,
        isActive: true,
        usageLevel: data.usageLevel || UsageLevel.medium,
        decision: data.decision || SubscriptionDecision.watch,
        userId: data.userId,
      }
    });

    // 🚀 优化 6: 如果是年付订阅，自动创建一条摊销记录 (联动 Mode D)
    if (data.billingCycle === BillingCycle.yearly) {
      const startMonth = data.startDate.toISOString().slice(0, 7);
      const endMonthDate = new Date(data.startDate);
      endMonthDate.setFullYear(endMonthDate.getFullYear() + 1);
      endMonthDate.setMonth(endMonthDate.getMonth() - 1);
      const endMonth = endMonthDate.toISOString().slice(0, 7);

      await this.createPrepaidExpense({
        expenseName: `[订阅摊销] ${data.subscriptionName}`,
        totalAmount: data.amount,
        level1Category: data.level1Category,
        level2Category: data.level2Category,
        months: 12,
        startMonth,
        endMonth,
        paymentChannel: data.paymentChannel,
        userId: data.userId,
        remark: `由订阅 ${subscriptionId} 自动生成`,
      });
    }

    return sub;
  },

  /**
   * 获取订阅列表
   */
  async getSubscriptions(userId?: string) {
    return await prisma.subscription.findMany({
      where: {
        isActive: true,
        userId: userId || undefined
      },
      orderBy: { startDate: 'desc' }
    });
  },

  /**
   * 处理订阅扣费流水生成 (优化 1)
   * 逻辑：扫描所有活跃订阅，检查今天是否是扣费日
   */
  async processSubscriptionBills() {
    console.log(`[Subscription] 开始扫描订阅扣费任务...`);
    const today = new Date();
    const todayDay = today.getDate();
    
    const activeSubs = await prisma.subscription.findMany({
      where: { isActive: true }
    });

    let processedCount = 0;
    for (const sub of activeSubs) {
      // 简化逻辑：如果 startDate 的日期部分等于今天日期，且不是年付（年付通过摊销处理）
      // 或者解析 renewalRule 中的 "每月 X 号"
      let isBillDay = false;
      const subStartDay = new Date(sub.startDate).getDate();
      
      if (sub.billingCycle === BillingCycle.monthly) {
        if (subStartDay === todayDay) {
          isBillDay = true;
        } else if (sub.renewalRule?.includes(`${todayDay}号`)) {
          isBillDay = true;
        }
      } else if (sub.billingCycle === BillingCycle.yearly) {
        // 年付订阅在扣费当天产生一笔大额资产变动记录（类似预付逻辑）
        // 这里的逻辑可以根据需求调整，目前由于 createSubscription 已经处理了年付联动 Prepaid
        // 这里主要处理月付的常规流水
      }

      if (isBillDay && sub.billingCycle === BillingCycle.monthly) {
        await this.createTransaction({
          date: today,
          type: TransactionType.expense,
          level1Category: sub.level1Category,
          level2Category: sub.level2Category,
          amount: -Number(sub.amount),
          paymentChannel: sub.paymentChannel,
          description: `[自动订阅扣费] ${sub.subscriptionName}`,
          isAnalysis: true,
          sourceType: SourceType.ai_generated, // 借用 AI 类型或新增类型
          sourceId: sub.subscriptionId,
          userId: sub.userId || undefined
        });
        processedCount++;
      }
    }

    return { total: activeSubs.length, processed: processedCount };
  },

  /**
   * 扣费预警推送 (优化 5)
   * 逻辑：提前 2 天提醒
   */
  async checkSubscriptionReminders() {
    const reminderDays = 2;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + reminderDays);
    const targetDay = targetDate.getDate();

    const upcomingSubs = await prisma.subscription.findMany({
      where: { 
        isActive: true,
        billingCycle: BillingCycle.monthly
      }
    });

    const reminders = [];
    for (const sub of upcomingSubs) {
      const subStartDay = new Date(sub.startDate).getDate();
      if (subStartDay === targetDay) {
        reminders.push({
          userId: sub.userId,
          message: `🔔 **订阅扣费预警**：\n您的订阅“${sub.subscriptionName}”预计将在 ${reminderDays} 天后扣费 ¥${Number(sub.amount)}。`
        });
      }
    }
    return reminders;
  },

  /**
   * 取消/禁用订阅
   */
  async toggleSubscription(subscriptionId: string, isActive: boolean) {
    return await prisma.subscription.update({
      where: { subscriptionId },
      data: { isActive }
    });
  }
};
