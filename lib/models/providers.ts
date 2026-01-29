/**
 * 多厂商模型配置
 * 均使用 OpenAI 兼容 API，通过 baseURL + apiKey 区分
 */

export interface ProviderConfig {
  /** 唯一标识，用于 getClient / chat 时指定 */
  id: string;
  /** 展示名称 */
  name: string;
  /** API 基础地址，不填则使用 OpenAI 默认 */
  baseURL?: string;
  /** 该厂商默认模型 ID */
  defaultModel: string;
  /** 该厂商支持的模型 ID 列表，用于配置层展示、下拉选项或校验；不传则仅以 defaultModel 为准 */
  models?: readonly string[];
  /** 环境变量中的 API Key 键名 */
  envKey: string;
}

/** 预置厂商配置 */
export const PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    envKey: 'OPENAI_API_KEY',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    envKey: 'DEEPSEEK_API_KEY',
  },
  doubao: {
    id: 'doubao',
    name: '豆包',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-pro-32k',
    models: ['doubao-pro-32k', 'doubao-pro-4k', 'doubao-1-5-pro-32k'], // 以实际接入的模型名为准
    envKey: 'DOUBAO_API_KEY',
  },
} as const;

export type ProviderId = keyof typeof PROVIDERS;
