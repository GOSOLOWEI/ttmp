/**
 * 模型管理器入口
 * 支持 OpenAI、DeepSeek、豆包 等 OpenAI 兼容 API，及 Fallback 策略
 */

export { ModelManager, modelManager } from './manager';
export type { ProviderOverrides } from './manager';
export { chatWithFallback, streamChatWithFallback } from './fallback';
export { PROVIDERS } from './providers';
export type { ProviderConfig, ProviderId } from './providers';
export type {
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResult,
  ChatCompletionChunk,
  MessageRole,
  FallbackStrategyOptions,
  ChatWithFallbackResult,
  StreamFallbackResult,
} from './types';
