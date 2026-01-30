/**
 * 飞书聊天业务逻辑层 (Service Layer)
 * 职责：业务编排，连接事件处理器、资源工具与 AI 服务
 */

import { replyMessage, updateMessage, FeishuMessageBuilder } from '../feishu/messages';
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

    // 创建初始“处理中”消息
    let processingMsgId = '';
    
    try {
      // 1. 多模态：图片识别流程
      if (msgType === 'image' && imageKey) {
        const initialResp = await replyMessage(
          messageId, 
          FeishuMessageBuilder.markdown(`⏳ 正在分析图片内容...`), 
          'interactive'
        );
        processingMsgId = (initialResp as any).message_id;

        const buffer = await getFeishuResourceBuffer(messageId, imageKey, 'image');
        const analysis = await visionService.analyzeImage(buffer);
        
        await updateMessage(
          processingMsgId, 
          FeishuMessageBuilder.markdown(`✅ 图片识别结果：\n\n${analysis}`)
        );
        return;
      }

      // 2. 文本对话/记账流程 (内存异步执行)
      if (msgType === 'text') {
        const initialResp = await replyMessage(
          messageId, 
          FeishuMessageBuilder.markdown(`⏳ 正在处理您的请求，请稍候...`), 
          'interactive'
        );
        processingMsgId = (initialResp as any).message_id;

        const result = await workflowService.executeAccountingTask({
          text,
          userId: senderId
        });

        const replyText = result.replyText || '未返回有效回复';

        // 处理带有卡片 JSON 的回复
        if (replyText.includes('[CARD_JSON]')) {
          const cardMatch = replyText.match(/\[CARD_JSON\](.*?)\[\/CARD_JSON\]/);
          if (cardMatch && cardMatch[1]) {
            try {
              const cardContent = JSON.parse(cardMatch[1]);
              await updateMessage(processingMsgId, cardContent);
              console.log(`✅ [FeishuChat] 初始回复已更新为卡片: ${processingMsgId}`);
              return;
            } catch (e) {
              console.error(`[FeishuChatService] 解析卡片 JSON 失败:`, e);
            }
          }
        }

        // 普通文本回复也通过更新卡片来实现，保持一致性
        await updateMessage(
          processingMsgId, 
          FeishuMessageBuilder.markdown(replyText)
        );
      }
    } catch (err: any) {
      console.error(`[FeishuChatService] 流程执行失败:`, err);
      const errorText = `❌ 处理失败: ${err.message}`;
      
      if (processingMsgId) {
        await updateMessage(processingMsgId, FeishuMessageBuilder.markdown(errorText));
      } else {
        await replyMessage(messageId, errorText);
      }
    }
  }
};
