import { env } from "../env";
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
    defaultModel: 'ep-20260129162318-pm5jd',
    // Doubao-Seed-1.8，thing-251104, 智能路由
    models: ['ep-20260129162318-pm5jd', "ep-20260129162541-ngdv4","ep-20260120182539-s2942"], // 以实际接入的模型名为准
    envKey: 'DOUBAO_API_KEY',
  },
} as const;

export type ProviderId = keyof typeof PROVIDERS;
