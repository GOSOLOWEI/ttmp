/**
 * 飞书消息发送与回复封装
 */

import { getFeishuClient } from './client';
import type { FeishuMessageType } from './types';
import { wrapRequest } from './utils';

/**
 * 飞书交互式卡片构建器
 */
export class FeishuCardBuilder {
  private header: any = null;
  private elements: any[] = [];
  private config: any = { wide_screen_mode: true };

  /**
   * 设置卡片标题
   * @param title 标题内容
   * @param template 标题颜色模板 (blue, wathet, turquoise, green, yellow, orange, red, carmine, violet, purple, indigo, grey)
   */
  setTitle(title: string, template: string = 'blue') {
    this.header = {
      title: { tag: 'plain_text', content: title },
      template
    };
    return this;
  }

  /**
   * 添加 Markdown 内容
   */
  addMarkdown(content: string) {
    this.elements.push({ tag: 'markdown', content });
    return this;
  }

  /**
   * 添加分割线
   */
  addDivider() {
    this.elements.push({ tag: 'hr' });
    return this;
  }

  /**
   * 添加按钮
   * @param text 按钮文本
   * @param urlOrValue 字符串代表跳转链接，对象代表回传参数
   * @param type 按钮样式
   */
  addButton(text: string, urlOrValue: string | Record<string, any>, type: 'default' | 'primary' | 'danger' = 'default') {
    const action: any = {
      tag: 'button',
      text: { tag: 'plain_text', content: text },
      type
    };
    if (typeof urlOrValue === 'string') {
      action.multi_url = { url: urlOrValue, pc_url: '', android_url: '', ios_url: '' };
    } else {
      action.value = urlOrValue;
    }
    
    // 尝试将连续的按钮合并到同一个 action 组中
    let lastElement = this.elements[this.elements.length - 1];
    if (lastElement?.tag === 'action') {
      lastElement.actions.push(action);
    } else {
      this.elements.push({ tag: 'action', actions: [action] });
    }
    return this;
  }

  /**
   * 设置卡片配置
   */
  setConfig(config: Record<string, any>) {
    this.config = { ...this.config, ...config };
    return this;
  }

  /**
   * 构建最终的消息对象
   */
  build() {
    return {
      msg_type: 'interactive' as const,
      content: {
        header: this.header || { title: { tag: 'plain_text', content: '通知' } },
        elements: this.elements,
        config: this.config
      }
    };
  }
}

/**
 * 飞书消息构建器（常用模板）
 */
export const FeishuMessageBuilder = {
  /**
   * 创建一个交互式卡片构建器实例
   */
  card() {
    return new FeishuCardBuilder();
  },

  /**
   * 构建简单 Markdown 卡片消息
   */
  markdown(content: string) {
    return new FeishuCardBuilder()
      .addMarkdown(content)
      .build();
  },

  /**
   * 构建普通文本消息
   */
  text(text: string) {
    return {
      msg_type: 'text' as const,
      content: { text }
    };
  }
};

/**
 * 回复一条消息
 */
export async function replyMessage(
  messageId: string,
  content: string | Record<string, any>,
  msgType: FeishuMessageType = 'text'
) {
  const client = getFeishuClient();

  const formattedContent = typeof content === 'string' && msgType === 'text'
    ? JSON.stringify({ text: content })
    : typeof content === 'string' ? content : JSON.stringify(content);

  return await wrapRequest(client.im.message.reply({
    path: {
      message_id: messageId,
    },
    data: {
      content: formattedContent,
      msg_type: msgType,
    },
  }));
}

/**
 * 直接发送消息给用户或群聊
 */
export async function sendMessage(
  receiveId: string,
  content: string | Record<string, any>,
  msgType: FeishuMessageType = 'text',
  receiveIdType: 'open_id' | 'chat_id' | 'email' | 'user_id' = 'open_id'
) {
  const client = getFeishuClient();

  const formattedContent = typeof content === 'string' && msgType === 'text'
    ? JSON.stringify({ text: content })
    : typeof content === 'string' ? content : JSON.stringify(content);

  return await wrapRequest(client.im.message.create({
    params: {
      receive_id_type: receiveIdType,
    },
    data: {
      receive_id: receiveId,
      content: formattedContent,
      msg_type: msgType,
    },
  }));
}
