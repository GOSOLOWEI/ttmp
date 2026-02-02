import { accountingService } from '../services/accounting.service';
import { prisma } from '../prisma';
import { TransactionType, PaymentChannel, SourceType, BillingCycle } from '@/generated/prisma/client';

/**
 * 记录订阅工具 (Mode E)
 */
export const recordSubscriptionTool = {
  type: 'function',
  function: {
    name: 'record_subscription',
    description: '记录周期性订阅服务（如 Netflix, Spotify, iCloud）。',
    parameters: {
      type: 'object',
      properties: {
        subscriptionName: { type: 'string', description: '订阅服务名称，如 "Spotify"' },
        amount: { type: 'number', description: '每期扣款金额（正数）' },
        level1Category: { type: 'string', description: '一级分类' },
        level2Category: { type: 'string', description: '二级分类' },
        billingCycle: { 
          type: 'string', 
          enum: ['monthly', 'yearly'], 
          description: '计费周期' 
        },
        paymentChannel: { 
          type: 'string', 
          enum: ['cash', 'wechat', 'alipay', 'bank_card', 'credit_card', 'huabei', 'other'],
          description: '扣款渠道' 
        },
        startDate: { type: 'string', description: '开始日期 (YYYY-MM-DD)' },
        renewalRule: { type: 'string', description: '续费规则描述，如 "每月 10 号"' }
      },
      required: ['subscriptionName', 'amount', 'level1Category', 'level2Category', 'billingCycle', 'paymentChannel', 'startDate']
    }
  }
};

/**
 * 查询订阅工具
 */
export const querySubscriptionsTool = {
  type: 'function',
  function: {
    name: 'query_subscriptions',
    description: '查询用户当前的周期性订阅服务列表及状态。',
    parameters: {
      type: 'object',
      properties: {}
    }
  }
};

/**
 * 记录通用流水工具 (Mode A, B, C)
 */
export const recordTransactionTool = {
  type: 'function',
  function: {
    name: 'record_transaction',
    description: '记录日常收支流水（包括模式 A 真实消费、模式 B 真实收入、模式 C 非分析流水）。',
    parameters: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: '金额（支出为负，收入为正）' },
        type: { type: 'string', enum: ['income', 'expense'], description: '交易类型' },
        level1Category: { type: 'string', description: '一级分类名称' },
        level2Category: { type: 'string', description: '二级分类名称' },
        paymentChannel: { 
          type: 'string', 
          enum: ['cash', 'wechat', 'alipay', 'bank_card', 'credit_card', 'huabei', 'other'],
          description: '支付渠道' 
        },
        description: { type: 'string', description: '备注说明' },
        isAnalysis: { type: 'boolean', description: '是否计入消费分析（模式 A/B 为 true，模式 C 为 false）' },
        tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
        date: { type: 'string', description: '业务发生日期 (YYYY-MM-DD)，默认为今天' },
        matchedRuleIds: { type: 'array', items: { type: 'string' }, description: '本次记账命中的个人规则 ID 列表' }
      },
      required: ['amount', 'type', 'level1Category', 'level2Category', 'paymentChannel', 'isAnalysis']
    }
  }
};

/**
 * 记录预付费用工具 (Mode D)
 */
export const recordPrepaidTool = {
  type: 'function',
  function: {
    name: 'record_prepaid_expense',
    description: '记录大额预付费用（模式 D），例如年付房租、年费会员。会自动创建预付记录和当期资产变动流水。',
    parameters: {
      type: 'object',
      properties: {
        expenseName: { type: 'string', description: '费用事项名称，如 "2026年房租"' },
        totalAmount: { type: 'number', description: '预付总金额（正数）' },
        level1Category: { type: 'string', description: '最终摊销的一级分类' },
        level2Category: { type: 'string', description: '最终摊销的二级分类' },
        months: { type: 'number', description: '总摊销月数' },
        startMonth: { type: 'string', description: '开始摊销月份 (YYYY-MM)' },
        endMonth: { type: 'string', description: '结束摊销月份 (YYYY-MM)' },
        paymentChannel: { 
          type: 'string', 
          enum: ['cash', 'wechat', 'alipay', 'bank_card', 'credit_card', 'huabei', 'other'],
          description: '付款渠道' 
        },
        remark: { type: 'string', description: '备注信息' },
        matchedRuleIds: { type: 'array', items: { type: 'string' }, description: '本次记账命中的个人规则 ID 列表' }
      },
      required: ['expenseName', 'totalAmount', 'level1Category', 'level2Category', 'months', 'startMonth', 'endMonth', 'paymentChannel']
    }
  }
};

/**
 * 财务查询工具
 */
export const queryAccountingDataTool = {
  type: 'function',
  function: {
    name: 'query_accounting_data',
    description: '查询财务统计数据。支持按日期范围、分类、交易类型进行汇总或明细查询。',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: '开始日期 (YYYY-MM-DD)' },
        endDate: { type: 'string', description: '结束日期 (YYYY-MM-DD)' },
        type: { type: 'string', enum: ['income', 'expense', 'asset_change'], description: '交易类型' },
        level1Category: { type: 'string', description: '一级分类（可选）' },
        level2Category: { type: 'string', description: '二级分类（可选）' },
        queryTarget: { 
          type: 'string', 
          enum: ['summary', 'breakdown'], 
          description: '查询目标：summary(总计汇总), breakdown(分类明细)' 
        },
        isAnalysis: { type: 'boolean', description: '是否只统计消费分析口径，默认为 true' }
      },
      required: ['startDate', 'endDate', 'queryTarget']
    }
  }
};

/**
 * 设置预算工具
 */
export const setBudgetTool = {
  type: 'function',
  function: {
    name: 'set_budget',
    description: '为特定月份和分类设置或更新预算。',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'string', description: '预算月份 (YYYY-MM)' },
        level1Category: { type: 'string', description: '一级分类' },
        level2Category: { type: 'string', description: '二级分类' },
        budgetAmount: { type: 'number', description: '预算金额（正数）' },
        remark: { type: 'string', description: '预算说明/备注' }
      },
      required: ['month', 'level1Category', 'level2Category', 'budgetAmount']
    }
  }
};

/**
 * 查询预算进度工具
 */
export const queryBudgetStatusTool = {
  type: 'function',
  function: {
    name: 'query_budget_status',
    description: '查看指定月份的预算执行进度。',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'string', description: '月份 (YYYY-MM)' }
      },
      required: ['month']
    }
  }
};

/**
 * 设置财务目标工具
 */
export const setFinancialGoalTool = {
  type: 'function',
  function: {
    name: 'set_financial_goal',
    description: '设置或更新用户的财务目标（如存钱计划、还债目标等）。',
    parameters: {
      type: 'object',
      properties: {
        goalText: { type: 'string', description: '目标描述，如 "存够3万旅行基金"' },
        goalType: { 
          type: 'string', 
          enum: ['save_money', 'repay_debt', 'control_expense', 'increase_income', 'other'],
          description: '目标类型' 
        },
        targetAmount: { type: 'number', description: '目标总金额（正数）' },
        currentAmount: { type: 'number', description: '当前已完成金额（可选）' },
        targetDate: { type: 'string', description: '期望达成日期 (YYYY-MM-DD)' },
        priority: { type: 'number', description: '优先级 (数字越大越高)' }
      },
      required: ['goalText', 'goalType']
    }
  }
};

/**
 * 查询财务目标工具
 */
export const queryFinancialGoalsTool = {
  type: 'function',
  function: {
    name: 'query_financial_goals',
    description: '查询当前所有财务目标的进度及详情。',
    parameters: {
      type: 'object',
      properties: {}
    }
  }
};

/**
 * 查询月度总结工具
 */
export const queryMonthlySnapshotTool = {
  type: 'function',
  function: {
    name: 'query_monthly_snapshot',
    description: '获取指定月份的财务快照总结（含收入、支出、结余及 Top 3 分类）。',
    parameters: {
      type: 'object',
      properties: {
        month: { type: 'string', description: '月份 (YYYY-MM)' }
      },
      required: ['month']
    }
  }
};

/**
 * 记账工具分发器
 */
export async function accountingToolDispatcher(
  toolName: string, 
  args: any, 
  context: { userId?: string, logId?: string, confidence?: number }
): Promise<{ message: string; transactionIds: string[]; matchedRuleIds?: string[] }> {
  const aiMetadata = {
    log_id: context.logId,
    confidence: context.confidence,
    source: 'ai_generated',
    matched_rules: args.matchedRuleIds // 将命中规则记录在流水元数据中
  };

  switch (toolName) {
    case 'record_transaction':
      const recordDate = args.date ? new Date(args.date) : new Date();
      const txResult = await accountingService.createTransaction({
        ...args,
        date: recordDate,
        type: args.type as TransactionType,
        paymentChannel: args.paymentChannel as PaymentChannel,
        sourceType: SourceType.ai_generated,
        sourceId: context.logId,
        userId: context.userId,
        aiMetadata
      });

      let replyMsg = `✅ 流水记录成功！(${args.level2Category} ¥${Math.abs(args.amount)})`;

      // 优化 2: 主动预算预警
      if (args.type === 'expense' && args.isAnalysis) {
        const month = recordDate.toISOString().slice(0, 7);
        const alert = await accountingService.checkBudgetAlert({
          month,
          level1: args.level1Category,
          level2: args.level2Category,
          userId: context.userId
        });
        
        if (alert) {
          if (alert.isOver) {
            replyMsg += `\n🚨 [预算超支] 该分类预算 ¥${alert.budgetAmount}，已支出 ¥${alert.actualAmount.toFixed(2)} (${alert.percent}%)！`;
          } else {
            replyMsg += `\n⚠️ [预算提醒] 该分类预算已使用 ${alert.percent}% (¥${alert.actualAmount.toFixed(2)}/¥${alert.budgetAmount})。`;
          }
        }
      }

      return {
        message: replyMsg,
        transactionIds: [txResult.transactionId],
        matchedRuleIds: args.matchedRuleIds
      };

    case 'record_prepaid_expense':
      const prepaidResult = await accountingService.createPrepaidExpense({
        ...args,
        paymentChannel: args.paymentChannel as PaymentChannel,
        userId: context.userId,
        aiMetadata
      });
      return {
        message: `✅ 预付费用创建成功！ID: ${prepaidResult.prepaidId}，已生成初始资产变动流水。`,
        transactionIds: [prepaidResult.transactionId],
        matchedRuleIds: args.matchedRuleIds
      };

    case 'query_accounting_data':
      if (args.queryTarget === 'summary') {
        const stats = await accountingService.getStatistics({
          startDate: new Date(args.startDate),
          endDate: new Date(args.endDate),
          type: args.type as TransactionType,
          level1Category: args.level1Category,
          level2Category: args.level2Category,
          isAnalysis: args.isAnalysis !== undefined ? args.isAnalysis : true,
          userId: context.userId
        });
        return {
          message: `📊 查询结果 [汇总]:\n- 时间范围: ${stats.period.start} 至 ${stats.period.end}\n- 总计金额: ¥${Math.abs(stats.totalAmount).toFixed(2)}\n- 交易笔数: ${stats.count}`,
          transactionIds: []
        };
      } else {
        const breakdown = await accountingService.getCategoryBreakdown({
          startDate: new Date(args.startDate),
          endDate: new Date(args.endDate),
          type: args.type as TransactionType || TransactionType.expense,
          userId: context.userId
        });
        const detailLines = breakdown.map(b => `- ${b.level1}/${b.level2}: ¥${Math.abs(b.amount).toFixed(2)} (${b.count}笔)`).join('\n');
        return {
          message: `📊 查询结果 [分类明细]:\n${detailLines || '无相关数据'}`,
          transactionIds: []
        };
      }

    case 'set_budget':
      await accountingService.setBudget({
        ...args,
        userId: context.userId
      } as any);
      return {
        message: `✅ 预算设置成功！[${args.month}] ${args.level2Category} 预算金额: ¥${args.budgetAmount}`,
        transactionIds: []
      };

    case 'query_budget_status':
      const status = await accountingService.getBudgetStatus(args.month, context.userId);
      if (status.budgets.length === 0) {
        return {
          message: `📭 [${args.month}] 尚未设置任何预算。`,
          transactionIds: []
        };
      }
      
      const budgetLines = status.budgets.map(b => {
        const barLength = 10;
        const filled = Math.min(barLength, Math.floor(b.percent / (100 / barLength)));
        const bar = '▓'.repeat(filled) + '░'.repeat(barLength - filled);
        return `- ${b.level2}: ¥${b.actual.toFixed(0)} / ¥${b.budget.toFixed(0)} [${bar}] ${b.percent}%`;
      }).join('\n');
      
      const footer = `\n---\n💰 总预算: ¥${status.totalBudget.toFixed(0)} | 总实际: ¥${status.totalActual.toFixed(0)}`;
      
      return {
        message: `📊 [${args.month}] 预算执行进度：\n${budgetLines}${footer}`,
        transactionIds: []
      };

    case 'set_financial_goal':
      const goal = await accountingService.createOrUpdateGoal({
        ...args,
        targetDate: args.targetDate ? new Date(args.targetDate) : undefined,
        userId: context.userId
      });
      return {
        message: `✅ 财务目标已设定！\n- 目标：${goal.goalText}\n- 类型：${goal.goalType}\n- 金额：¥${Number(goal.targetAmount || 0)}`,
        transactionIds: []
      };

    case 'query_financial_goals':
      const goals = await accountingService.getFinancialGoals(context.userId);
      if (goals.length === 0) {
        return {
          message: `📭 您目前还没有设定任何财务目标。`,
          transactionIds: []
        };
      }

      const goalLines = goals.map((g: any) => {
        const barLength = 10;
        const filled = Math.min(barLength, Math.floor(g.progress / (100 / barLength)));
        const bar = '▓'.repeat(filled) + '░'.repeat(barLength - filled);
        const dateInfo = g.targetDate ? ` (目标日期: ${g.targetDate})` : '';
        return `🎯 **${g.text}**\n   ¥${g.currentAmount} / ¥${g.targetAmount} [${bar}] ${g.progress}%${dateInfo}`;
      }).join('\n\n');

      return {
        message: `📊 **您的财务目标进度**：\n\n${goalLines}`,
        transactionIds: []
      };

    case 'query_monthly_snapshot':
      const snapshot = await prisma.monthlyFinancialSnapshot.findUnique({
        where: { 
          month_userId: {
            month: args.month,
            userId: context.userId || 'system'
          }
        }
      });

      if (!snapshot) {
        // 如果没有快照，实时生成一个
        const newSnapshot = await accountingService.generateMonthlySnapshot(args.month, context.userId);
        return {
          message: `📊 **[${args.month}] 财务月度总结**：\n- 总收入：¥${Number(newSnapshot.monthlyIncome).toFixed(2)}\n- 总支出：¥${Number(newSnapshot.monthlyExpense).toFixed(2)}\n- 净现金流：¥${Number(newSnapshot.netCashflow).toFixed(2)}\n- 支出大头：${newSnapshot.topCategories || '暂无数据'}`,
          transactionIds: []
        };
      }

      return {
        message: `📊 **[${args.month}] 财务月度总结**：\n- 总收入：¥${Number(snapshot.monthlyIncome).toFixed(2)}\n- 总支出：¥${Number(snapshot.monthlyExpense).toFixed(2)}\n- 净现金流：¥${Number(snapshot.netCashflow).toFixed(2)}\n- 支出大头：${snapshot.topCategories || '暂无数据'}`,
        transactionIds: []
      };

    case 'record_subscription':
      const sub = await accountingService.createSubscription({
        ...args,
        billingCycle: args.billingCycle as BillingCycle,
        paymentChannel: args.paymentChannel as PaymentChannel,
        startDate: new Date(args.startDate),
        userId: context.userId
      });
      let subReply = `✅ 订阅服务记录成功！\n- 服务：${sub.subscriptionName}\n- 金额：¥${Number(sub.amount)}/${sub.billingCycle === 'monthly' ? '月' : '年'}`;
      if (sub.billingCycle === 'yearly') {
        subReply += `\n- 💡 检测到年付订阅，已自动创建分摊计划（12个月）。`;
      } else {
        subReply += `\n- 下次续费日期约在：${args.startDate} 开始的下个周期`;
      }
      return {
        message: subReply,
        transactionIds: []
      };

    case 'query_subscriptions':
      const subs = await accountingService.getSubscriptions(context.userId);
      if (subs.length === 0) {
        return {
          message: `📭 您目前没有任何活跃的订阅服务。`,
          transactionIds: []
        };
      }
      const subLines = subs.map(s => `- **${s.subscriptionName}**: ¥${Number(s.amount)}/${s.billingCycle === 'monthly' ? '月' : '年'} (${s.paymentChannel})`).join('\n');
      const cardContent = {
        header: { title: { tag: 'plain_text', content: '📋 您的订阅服务列表' }, template: 'blue' },
        elements: [
          { tag: 'markdown', content: subLines },
          { tag: 'hr' },
          { tag: 'note', elements: [{ tag: 'plain_text', content: '提示：您可以直接回复“取消XX订阅”来管理订阅项' }] }
        ]
      };
      return {
        message: `📋 **您的订阅服务列表**：\n\n${subLines}\n\n[CARD_JSON]${JSON.stringify(cardContent)}[/CARD_JSON]`,
        transactionIds: []
      };

    default:
      throw new Error(`未知的记账工具: ${toolName}`);
  }
}
