/**
 * 模型管理器统一类型定义
 * 与 OpenAI Chat Completions API 对齐，便于多厂商复用
 */

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * 多模态消息内容部分
 */
export type MessageContentPart = 
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

export interface ChatMessage {
  role: MessageRole;
  content: string | MessageContentPart[] | null;
  /** 用于 assistant 角色：模型生成的工具调用请求 */
  tool_calls?: any[];
  /** 用于 tool 角色：对应 tool_call 的 ID */
  tool_call_id?: string;
  /** 用于 tool 角色：工具执行的名称（可选） */
  name?: string;
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
  /** 工具定义 */
  tools?: any[];
  /** 工具选择策略 */
  tool_choice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
  /** 响应格式 */
  response_format?: { type: 'text' | 'json_object' };
}

export interface ChatCompletionChunk {
  id: string;
  choices: Array<{
    delta: { 
      role?: MessageRole; 
      content?: string;
      tool_calls?: any[];
    };
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
  /** 实际使用的模型 ID */
  model?: string;
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
