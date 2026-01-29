/**
 * 飞书 SDK 客户端封装
 */

import * as Lark from '@larksuiteoapi/node-sdk';
import { env } from '../env';
import type { FeishuConfig, JSSDKConfig, FeishuUser } from './types';
import crypto from 'crypto';

let client: Lark.Client | null = null;

// 内存缓存 jsapi_ticket
let ticketCache: {
  ticket: string;
  expiresAt: number;
} | null = null;

/**
 * 获取或初始化飞书客户端
 */
export function getFeishuClient(config?: FeishuConfig): Lark.Client {
  // 如果已经初始化过且没有新的配置传入，直接返回单例
  if (client && !config) return client;

  // 优先级：传入的 config > 封装好的 env
  const appId = config?.appId || env.FEISHU_APP_ID;
  const appSecret = config?.appSecret || env.FEISHU_APP_SECRET;
  const domain = (config as any)?.domain || env.FEISHU_DOMAIN;

  client = new Lark.Client({
    appId,
    appSecret,
    domain: domain as Lark.Domain,
  });

  return client;
}

/**
 * 获取 JSAPI Ticket (使用 SDK 通用请求方法)
 */
async function getJsApiTicket(): Promise<string> {
  // 如果缓存有效，直接返回
  if (ticketCache && ticketCache.expiresAt > Date.now()) {
    return ticketCache.ticket;
  }

  const feishuClient = getFeishuClient();
  
  // 使用 SDK 的通用请求方法调用获取 ticket 接口
  // 该方法会自动处理 tenant_access_token
  const res = await feishuClient.request({
    method: 'POST',
    url: '/open-apis/jssdk/ticket/get',
  });
  
  if (res.code !== 0) {
    throw new Error(`获取 JSAPI Ticket 失败: ${res.msg}`);
  }

  const ticket = res.data?.ticket || '';
  // 飞书 ticket 有效期通常为 7200 秒，我们提前 10 分钟过期以保证稳定
  ticketCache = {
    ticket,
    expiresAt: Date.now() + 7100 * 1000,
  };

  return ticket;
}

/**
 * 生成 JSSDK 鉴权配置
 */
export async function getJSSDKConfig(url: string): Promise<JSSDKConfig> {
  const ticket = await getJsApiTicket();
  const timestamp = Date.now();
  const nonceStr = crypto.randomBytes(8).toString('hex'); // 16位随机字符串

  // 按照飞书文档要求的顺序拼接参数
  // 必须严格遵守: jsapi_ticket=xxx&noncestr=xxx&timestamp=xxx&url=xxx
  const verifyStr = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
  
  const signature = crypto
    .createHash('sha1')
    .update(verifyStr)
    .digest('hex');

  return {
    appId: env.FEISHU_APP_ID,
    timestamp,
    nonceStr,
    signature,
  };
}

/**
 * 根据授权码获取用户信息 (免登)
 */
export async function getFeishuUserByCode(code: string): Promise<FeishuUser> {
  const feishuClient = getFeishuClient();
  
  const res = await feishuClient.authen.accessToken.create({
    data: {
      grant_type: 'authorization_code',
      code: code,
    },
  });

  if (res.code !== 0) {
    throw new Error(`飞书免登失败: ${res.msg}`);
  }

  // SDK 返回的结构中，用户信息位于 data 字段
  const userData = res.data;
  if (!userData) {
    throw new Error('未获取到用户信息');
  }

  return {
    open_id: userData.open_id || '',
    name: userData.name || '',
    en_name: userData.en_name || '',
    avatar_url: userData.avatar_url || '',
    avatar_thumb: userData.avatar_thumb || '',
    avatar_middle: userData.avatar_middle || '',
    avatar_big: userData.avatar_big || '',
    union_id: userData.union_id,
    user_id: userData.user_id,
    mobile: userData.mobile,
    email: userData.email,
  };
}
