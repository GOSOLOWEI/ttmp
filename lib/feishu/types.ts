/**
 * 飞书集成类型定义
 */

export interface LarkResponse<T = any> {
  code?: number;
  msg?: string;
  data?: T;
}

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  encryptKey?: string;
  verificationToken?: string;
}

export type FeishuMessageType = 'text' | 'post' | 'image' | 'file' | 'audio' | 'media' | 'sticker' | 'interactive' | 'share_chat' | 'share_user';

export interface FeishuMessageContent {
  text?: string;
  [key: string]: any;
}

export interface TaskParams {
  summary: string;
  description?: string;
  dueTime?: number; // 毫秒时间戳
  ownerId?: string; // 负责人 ID
  creatorId?: string; // 创建者 ID（可选）
}

export interface BitableOptions {
  appToken: string;
  tableId: string;
  viewId?: string;
  filter?: string;
  fieldNames?: string[];
}

export type BitableFormatterType = 'json' | 'markdown' | 'text' | ((fields: Record<string, any>) => string);
