/**
 * 飞书事件处理器封装
 */

import * as Lark from '@larksuiteoapi/node-sdk';
import { env } from '../env';

/**
 * 创建飞书事件分发器
 */
export function createEventDispatcher(options?: { encryptKey?: string }) {
  const encryptKey = options?.encryptKey || env.FEISHU_ENCRYPT_KEY;
  
  return new Lark.EventDispatcher({
    encryptKey,
  });
}

/**
 * 处理飞书 Webhook 事件 (通用适配器逻辑)
 * 适用于 Next.js API Routes 或其他 Node.js 环境
 */
export async function handleFeishuEvent(dispatcher: Lark.EventDispatcher, body: any, headers: Record<string, any>) {
  const data = Object.assign(
    Object.create({
      headers: headers,
    }),
    body
  );
  
  return await dispatcher.invoke(data);
}
