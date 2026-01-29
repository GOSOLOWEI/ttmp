/**
 * PostgreSQL 数据源（使用 Prisma）
 * 支持灵活的查询选项和字段选择
 */

import type { DatabaseDataSource, DataSourceResult } from '../datasource';

/**
 * Prisma 客户端类型：支持动态模型访问
 * 与 PrismaClient 兼容，不依赖 prisma generate 是否已执行
 */
export type PrismaClientLike = {
  [model: string]: {
    findMany: (args: {
      where?: Record<string, unknown>;
      take?: number;
      select?: Record<string, boolean>;
      orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
    }) => Promise<Array<Record<string, unknown>>>;
  };
};

/** Prisma 数据源选项 */
export interface PrismaDataSourceOptions {
  /** 表名（对应 Prisma 模型名，首字母小写） */
  model: string;
  /** 查询字段（不传则查询所有字段） */
  select?: Record<string, boolean>;
  /** 返回结果数量限制 */
  limit?: number;
  /** 查询条件（Prisma where 对象） */
  where?: Record<string, unknown>;
  /** 排序（Prisma orderBy 对象） */
  orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
  /** 内容字段名（用于提取文本内容，默认 'content'） */
  contentField?: string;
  /** 是否格式化 JSON 输出 */
  formatJSON?: boolean;
}

/**
 * Prisma PostgreSQL 数据源
 * 
 * @example
 * ```ts
 * import { PrismaClient } from '@prisma/client';
 * import { PrismaDataSource } from '@/lib/prompts/datasources/postgres-prisma';
 * 
 * const prisma = new PrismaClient();
 * const dataSource = new PrismaDataSource(prisma);
 * 
 * // 使用
 * const results = await dataSource.fetch('TypeScript', {
 *   model: 'knowledge',
 *   limit: 5,
 *   where: { published: true },
 * });
 * ```
 */
export class PrismaDataSource implements DatabaseDataSource {
  type = 'database' as const;
  id = 'prisma-postgres';

  constructor(private prisma: PrismaClientLike) {}

  /**
   * 从数据库查询数据
   * @param query 查询关键词（用于文本搜索）
   * @param options 查询选项
   */
  async fetch(
    query: string,
    options?: PrismaDataSourceOptions
  ): Promise<DataSourceResult[]> {
    if (!options?.model) {
      throw new Error('PrismaDataSource: 必须指定 model 选项');
    }

    const model = options.model;
    const limit = options.limit || 5;
    const contentField = options.contentField || 'content';
    const formatJSON = options.formatJSON !== false; // 默认格式化

    // 构建查询条件
    const where = this.buildWhere(query, options.where, contentField);
    const select = options.select;
    const orderBy = options.orderBy;

    try {
      // 动态调用 Prisma 模型方法
      // 注意：这里使用 any 类型，因为 Prisma 模型是动态的
      const modelClient = this.prisma[model];
      if (!modelClient) {
        throw new Error(`Prisma 模型 '${model}' 不存在`);
      }

      // 构建查询参数
      const queryArgs: any = {
        where,
        take: limit,
      };

      if (select) {
        queryArgs.select = select;
      }

      if (orderBy) {
        queryArgs.orderBy = orderBy;
      }

      // 执行查询
      const results = await modelClient.findMany(queryArgs);

      // 转换为 DataSourceResult
      return results.map((row: any) => {
        let content: string;
        
        // 如果指定了 contentField，提取该字段
        if (contentField && row[contentField]) {
          content = String(row[contentField]);
        } else if (formatJSON) {
          // 否则格式化整个对象为 JSON
          content = JSON.stringify(row, null, 2);
        } else {
          // 或者提取所有字符串字段
          content = Object.values(row)
            .filter((v) => typeof v === 'string')
            .join('\n');
        }

        return {
          content,
          metadata: {
            model,
            id: row.id,
            ...(select ? {} : row), // 如果未指定 select，包含所有字段到 metadata
          },
        };
      });
    } catch (error) {
      throw new Error(
        `PrismaDataSource 查询失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 构建 Prisma where 条件
   * 默认在 contentField 上进行文本搜索（ILIKE）
   */
  private buildWhere(
    query: string,
    customWhere?: Record<string, unknown>,
    contentField: string = 'content'
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    // 如果提供了自定义 where，先合并
    if (customWhere) {
      Object.assign(where, customWhere);
    }

    // 添加文本搜索条件（如果 where 中还没有 contentField 的条件）
    if (!where[contentField] && query.trim()) {
      where[contentField] = {
        contains: query,
        mode: 'insensitive', // PostgreSQL 的 ILIKE（不区分大小写）
      };
    }

    return where;
  }

  /**
   * 便捷方法：全文搜索（使用 PostgreSQL 的全文搜索功能）
   * 需要数据库中有对应的全文搜索索引
   */
  async fullTextSearch(
    query: string,
    options?: Omit<PrismaDataSourceOptions, 'where'> & {
      searchField?: string;
    }
  ): Promise<DataSourceResult[]> {
    const model = options?.model;
    if (!model) {
      throw new Error('PrismaDataSource.fullTextSearch: 必须指定 model 选项');
    }

    const searchField = options?.searchField || 'content';
    const limit = options?.limit || 5;

    try {
      const modelClient = this.prisma[model];
      if (!modelClient) {
        throw new Error(`Prisma 模型 '${model}' 不存在`);
      }

      // 使用 PostgreSQL 全文搜索（需要数据库支持）
      const results = await modelClient.findMany({
        where: {
          [searchField]: {
            search: query,
          },
        },
        take: limit,
        ...(options?.select && { select: options.select }),
        ...(options?.orderBy && { orderBy: options.orderBy }),
      });

      return results.map((row: any) => ({
        content: String(row[searchField] || JSON.stringify(row, null, 2)),
        metadata: { model, id: row.id },
      }));
    } catch (error) {
      // 如果全文搜索不支持，回退到普通搜索
      console.warn('全文搜索失败，回退到普通搜索:', error);
      return this.fetch(query, options);
    }
  }
}
