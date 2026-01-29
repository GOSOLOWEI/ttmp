# 模型管理器

统一接入多个大模型厂商（OpenAI、DeepSeek、豆包等），均通过 OpenAI 兼容 API 调用；支持 **Fallback 策略**：某厂商失败时自动切换到下一个已配置厂商。

## 架构概览

- **`providers`**：厂商配置（id、baseURL、默认模型、环境变量键名）
- **`manager`**：单厂商能力——`getClient`、`chat`、`streamChat`、`isProviderConfigured`
- **`fallback`**：策略层——`chatWithFallback`、`streamChatWithFallback`，按顺序尝试厂商并在失败时切换
- **`types`**：统一消息、选项、结果及 Fallback 策略类型

单次指定厂商用 `modelManager.chat(providerId, ...)`；需要失败自动换模型时用 `chatWithFallback(modelManager, ...)` 或 `streamChatWithFallback(...)`。

## 环境变量

在项目根目录创建 `.env.local`，配置各厂商的 API Key（必填）及可选覆盖：

- `OPENAI_API_KEY`、`DEEPSEEK_API_KEY`、`DOUBAO_API_KEY`（必填其一或全部）
- 可选：`*_BASE_URL`、`*_DEFAULT_MODEL`（如 `DOUBAO_BASE_URL`、`DEEPSEEK_DEFAULT_MODEL`）

## 使用示例

### 单厂商调用

```ts
import { modelManager, ModelManager } from '@/lib/models';

const result = await modelManager.chat('deepseek', [
  { role: 'user', content: '你好，请简短回复' },
], { max_tokens: 200 });
console.log(result.choices[0].message.content);

for await (const chunk of modelManager.streamChat('openai', [
  { role: 'user', content: '写一首短诗' },
])) {
  for (const c of chunk.choices)
    if (c.delta.content) process.stdout.write(c.delta.content);
}
```

### Fallback：失败时自动换模型

```ts
import { modelManager, chatWithFallback, streamChatWithFallback } from '@/lib/models';

// 非流式：按顺序尝试 openai → deepseek → doubao，第一个成功即返回
const { result, providerId } = await chatWithFallback(
  modelManager,
  [{ role: 'user', content: '你好' }],
  { max_tokens: 500 }
);
console.log('实际使用厂商:', providerId);
console.log(result.choices[0].message.content);

// 自定义顺序、只试已配置厂商、失败打日志
const res = await chatWithFallback(
  modelManager,
  messages,
  options,
  {
    providerOrder: ['deepseek', 'doubao', 'openai'],
    onlyConfigured: true,
    onProviderFail: (id, err) => console.warn(`厂商 ${id} 失败:`, err),
  }
);

// 流式 Fallback：先探活选定可用厂商，再对该厂商流式输出
const it = streamChatWithFallback(modelManager, messages, options, {
  onProviderFail: (id, err) => console.warn(id, err),
});
for await (const chunk of it) {
  for (const c of chunk.choices)
    if (c.delta.content) process.stdout.write(c.delta.content);
}
// 流式迭代结束后可通过 it.next() 的 return 拿到 { providerId }（若需）
```

### 自定义 Manager（overrides）

```ts
import { ModelManager, chatWithFallback } from '@/lib/models';

const manager = new ModelManager({
  doubao: { apiKey: 'your-key', baseURL: 'https://your-doubao-endpoint/v1' },
});
const { result, providerId } = await chatWithFallback(manager, [{ role: 'user', content: '你好' }]);
```

## 预置厂商与配置层模型列表

| 厂商 ID   | 名称   | 默认模型        | 环境变量 Key     |
|-----------|--------|-----------------|------------------|
| openai    | OpenAI | gpt-4o-mini      | OPENAI_API_KEY   |
| deepseek  | DeepSeek | deepseek-chat  | DEEPSEEK_API_KEY |
| doubao    | 豆包   | doubao-pro-32k  | DOUBAO_API_KEY   |

每个厂商在配置中可声明支持的模型 ID 列表（`providers.ts` 的 `models`），用于展示、下拉或校验；调用时仍通过 `options.model` 指定本次使用的模型。

```ts
import { ModelManager } from '@/lib/models';

// 获取某厂商支持的模型列表（配置层）
const openaiModels = ModelManager.getModels('openai');   // ['gpt-4o', 'gpt-4o-mini', ...]
const deepseekModels = ModelManager.getModels('deepseek'); // ['deepseek-chat', 'deepseek-reasoner']
```

豆包默认 baseURL 为火山方舟示例地址，可设置 `DOUBAO_BASE_URL` 或通过 `ModelManager` 的 overrides 指向万码等兼容端点。
