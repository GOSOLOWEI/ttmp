/**
 * 飞书聊天业务逻辑层 (Service Layer)
 * 职责：业务编排，连接事件处理器、资源工具与 AI 服务
 */

import { replyMessage } from '../feishu/messages';
import { getFeishuResourceBuffer } from '../feishu/resources';
import { visionService } from './vision.service';
import { workflowService } from './workflow.service';

export interface FeishuMessageContext {
  messageId: string;
  chatId: string;
  senderId: string;
  text: string;
  msgType: string;
  imageKey?: string;
}

export const feishuChatService = {
  /**
   * 处理用户发送的消息（编排入口）
   */
  async handleUserMessage(context: FeishuMessageContext) {
    // 异步执行，立即返回 Webhook 响应
    this.processAITask(context).catch(err => {
      console.error(`[FeishuChatService] 异步任务执行失败:`, err);
    });

    return { success: true };
  },

  /**
   * 核心业务流程编排
   */
  async processAITask(context: FeishuMessageContext) {
    const { messageId, text, msgType, imageKey, senderId } = context;

    try {
      // 1. 多模态：图片识别流程
      if (msgType === 'image' && imageKey) {
        await replyMessage(messageId, `⏳ 正在分析图片内容...`);
        const buffer = await getFeishuResourceBuffer(messageId, imageKey, 'image');
        const analysis = await visionService.analyzeImage(buffer);
        await replyMessage(messageId, `✅ 图片识别结果：\n\n${analysis}`);
        return;
      }

      // 2. 文本对话/记账流程 (内存异步执行)
      if (msgType === 'text') {
        const result = await workflowService.executeAccountingTask({
          text,
          userId: senderId
        });

        await replyMessage(messageId, result.replyText || '未返回有效回复');

        // 3. 处理交互式卡片 (如果回复中包含 [CARD_JSON] 标记)
        if (result.replyText?.includes('[CARD_JSON]')) {
          const cardMatch = result.replyText.match(/\[CARD_JSON\](.*?)\[\/CARD_JSON\]/);
          if (cardMatch && cardMatch[1]) {
            try {
              const cardContent = JSON.parse(cardMatch[1]);
              // 这里的 replyMessage 需要支持 interactive 类型，目前 messages.ts 已经支持
              await replyMessage(messageId, cardContent, 'interactive');
              console.log(`✅ [FeishuChat] 卡片回复已发送: ${messageId}`);
            } catch (e) {
              console.error(`[FeishuChatService] 解析卡片 JSON 失败:`, e);
            }
          }
        }
      }
    } catch (err: any) {
      console.error(`[FeishuChatService] 流程执行失败:`, err);
      await replyMessage(messageId, `❌ 处理失败: ${err.message}`);
    }
  }
};
