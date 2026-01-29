# Prompt 工程层

与模型层解耦的 Prompt 工程层，负责将业务输入转换为 `ChatMessage[]`，支持模板、Few-shot、动态背景信息注入、Zod JSON 校验等功能。

## 架构概览

- **`types`**：Prompt 相关类型定义
- **`template`**：模板引擎（`{{variable}}` 占位符替换）
- **`builder`**：消息构建器（基础构建 + 支持注入）
- **`datasource`**：数据源抽象（向量检索、数据库、API、历史等）
- **`injector`**：背景信息注入器（多种注入策略）
- **`parser`**：Zod JSON 解析与校验
- **`presets`**：预设场景配置库

## 基础使用

### 1. 使用预设场景

```ts
import { buildPrompt, getPreset } from '@/lib/prompts';
import { modelManager, chatWithFallback } from '@/lib/models';

// 方式 1：使用预设
const preset = getPreset('code-assistant');
const { messages, options } = buildPrompt(preset, {
  language: 'TypeScript',
  task: '实现一个简单的 HTTP 客户端',
  requirements: '使用 async/await，包含错误处理',
});

const { result } = await chatWithFallback(modelManager, messages, options);
console.log(result.choices[0].message.content);
```

### 2. 自定义 Prompt 配置

```ts
import { buildPrompt } from '@/lib/prompts';

const { messages } = buildPrompt(
  {
    id: 'custom',
    system: '你是一个{{role}}',
    user: '请{{action}}：{{content}}',
    defaultOptions: { max_tokens: 1000 },
  },
  {
    role: '产品经理',
    action: '分析需求',
    content: '用户希望...',
  }
);
```

### 3. Few-shot 示例

```ts
const { messages } = buildPrompt(
  {
    id: 'few-shot',
    system: '你是一个情感分析助手',
    fewShot: [
      { user: '今天天气真好', assistant: '积极' },
      { user: '工作压力很大', assistant: '消极' },
    ],
    user: '分析这句话的情感：{{sentence}}',
  },
  { sentence: '这个项目进展顺利' }
);
```

## 动态背景信息注入

### 1. 实现数据源

```ts
import type { DataSource, DataSourceResult } from '@/lib/prompts';

// 示例：内存向量检索数据源
class MemoryVectorSource implements DataSource {
  id = 'memory-vector';
  private documents: Array<{ content: string; embedding?: number[] }> = [];

  async fetch(query: string, options?: { topK?: number }): Promise<DataSourceResult[]> {
    // 简化示例：关键词匹配
    const topK = options?.topK ?? 3;
    const results = this.documents
      .filter((doc) => doc.content.includes(query))
      .slice(0, topK);
    
    return results.map((doc) => ({
      content: doc.content,
      metadata: { source: 'memory' },
    }));
  }
}
```

### 2. 使用注入器

```ts
import { buildPromptWithContext } from '@/lib/prompts';
import type { InjectionConfig } from '@/lib/prompts';

const vectorSource = new MemoryVectorSource();

const { messages } = await buildPromptWithContext(
  {
    id: 'rag-assistant',
    system: '你是一个知识助手，基于提供的背景信息回答问题。',
    user: '问题：{{query}}',
  },
  { query: '什么是 TypeScript？' },
  [
    {
      dataSource: vectorSource,
      strategy: 'prepend-user', // 追加到 user message 开头
      template: '相关背景信息：\n{{content}}\n',
      queryBuilder: (vars) => vars.query as string,
      options: { topK: 3 },
      cache: true, // 启用缓存
      cacheTtl: 60000, // 1 分钟
    },
  ]
);
```

### 3. 注入策略说明

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| `prepend-system` | 追加到 system message 开头 | 全局上下文、角色设定 |
| `append-system` | 追加到 system message 末尾 | 补充规则、约束条件 |
| `prepend-user` | 追加到 user message 开头 | RAG 背景信息 |
| `append-user` | 追加到 user message 末尾 | 补充查询上下文 |
| `separate-message` | 作为独立的 user message | 多轮上下文、历史对话 |
| `template-variable` | 作为模板变量 | 需要在模板中显式使用 `{{context}}` |

## Zod JSON 校验

### 1. 定义 Schema

```ts
import { z } from 'zod';
import { parseJSON, safeParseJSON } from '@/lib/prompts';

// 定义期望的数据结构
const UserSchema = z.object({
  name: z.string(),
  age: z.number().int().positive(),
  email: z.string().email(),
  tags: z.array(z.string()).optional(),
});

type User = z.infer<typeof UserSchema>;
```

### 2. 解析并校验

```ts
import { modelManager, chatWithFallback } from '@/lib/models';
import { buildPrompt, parseJSON } from '@/lib/prompts';

// 使用 json-extractor 预设
const { messages } = buildPrompt(
  getPreset('json-extractor'),
  { text: '用户：张三，25岁，zhang@example.com' }
);

const { result } = await chatWithFallback(modelManager, messages);

// 解析并校验
try {
  const user = parseJSON(result, UserSchema);
  console.log(user.name); // TypeScript 类型安全
} catch (error) {
  console.error('解析失败:', error);
}

// 或使用安全解析（不抛异常）
const parsed = safeParseJSON(result, UserSchema);
if (parsed.success) {
  console.log(parsed.data);
} else {
  console.error(parsed.error);
}
```

### 3. 流式结果解析

```ts
import { parseStreamJSON } from '@/lib/prompts';

// 先收集完整流式内容
let fullContent = '';
for await (const chunk of modelManager.streamChat('openai', messages)) {
  for (const c of chunk.choices) {
    if (c.delta.content) fullContent += c.delta.content;
  }
}

// 解析
const user = parseStreamJSON(fullContent, UserSchema);
```

## PostgreSQL 数据源（Prisma）

### 1. 安装和配置 Prisma

```bash
npm install prisma @prisma/client
npx prisma init
```

在 `.env` 中配置数据库连接：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

### 2. 定义 Schema

参考 `prisma/schema.prisma.example`，创建你的 schema：

```prisma
model Knowledge {
  id        Int      @id @default(autoincrement())
  title     String?
  content   String   @db.Text
  category  String?
  published Boolean  @default(true)
  createdAt DateTime @default(now())
}
```

运行迁移：

```bash
npx prisma migrate dev
npx prisma generate
```

### 3. 使用 Prisma 数据源

```ts
import { PrismaClient } from '@prisma/client';
import { PrismaDataSource } from '@/lib/prompts/datasources/postgres-prisma';
import { buildPromptWithContext } from '@/lib/prompts';
import { modelManager, chatWithFallback } from '@/lib/models';

// 初始化 Prisma
const prisma = new PrismaClient();
const pgSource = new PrismaDataSource(prisma);

// 基础查询
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
        model: 'knowledge', // Prisma 模型名（首字母小写）
        limit: 5,
        contentField: 'content', // 用于提取文本的字段
      },
    },
  ]
);

const { result } = await chatWithFallback(modelManager, messages);
```

### 4. 高级查询选项

```ts
// 带条件查询
const { messages } = await buildPromptWithContext(
  getPreset('rag-assistant'),
  { query: 'React Hooks' },
  [
    {
      dataSource: pgSource,
      strategy: 'prepend-user',
      queryBuilder: (vars) => vars.query as string,
      options: {
        model: 'knowledge',
        limit: 3,
        where: {
          published: true,
          category: 'frontend',
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          content: true,
        },
      },
    },
  ]
);

// 全文搜索（如果数据库支持）
const results = await pgSource.fullTextSearch('TypeScript', {
  model: 'knowledge',
  limit: 5,
  searchField: 'content',
});
```

## 组合使用示例

### RAG + JSON 输出（使用 Prisma）

```ts
import { buildPromptWithContext, parseJSON, getPreset } from '@/lib/prompts';
import { modelManager, chatWithFallback } from '@/lib/models';
import { PrismaClient } from '@prisma/client';
import { PrismaDataSource } from '@/lib/prompts/datasources/postgres-prisma';
import { z } from 'zod';

const AnswerSchema = z.object({
  answer: z.string(),
  sources: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

// 1. 初始化 Prisma 数据源
const prisma = new PrismaClient();
const pgSource = new PrismaDataSource(prisma);

// 2. 构建带数据库背景信息的 prompt
const { messages, options } = await buildPromptWithContext(
  {
    id: 'rag-json',
    system: '基于数据库中的背景信息回答问题，并以 JSON 格式返回答案、来源和置信度。',
    user: '问题：{{query}}',
  },
  { query: 'TypeScript 的优势是什么？' },
  [
    {
      dataSource: pgSource,
      strategy: 'prepend-user',
      queryBuilder: (vars) => vars.query as string,
      options: {
        model: 'knowledge',
        limit: 5,
        where: { published: true },
      },
      cache: true,
      cacheTtl: 300000, // 5 分钟缓存
    },
  ]
);

// 3. 调用模型
const { result } = await chatWithFallback(modelManager, messages, options);

// 4. 解析并校验
const answer = parseJSON(result, AnswerSchema);
console.log(answer.answer, answer.sources, answer.confidence);
```

## 预设场景列表

| 预设 ID | 说明 | 主要变量 |
|---------|------|----------|
| `code-assistant` | 代码助手 | `language`, `task`, `requirements` |
| `code-review` | 代码审查 | `language`, `code` |
| `translator` | 翻译 | `sourceLang`, `targetLang`, `text` |
| `summarizer` | 文本总结 | `text`, `requirements` |
| `json-extractor` | JSON 提取 | `text` |
| `cot-reasoning` | 链式推理 | `question` |
| `rag-assistant` | RAG 问答 | `query`（配合注入使用） |

## 与模型层的集成

Prompt 层只产出 `{ messages: ChatMessage[], options?: {...} }`，模型层负责调用和 fallback：

```ts
import { buildPromptWithContext } from '@/lib/prompts';
import { modelManager, chatWithFallback } from '@/lib/models';

const { messages, options } = await buildPromptWithContext(...);
const { result, providerId } = await chatWithFallback(modelManager, messages, options);
```

两层完全解耦，便于独立测试和替换。
