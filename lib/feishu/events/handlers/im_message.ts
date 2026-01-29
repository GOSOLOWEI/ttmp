/**
 * 机器人接收消息事件处理器
 * 事件文档：https://open.feishu.cn/document/uAjLw4CM/ukTMzUjL5EzM14SOxMTN/reference/im-v1/message/events/receive
 */

import { EventHandler } from '../types';
import { feishuChatService } from '../../../services/feishu-chat';

export const messageReceiveHandler: EventHandler = {
  type: 'im.message.receive_v1',
  handler: async (data) => {
    const { message, sender } = data.event;
    // 飞书事件推送中使用 message_type，而 API 中使用 msg_type，此处做兼容处理
    const { message_type, msg_type, content, message_id, chat_id } = message;
    const finalMsgType = message_type || msg_type;
    
    // 1. 解析消息内容
    let parsedContent: any = {};
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      parsedContent = { raw: content };
    }

    const textContent = finalMsgType === 'text' ? parsedContent.text : `[${finalMsgType}]`;
    const senderId = sender.sender_id?.open_id || 'unknown';

    // 2. 调用服务层异步处理业务逻辑
    feishuChatService.handleUserMessage({
      messageId: message_id,
      chatId: chat_id,
      senderId: senderId,
      text: textContent,
      msgType: finalMsgType as string,
      imageKey: finalMsgType === 'image' ? parsedContent.image_key : undefined
    }).catch(err => {
      console.error(`[im.message.receive_v1] 业务分发失败:`, err);
    });

    // 3. 立即响应飞书 Webhook 确认收到
    return { code: 0, msg: 'success' };
  }
};
