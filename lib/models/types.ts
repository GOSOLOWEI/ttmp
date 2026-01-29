/**
 * 模型管理器统一类型定义
 * 与 OpenAI Chat Completions API 对齐，便于多厂商复用
 */

export type MessageRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface ChatCompletionOptions {
  /** 模型 ID，不传则使用该厂商默认模型 */
  model?: string;
  /** 最大生成 token 数 */
  max_tokens?: number;
  /** 温度 0-2 */
  temperature?: number;
  /** 流式输出 */
  stream?: boolean;
}

export interface ChatCompletionChunk {
  id: string;
  choices: Array<{
    delta: { role?: MessageRole; content?: string };
    index: number;
    finish_reason: string | null;
  }>;
}

export interface ChatCompletionResult {
  id: string;
  choices: Array<{
    message: ChatMessage;
    index: number;
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** Fallback 策略选项 */
export interface FallbackStrategyOptions {
  /** 厂商尝试顺序，越靠前越优先；不传则使用全部已配置厂商的默认顺序 */
  providerOrder?: string[];
  /** 是否只尝试已配置 Key 的厂商，默认 true */
  onlyConfigured?: boolean;
  /** 某个厂商失败时的回调，可用于打日志或统计 */
  onProviderFail?: (providerId: string, error: unknown) => void;
}

/** 带 Fallback 的非流式对话结果（含实际使用的厂商） */
export interface ChatWithFallbackResult {
  result: ChatCompletionResult;
  providerId: string;
}

/** 流式 Fallback 结束时仅能返回实际使用的厂商（无完整 result） */
export interface StreamFallbackResult {
  providerId: string;
}
