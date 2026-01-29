# 数据源实现

本目录包含各种数据源的实现示例和实际实现。

## Prisma PostgreSQL 数据源（推荐）

### 快速开始

```ts
import { PrismaClient } from '@prisma/client';
import { PrismaDataSource } from '@/lib/prompts/datasources/postgres-prisma';
import { buildPromptWithContext } from '@/lib/prompts';
import { modelManager, chatWithFallback } from '@/lib/models';

// 1. 初始化
const prisma = new PrismaClient();
const pgSource = new PrismaDataSource(prisma);

// 2. 使用
const { messages } = await buildPromptWithContext(
  {
    id: 'rag-assistant',
    system: '基于数据库信息回答问题',
    user: '问题：{{query}}',
  },
  { query: '什么是 TypeScript？' },
  [
    {
      dataSource: pgSource,
      strategy: 'prepend-user',
      queryBuilder: (vars) => vars.query as string,
      options: {
        model: 'knowledge', // Prisma 模型名
        limit: 5,
      },
    },
  ]
);

const { result } = await chatWithFallback(modelManager, messages);
```

### 选项说明

| 选项 | 类型 | 说明 | 必填 |
|------|------|------|------|
| `model` | `string` | Prisma 模型名（首字母小写） | ✅ |
| `limit` | `number` | 返回结果数量限制 | ❌ |
| `select` | `Record<string, boolean>` | 选择特定字段 | ❌ |
| `where` | `Record<string, unknown>` | Prisma where 条件 | ❌ |
| `orderBy` | `object \| array` | 排序规则 | ❌ |
| `contentField` | `string` | 用于提取文本的字段名（默认 'content'） | ❌ |
| `formatJSON` | `boolean` | 是否格式化 JSON 输出（默认 true） | ❌ |

### 查询示例

#### 基础查询

```ts
await pgSource.fetch('TypeScript', {
  model: 'knowledge',
  limit: 5,
});
```

#### 带条件查询

```ts
await pgSource.fetch('React', {
  model: 'knowledge',
  limit: 3,
  where: {
    published: true,
    category: 'frontend',
  },
  orderBy: { createdAt: 'desc' },
});
```

#### 选择特定字段

```ts
await pgSource.fetch('Vue', {
  model: 'knowledge',
  select: {
    id: true,
    title: true,
    content: true,
  },
});
```

#### 全文搜索（如果数据库支持）

```ts
await pgSource.fullTextSearch('TypeScript', {
  model: 'knowledge',
  limit: 5,
  searchField: 'content',
});
```

## 其他数据源示例

参考 `examples.ts` 中的实现：
- `MemoryVectorSource`：内存向量检索
- `MemoryHistorySource`：对话历史
- `WeatherAPISource`：API 数据源示例
- `DatabaseSource`：通用数据库源（已废弃，推荐使用 PrismaDataSource）

## 实现自定义数据源

实现 `DataSource` 接口：

```ts
import type { DataSource, DataSourceResult } from '../datasource';

export class MyCustomSource implements DataSource {
  id = 'my-custom-source';

  async fetch(
    query: string,
    options?: Record<string, unknown>
  ): Promise<DataSourceResult[]> {
    // 你的实现
    return [
      {
        content: '...',
        metadata: { ... },
      },
    ];
  }
}
```
