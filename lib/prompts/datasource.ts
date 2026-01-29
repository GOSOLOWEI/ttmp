/**
 * 数据源抽象：定义如何获取背景信息
 * 支持同步/异步、单次/批量、缓存等
 */

/** 数据源结果 */
export interface DataSourceResult {
  /** 数据内容（文本） */
  content: string;
  /** 元数据（来源、置信度、时间戳等） */
  metadata?: Record<string, unknown>;
}

/** 数据源接口 */
export interface DataSource {
  /** 数据源 ID */
  id: string;
  /** 获取数据（异步） */
  fetch(query: string, options?: Record<string, unknown>): Promise<DataSourceResult[]>;
}

/** 向量检索数据源（RAG） */
export interface VectorDataSource extends DataSource {
  type: 'vector';
  /** 检索 top-k 个最相关的文档片段 */
  fetch(query: string, options?: { topK?: number; threshold?: number }): Promise<DataSourceResult[]>;
}

/** 数据库查询数据源 */
export interface DatabaseDataSource extends DataSource {
  type: 'database';
  fetch(query: string, options?: { table?: string; limit?: number }): Promise<DataSourceResult[]>;
}

/** API 数据源 */
export interface APIDataSource extends DataSource {
  type: 'api';
  fetch(query: string, options?: Record<string, unknown>): Promise<DataSourceResult[]>;
}

/** 对话历史数据源 */
export interface HistoryDataSource extends DataSource {
  type: 'history';
  fetch(sessionId: string, options?: { limit?: number }): Promise<DataSourceResult[]>;
}
