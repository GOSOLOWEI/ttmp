/**
 * Prompt 构建器：将配置和变量构建成 ChatMessage[]
 * 支持 Few-shot、动态背景信息注入等
 */

import type { ChatMessage } from '@/lib/models';
import type { PromptConfig, PromptVariables, BuiltPrompt } from './types';
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
    version: config.version,
    options: config.defaultOptions,
  };
}

/**
 * 构建 Prompt（支持并发动态背景信息注入）
 */
export async function buildPromptWithContext(
  config: PromptConfig,
  variables: PromptVariables = {},
  injections: InjectionConfig[] = []
): Promise<BuiltPrompt> {
  // 1. 并发获取所有注入内容
  const injectionPromises = injections.map(async (injection) => {
    const content = await ContextInjector.fetchContent(injection, variables);
    return { injection, content };
  });

  const results = await Promise.all(injectionPromises);

  // 2. 区分注入类型
  const templateVariables: Record<string, string> = {};
  const messageInjections: Array<{ strategy: any; content: string }> = [];

  for (const { injection, content } of results) {
    if (!content) continue;

    if (injection.strategy === 'template-variable') {
      const varName = injection.variableName || 'context';
      templateVariables[varName] = content;
    } else {
      messageInjections.push({ strategy: injection.strategy, content: content });
    }
  }

  // 3. 将模板类注入合并到变量中，构建基础消息
  const mergedVariables = { ...variables, ...templateVariables };
  let { messages, options } = buildPrompt(config, mergedVariables);

  // 4. 应用非模板类消息注入策略（此时变量已渲染完毕）
  messages = ContextInjector.applyStrategies(messages, messageInjections);

  return {
    messages,
    options,
  };
}
