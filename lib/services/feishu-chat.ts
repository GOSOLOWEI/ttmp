/**
 * 飞书聊天业务逻辑层 (Service Layer)
 * 职责：业务编排，连接事件处理器、资源工具与 AI 服务
 */

import { replyMessage } from '../feishu/messages';
import { getFeishuResourceBuffer } from '../feishu/resources';
import { visionService } from './vision.service';
import { modelManager } from '../models/manager';

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
    const { messageId, text, msgType, imageKey } = context;

    try {
      // 1. 多模态：图片识别流程
      if (msgType === 'image' && imageKey) {
        await replyMessage(messageId, `⏳ 正在分析图片内容...`);
        
        // 调用提取出的工具和服务
        const buffer = await getFeishuResourceBuffer(messageId, imageKey, 'image');
        const analysis = await visionService.analyzeImage(buffer);
        
        await replyMessage(messageId, `✅ 图片识别结果：\n\n${analysis}`);
        return;
      }

      // 2. 文本对话流程
      if (msgType === 'text') {
        const result = await modelManager.chat('doubao', [
          { role: 'user', content: text }
        ]);
        const responseText = result.choices[0].message.content as string;
        await replyMessage(messageId, responseText);
      }
    } catch (err: any) {
      console.error(`[FeishuChatService] 流程执行失败:`, err);
      await replyMessage(messageId, `❌ 处理失败: ${err.message}`);
    }
  }
};
