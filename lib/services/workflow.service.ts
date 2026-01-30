/**
 * AI 工作流编排服务 (Orchestration Layer)
 * 职责：管理 AI 对话循环、工具调用分发、审计日志记录
 */

import { modelManager } from '../models/manager';
import { buildPrompt, getPreset } from '../prompts';
import { prisma } from '../prisma';
import { contextService } from './context.service';
import { 
  recordTransactionTool, 
  recordPrepaidTool, 
  queryAccountingDataTool, 
  setBudgetTool,
  queryBudgetStatusTool,
  setFinancialGoalTool,
  queryFinancialGoalsTool,
  queryMonthlySnapshotTool,
  recordSubscriptionTool,
  querySubscriptionsTool,
  accountingToolDispatcher 
} from '../tools/accounting-tools';
import { ChatMessage } from '../models/types';
import { Scenario, InputType, LogStatus } from '@/generated/prisma/client';

export interface WorkflowResult {
  replyText: string;
  transactionIds: string[];
  logId: string;
}

export const workflowService = {
  /**
   * 执行记账/查询工作流
   */
  async executeAccountingTask(params: {
    text: string;
    userId: string;
    scenario?: Scenario;
  }): Promise<WorkflowResult> {
    const { text, userId, scenario = Scenario.tagging } = params;
    const startTime = Date.now();
    const logId = `LOG${Date.now()}`;
    
    let totalTokenUsage = 0;
    let finalStatus: LogStatus = LogStatus.success;
    let errorMessage = '';
    const allTransactionIds: string[] = [];
    const allMatchedRuleIds: string[] = [];
    let actualModelName = '';

    // 1. 获取动态上下文 (分类列表 + 个人规则)
    const contextData = await contextService.getAccountingContext(userId);

    // 2. 构建 Prompt
    const config = getPreset('accounting-agent');
    if (!config) {
      throw new Error('未找到记账助手预设配置 [accounting-agent]');
    }

    const builtPrompt = buildPrompt(config, {
      text,
      currentDate: new Date().toISOString().split('T')[0],
      categories: contextData.categoriesPrompt,
      rules: contextData.rulesPrompt,
      tagsPrompt: contextData.tagsPrompt
    });

    const messages: ChatMessage[] = [...builtPrompt.messages];
    const tools = [
      recordTransactionTool, 
      recordPrepaidTool, 
      queryAccountingDataTool,
      setBudgetTool,
      queryBudgetStatusTool,
      setFinancialGoalTool,
      queryFinancialGoalsTool,
      queryMonthlySnapshotTool,
      recordSubscriptionTool,
      querySubscriptionsTool
    ];

    // 3. 模型交互循环
    let turn = 0;
    let lastModelOutput = '';
    let finalReplyText = '';

    while (turn < 3) {
      const result = await modelManager.chat('doubao', messages, {
        tools,
        temperature: 0.1
      });

      if (result.usage) totalTokenUsage += result.usage.total_tokens;
      if (result.model) actualModelName = result.model;

      const choice = result.choices[0];
      const message = choice.message;
      messages.push(message);
      lastModelOutput = JSON.stringify(message);

      // 如果没有工具调用，则输出最终结果
      if (!message.tool_calls || message.tool_calls.length === 0) {
        finalReplyText = typeof message.content === 'string' ? message.content : '未返回有效回复';
        break;
      }

      // 处理工具调用
      for (const toolCall of message.tool_calls) {
        const { name: toolName, arguments: argsString } = toolCall.function;
        const args = JSON.parse(argsString);
        
        try {
          const toolResult = await accountingToolDispatcher(toolName, args, {
            userId: userId,
            logId: logId,
            confidence: 0.9 
          });
          
          if (toolResult.transactionIds) {
            allTransactionIds.push(...toolResult.transactionIds);
          }
          if (toolResult.matchedRuleIds) {
            allMatchedRuleIds.push(...toolResult.matchedRuleIds);
          }

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolName,
            content: toolResult.message
          });
        } catch (toolError: any) {
          finalStatus = LogStatus.fail;
          errorMessage = toolError.message;
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolName,
            content: `错误: ${toolError.message}`
          });
        }
      }
      turn++;
    }

    // 4. 异步保存审计日志与统计 (不阻塞返回)
    this._finalizeLog({
      logId,
      userId,
      scenario,
      text,
      actualModelName,
      lastModelOutput,
      messages,
      finalStatus,
      errorMessage,
      startTime,
      totalTokenUsage,
      allTransactionIds,
      allMatchedRuleIds,
      promptVersion: builtPrompt.version
    });

    return {
      replyText: finalReplyText,
      transactionIds: allTransactionIds,
      logId
    };
  },

  /**
   * 私有：处理日志和规则统计
   */
  async _finalizeLog(data: any) {
    try {
      // 保存审计日志
      await prisma.aIGenerationLog.create({
        data: {
          logId: data.logId,
          userId: data.userId,
          scenario: data.scenario,
          inputType: InputType.text,
          inputText: data.text,
          modelName: data.actualModelName || 'doubao',
          outputRaw: data.lastModelOutput,
          outputParsed: data.messages[data.messages.length - 1].content?.toString() || '',
          confidence: 0.9,
          status: data.finalStatus,
          errorMessage: data.errorMessage,
          latencyMs: Date.now() - data.startTime,
          tokenUsage: data.totalTokenUsage,
          transactionIds: JSON.stringify(data.allTransactionIds),
          taggingRulesUsed: data.allMatchedRuleIds.length > 0 ? data.allMatchedRuleIds.join(',') : null,
          promptVersion: data.promptVersion || 'unknown'
        }
      });

      // 更新规则命中统计
      if (data.allMatchedRuleIds.length > 0) {
        const uniqueRuleIds = Array.from(new Set(data.allMatchedRuleIds as string[]));
        await Promise.all(uniqueRuleIds.map(ruleId => 
          prisma.taggingRule.update({
            where: { ruleId },
            data: { 
              hitCount: { increment: 1 },
              lastHitAt: new Date()
            }
          }).catch(e => console.warn(`[WorkflowService] 更新规则命中失败: ${ruleId}`, e.message))
        ));
      }
    } catch (err) {
      console.error('❌ [WorkflowService] 最终日志/统计失败:', err);
    }
  }
};
