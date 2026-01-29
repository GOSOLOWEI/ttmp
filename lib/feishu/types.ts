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

export interface JSSDKConfig {
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
}

export interface FeishuUser {
  open_id: string;
  name: string;
  en_name: string;
  avatar_url: string;
  avatar_thumb: string;
  avatar_middle: string;
  avatar_big: string;
  union_id?: string;
  user_id?: string;
  mobile?: string;
  email?: string;
}

export interface FeishuContextType {
  user: FeishuUser | null;
  isLark: boolean;
  isReady: boolean;
  login: () => Promise<void>;
}
