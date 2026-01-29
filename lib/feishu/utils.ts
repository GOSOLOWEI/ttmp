/**
 * 飞书工具函数与错误处理
 */

import type { LarkResponse } from './types';

export class FeishuError extends Error {
  constructor(public code: number, public msg: string, public data?: any) {
    super(`Feishu API Error: [${code}] ${msg}`);
    this.name = 'FeishuError';
  }
}

/**
 * 处理飞书 API 响应
 */
export function handleResponse<T>(response: LarkResponse<T>): T {
  if (response.code !== 0 && response.code !== undefined) {
    throw new FeishuError(response.code, response.msg || '', response.data);
  }
  return response.data as T;
}

/**
 * 统一请求包裹器（待集成到各个模块）
 */
export async function wrapRequest<T>(request: Promise<LarkResponse<T>>): Promise<T> {
  const response = await request;
  return handleResponse(response);
}
