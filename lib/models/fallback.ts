/**
 * Fallback 策略：当某厂商请求失败时自动切换到下一个已配置厂商
 * 与 ModelManager 解耦，通过传入 manager 实例使用
 */

import type { ModelManager } from './manager';
import { type ProviderId } from './providers';
import type {
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionChunk,
  FallbackStrategyOptions,
  ChatWithFallbackResult,
  StreamFallbackResult,
} from './types';

const DEFAULT_PROVIDER_ORDER: ProviderId[] = ['openai', 'deepseek', 'doubao'];

/** 根据策略得到实际尝试的厂商顺序 */
function getProviderOrder(
  manager: ModelManager,
  strategy: FallbackStrategyOptions = {}
): ProviderId[] {
  const onlyConfigured = strategy.onlyConfigured !== false;
  const candidateOrder = (strategy.providerOrder?.length
    ? strategy.providerOrder
    : ModelManager.getProviderIds()) as ProviderId[];

  const filtered = onlyConfigured
    ? candidateOrder.filter((id) => manager.isProviderConfigured(id))
    : candidateOrder;

  return filtered.filter((id) => ModelManager.getProviderInfo(id)); // 仅保留已知厂商
}

/**
 * 非流式对话 + Fallback：按策略顺序尝试各厂商，第一个成功即返回
 */
export async function chatWithFallback(
  manager: ModelManager,
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
  strategy: FallbackStrategyOptions = {}
): Promise<ChatWithFallbackResult> {
  const order = getProviderOrder(manager, strategy);
  if (order.length === 0) throw new Error('没有可用的厂商（请至少配置一个 API Key）');

  let lastError: unknown;
  for (const providerId of order) {
    try {
      const result = await manager.chat(providerId, messages, options);
      return { result, providerId };
    } catch (err) {
      lastError = err;
      strategy.onProviderFail?.(providerId, err);
    }
  }
  throw lastError;
}

/**
 * 流式对话 + Fallback：先用一次非流式探活选定可用厂商，再对该厂商做流式输出
 * 保证流式内容来自同一厂商，避免中途切换
 */
export async function* streamChatWithFallback(
  manager: ModelManager,
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
  strategy: FallbackStrategyOptions = {}
): AsyncGenerator<ChatCompletionChunk, StreamFallbackResult, undefined> {
  const order = getProviderOrder(manager, strategy);
  if (order.length === 0) throw new Error('没有可用的厂商（请至少配置一个 API Key）');

  // 探活：用极简请求选出一个可用厂商
  let chosenId: ProviderId | null = null;
  for (const providerId of order) {
    try {
      await manager.chat(providerId, messages, { ...options, max_tokens: 1 });
      chosenId = providerId;
      break;
    } catch (err) {
      strategy.onProviderFail?.(providerId, err);
    }
  }
  if (chosenId === null) throw new Error('所有厂商均不可用');

  for await (const chunk of manager.streamChat(chosenId, messages, options)) {
    yield chunk;
  }
  return { providerId: chosenId };
}
