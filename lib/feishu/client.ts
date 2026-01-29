/**
 * 飞书 SDK 客户端封装
 */

import * as Lark from '@larksuiteoapi/node-sdk';
import { env } from '../env';
import type { FeishuConfig } from './types';

let client: Lark.Client | null = null;

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

  // 注意：由于 env 已经通过 zod 校验了必填项，此处理论上 appId/appSecret 不会为空
  // 但为了兼容手动传入 config 的场景，这里保留最基本的 Lark.Client 初始化即可

  client = new Lark.Client({
    appId,
    appSecret,
    domain: domain as Lark.Domain,
  });

  return client;
}
