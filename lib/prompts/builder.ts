/**
 * Prompt 构建器：将配置和变量构建成 ChatMessage[]
 * 支持 Few-shot、动态背景信息注入等
 */

import type { ChatMessage } from '@/lib/models';
import type { PromptConfig, PromptVariables, BuiltPrompt, MessageTemplate } from './types';
import type { InjectionConfig } from './injector';
import { formatTemplate } from './template';
import { ContextInjector } from './injector';

/**
 * 基础构建：将 PromptConfig + 变量 构建成 ChatMessage[] + options
 * （不含动态注入）
 */
export function buildPrompt(
  config: PromptConfig,
  variables: PromptVariables = {}
): BuiltPrompt {
  const messages: ChatMessage[] = [];

  // 1. System message（如果有）
  if (config.system) {
    const systemContent =
      typeof config.system === 'string'
        ? formatTemplate(config.system, variables)
        : formatTemplate(config.system.content, variables);
    messages.push({ role: 'system', content: systemContent });
  }

  // 2. Few-shot 示例（如果有）
  if (config.fewShot) {
    for (const example of config.fewShot) {
      messages.push({
        role: 'user',
        content: formatTemplate(example.user, variables),
      });
      messages.push({
        role: 'assistant',
        content: formatTemplate(example.assistant, variables),
      });
    }
  }

  // 3. 当前用户消息
  const userContent =
    typeof config.user === 'string'
      ? formatTemplate(config.user, variables)
      : formatTemplate(config.user.content, variables);
  messages.push({ role: 'user', content: userContent });

  return {
    messages,
    options: config.defaultOptions,
  };
}

/**
 * 构建 Prompt（支持动态背景信息注入）
 */
export async function buildPromptWithContext(
  config: PromptConfig,
  variables: PromptVariables = {},
  injections: InjectionConfig[] = []
): Promise<BuiltPrompt> {
  // 1. 先构建基础 messages（不含注入）
  const baseMessages = buildPrompt(config, variables).messages;

  // 2. 依次应用所有注入器
  let messages = baseMessages;
  for (const injection of injections) {
    messages = await ContextInjector.inject(messages, injection, variables);
  }

  return {
    messages,
    options: config.defaultOptions,
  };
}
