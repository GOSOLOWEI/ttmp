/**
 * Prompt 工程层类型定义
 */

import type { ChatMessage, MessageRole } from '@/lib/models';

/** Prompt 模板变量（键值对） */
export type PromptVariables = Record<string, string | number | boolean | null | undefined>;

/** 单条消息模板 */
export interface MessageTemplate {
  role: MessageRole;
  content: string; // 支持 {{variable}} 占位符
}

/** Prompt 配置：一个场景的完整定义 */
export interface PromptConfig {
  /** 场景 ID（如 'code-assistant', 'translator'） */
  id: string;
  /** 提示词版本 */
  version?: string;
  /** 系统提示（可选） */
  system?: string | MessageTemplate;
  /** 用户消息模板 */
  user: string | MessageTemplate;
  /** Few-shot 示例（可选） */
  fewShot?: Array<{ user: string; assistant: string }>;
  /** 默认选项（如 max_tokens, temperature） */
  defaultOptions?: {
    model?: string;
    max_tokens?: number;
    temperature?: number;
    response_format?: { type: 'text' | 'json_object' };
  };
}

/** 构建后的 Prompt 结果 */
export interface BuiltPrompt {
  messages: ChatMessage[];
  version?: string;
  options?: {
    model?: string;
    max_tokens?: number;
    temperature?: number;
    response_format?: { type: 'text' | 'json_object' };
  };
}
