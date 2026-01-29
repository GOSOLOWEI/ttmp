/**
 * 注入器：将数据源的结果注入到 messages 中
 */

import type { ChatMessage } from '@/lib/models';
import type { DataSource, DataSourceResult } from './datasource';
import type { PromptVariables } from './types';

/**
 * 注入策略：定义背景信息如何注入到 prompt 中
 */
export type InjectionStrategy =
  | 'prepend-system'      // 追加到 system message 开头
  | 'append-system'       // 追加到 system message 末尾
  | 'prepend-user'        // 追加到 user message 开头
  | 'append-user'         // 追加到 user message 末尾
  | 'separate-message'    // 作为独立的 user message（在主要 user 之前）
  | 'template-variable';  // 作为模板变量（如 {{context}}）

/** 注入配置 */
export interface InjectionConfig {
  /** 数据源 */
  dataSource: DataSource;
  /** 注入策略 */
  strategy: InjectionStrategy;
  /** 模板（用于格式化注入内容） */
  template?: string; // 如 "相关背景信息：\n{{content}}\n"
  /** 查询参数构建器（从 variables 生成查询字符串） */
  queryBuilder?: (variables: PromptVariables) => string;
  /** 选项（传给 dataSource.fetch） */
  options?: Record<string, unknown>;
  /** 是否启用缓存 */
  cache?: boolean;
  /** 缓存 TTL（毫秒） */
  cacheTtl?: number;
}

/**
 * 注入器：将数据源的结果注入到 messages 中
 */
export class ContextInjector {
  private static cache = new Map<string, { data: DataSourceResult[]; expires: number }>();

  /**
   * 注入背景信息到 messages
   */
  static async inject(
    messages: ChatMessage[],
    config: InjectionConfig,
    variables: PromptVariables = {}
  ): Promise<ChatMessage[]> {
    // 1. 获取查询字符串
    const query = config.queryBuilder
      ? config.queryBuilder(variables)
      : (variables.query as string) || (variables.text as string) || '';

    // 2. 检查缓存
    const cacheKey = `${config.dataSource.id}:${query}`;
    let results: DataSourceResult[];

    if (config.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        results = cached.data;
      } else {
        results = await config.dataSource.fetch(query, config.options);
        this.cache.set(cacheKey, {
          data: results,
          expires: Date.now() + (config.cacheTtl || 60000), // 默认 1 分钟
        });
      }
    } else {
      results = await config.dataSource.fetch(query, config.options);
    }

    if (results.length === 0) return messages; // 无数据则不注入

    // 3. 格式化数据
    const formattedContent = this.formatResults(results, config.template);

    // 4. 按策略注入
    return this.applyStrategy(messages, formattedContent, config.strategy);
  }

  private static formatResults(
    results: DataSourceResult[],
    template?: string
  ): string {
    const contents = results.map((r) => r.content).join('\n\n');
    if (!template) return contents;
    return template.replace(/\{\{content\}\}/g, contents);
  }

  private static applyStrategy(
    messages: ChatMessage[],
    content: string,
    strategy: InjectionStrategy
  ): ChatMessage[] {
    const newMessages = [...messages];

    switch (strategy) {
      case 'prepend-system':
        if (newMessages[0]?.role === 'system') {
          newMessages[0].content = `${content}\n\n${newMessages[0].content}`;
        } else {
          newMessages.unshift({ role: 'system', content });
        }
        break;

      case 'append-system':
        if (newMessages[0]?.role === 'system') {
          newMessages[0].content = `${newMessages[0].content}\n\n${content}`;
        } else {
          newMessages.unshift({ role: 'system', content });
        }
        break;

      case 'prepend-user':
        const lastUserIndex = newMessages.length - 1;
        if (newMessages[lastUserIndex]?.role === 'user') {
          newMessages[lastUserIndex].content = `${content}\n\n${newMessages[lastUserIndex].content}`;
        }
        break;

      case 'append-user':
        const lastUserIdx = newMessages.length - 1;
        if (newMessages[lastUserIdx]?.role === 'user') {
          newMessages[lastUserIdx].content = `${newMessages[lastUserIdx].content}\n\n${content}`;
        }
        break;

      case 'separate-message':
        // 在最后一个 user message 之前插入
        const insertIndex = newMessages.length - 1;
        newMessages.splice(insertIndex, 0, { role: 'user', content });
        break;

      case 'template-variable':
        // 这个需要在 buildPrompt 阶段处理，这里不做处理
        break;
    }

    return newMessages;
  }

  /** 清除缓存 */
  static clearCache(): void {
    this.cache.clear();
  }

  /** 清除过期缓存 */
  static cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expires <= now) {
        this.cache.delete(key);
      }
    }
  }
}
