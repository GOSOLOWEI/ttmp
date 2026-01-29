/**
 * 飞书事件模块统一入口
 * 负责聚合所有处理器并提供 Next.js 适配器
 */

import * as Lark from '@larksuiteoapi/node-sdk';
import { env } from '../../env';
import { NextRequest } from 'next/server';
import { botAddedHandler } from './handlers/im_chat_member';
import { messageReceiveHandler } from './handlers/im_message';
import { EventHandler } from './types';

/**
 * 所有已注册的事件处理器列表
 */
const handlers: EventHandler[] = [
  botAddedHandler,
  messageReceiveHandler,
];

// 防止 Next.js 开发环境下热更新导致重复注册
const globalForLark = global as unknown as { __lark_dispatcher?: Lark.EventDispatcher };

/**
 * 创建或获取飞书事件分发器单例
 */
export function createEventDispatcher(options?: { encryptKey?: string, verificationToken?: string }) {
  if (globalForLark.__lark_dispatcher && !options) {
    return globalForLark.__lark_dispatcher;
  }

  const encryptKey = options?.encryptKey || (env.FEISHU_ENCRYPT_KEY?.trim() ? env.FEISHU_ENCRYPT_KEY : undefined);
  const verificationToken = options?.verificationToken || (env.FEISHU_VERIFICATION_TOKEN?.trim() ? env.FEISHU_VERIFICATION_TOKEN : undefined);
  
  // 初始化分发器单例
  const dispatcher = new Lark.EventDispatcher({
    encryptKey: encryptKey,
    verificationToken: verificationToken,
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForLark.__lark_dispatcher = dispatcher;
  }

  return dispatcher;
}

/**
 * 处理飞书 Webhook 事件 (针对 Next.js App Router 适配)
 */
export async function handleNextApiRequest(dispatcher: Lark.EventDispatcher, req: NextRequest) {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => { headers[key] = value; });

  const body = await req.json();
  
  // 1. 显式处理飞书 URL 验证挑战 (url_verification)
  if (body.type === 'url_verification' && body.challenge) {
    return new Response(JSON.stringify({ challenge: body.challenge }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. 提取业务事件类型 (支持 v2.0 header.event_type 和 v1.0 type)
  const eventType = body.header?.event_type || body.type;

  // 3. 自主路由分发：直接从 handlers 数组匹配并执行
  const handler = handlers.find(h => h.type === eventType || `p2.${h.type}` === eventType);
  
  let result: any = { code: 0 }; // 默认返回飞书期望的成功格式

  if (handler) {
    // 执行业务处理器逻辑
    const handlerResult = await handler.handler({ ...body, headers });
    if (handlerResult) result = handlerResult;
  } else {
    // 仅记录未匹配的事件类型，不阻塞流程
    console.warn(`[Feishu Webhook] 收到未注册的事件: ${eventType}`);
  }

  // 4. 统一返回响应给飞书服务器
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
