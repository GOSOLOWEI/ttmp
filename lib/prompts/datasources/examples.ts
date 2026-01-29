/**
 * 数据源实现示例
 * 供参考，实际使用时请根据你的数据源实现
 */

import type { DataSource, DataSourceResult, HistoryDataSource } from '../datasource';
import type { ChatMessage } from '@/lib/models';

/**
 * 示例 1：内存向量检索数据源（简化版）
 * 实际项目中应使用 Pinecone、Weaviate、Chroma 等向量数据库
 */
export class MemoryVectorSource implements DataSource {
  id = 'memory-vector';
  private documents: Array<{ content: string; embedding?: number[] }> = [];

  constructor(documents?: Array<{ content: string }>) {
    this.documents = documents || [];
  }

  async fetch(query: string, options?: { topK?: number }): Promise<DataSourceResult[]> {
    const topK = options?.topK ?? 3;
    // 简化示例：关键词匹配（实际应使用向量相似度）
    const results = this.documents
      .filter((doc) => doc.content.toLowerCase().includes(query.toLowerCase()))
      .slice(0, topK);

    return results.map((doc) => ({
      content: doc.content,
      metadata: { source: 'memory', query },
    }));
  }

  /** 添加文档 */
  addDocument(content: string): void {
    this.documents.push({ content });
  }
}

/**
 * 示例 2：对话历史数据源
 */
export class MemoryHistorySource implements HistoryDataSource {
  type = 'history' as const;
  id = 'memory-history';
  private historyStore = new Map<string, ChatMessage[]>();

  async fetch(
    sessionId: string,
    options?: { limit?: number }
  ): Promise<DataSourceResult[]> {
    const history = this.historyStore.get(sessionId) || [];
    const limit = options?.limit ?? 5;
    const recent = history.slice(-limit);

    if (recent.length === 0) return [];

    return [
      {
        content: recent
          .map((m) => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`)
          .join('\n'),
        metadata: { sessionId, count: recent.length },
      },
    ];
  }

  /** 添加消息到历史 */
  addMessage(sessionId: string, message: ChatMessage): void {
    const history = this.historyStore.get(sessionId) || [];
    history.push(message);
    this.historyStore.set(sessionId, history);
  }

  /** 获取历史 */
  getHistory(sessionId: string): ChatMessage[] {
    return this.historyStore.get(sessionId) || [];
  }

  /** 清除历史 */
  clearHistory(sessionId: string): void {
    this.historyStore.delete(sessionId);
  }
}

/**
 * 示例 3：API 数据源（天气）
 * 实际使用时替换为真实的 API 调用
 */
export class WeatherAPISource implements DataSource {
  id = 'weather-api';

  async fetch(
    query: string, // 城市名
    options?: Record<string, unknown>
  ): Promise<DataSourceResult[]> {
    // 示例：模拟 API 调用
    // 实际应使用 fetch 或 axios
    const city = query || '北京';
    
    // 这里应该是真实的 API 调用
    // const response = await fetch(`https://api.weather.com/v1/current?city=${city}`);
    // const data = await response.json();

    // 示例返回
    return [
      {
        content: `当前${city}天气：25°C，晴天，湿度 60%`,
        metadata: { city, timestamp: new Date().toISOString() },
      },
    ];
  }
}

/**
 * 示例 4：数据库查询数据源（已废弃，请使用 PrismaDataSource）
 * @deprecated 请使用 @/lib/prompts/datasources/postgres-prisma 中的 PrismaDataSource
 */
export class DatabaseSource implements DataSource {
  id = 'database';

  constructor(private db?: any) {}

  async fetch(
    query: string,
    options?: { table?: string; limit?: number }
  ): Promise<DataSourceResult[]> {
    // 示例：模拟数据库查询
    // 实际应使用 Prisma、TypeORM、Drizzle 等 ORM
    const table = options?.table || 'knowledge';
    const limit = options?.limit || 5;

    // 示例返回
    return [
      {
        content: `从 ${table} 表查询到 ${limit} 条相关记录：\n${query}`,
        metadata: { table, limit },
      },
    ];
  }
}

/**
 * 示例 5：Prisma PostgreSQL 数据源
 * 使用 PrismaDataSource（推荐）
 * 
 * @example
 * ```ts
 * import { PrismaClient } from '@prisma/client';
 * import { PrismaDataSource } from '@/lib/prompts/datasources/postgres-prisma';
 * 
 * const prisma = new PrismaClient();
 * const pgSource = new PrismaDataSource(prisma);
 * 
 * // 基础查询
 * const results = await pgSource.fetch('TypeScript', {
 *   model: 'knowledge',
 *   limit: 5,
 * });
 * 
 * // 带条件查询
 * const results2 = await pgSource.fetch('React', {
 *   model: 'knowledge',
 *   limit: 3,
 *   where: { published: true, category: 'frontend' },
 *   orderBy: { createdAt: 'desc' },
 * });
 * ```
 */
export { PrismaDataSource } from './postgres-prisma';
