/**
 * 模型管理器：统一接入 OpenAI / DeepSeek / 豆包 等兼容 API
 * 通过 baseURL + apiKey 区分厂商，使用 OpenAI SDK 发起请求
 */

import OpenAI from 'openai';
import { PROVIDERS, type ProviderConfig, type ProviderId } from './providers';
import type {
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResult,
  ChatCompletionChunk,
} from './types';

/** 可选覆盖：为某厂商指定 apiKey / baseURL（不传则从环境变量读取） */
export interface ProviderOverrides {
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
}

export class ModelManager {
  private overrides: Partial<Record<ProviderId, ProviderOverrides>> = {};
  private clients: Partial<Record<ProviderId, OpenAI>> = {};

  constructor(overrides?: Partial<Record<ProviderId, ProviderOverrides>>) {
    if (overrides) this.overrides = overrides;
  }

  /** 获取某厂商的配置（含环境变量与 overrides） */
  private getEffectiveConfig(providerId: ProviderId): ProviderConfig & { apiKey: string } {
    const config = PROVIDERS[providerId];
    if (!config) throw new Error(`未知厂商: ${providerId}`);

    const envKey = config.envKey;
    const apiKey =
      this.overrides[providerId]?.apiKey ??
      (typeof process !== 'undefined' && process.env?.[envKey]);
    if (!apiKey) throw new Error(`未配置 ${providerId} API Key，请设置环境变量 ${envKey}`);

    const envBaseURL =
      typeof process !== 'undefined'
        ? (process.env as Record<string, string | undefined>)[`${providerId.toUpperCase()}_BASE_URL`]
        : undefined;
    const baseURL =
      this.overrides[providerId]?.baseURL ?? envBaseURL ?? config.baseURL ?? undefined;

    const envDefaultModel =
      typeof process !== 'undefined'
        ? (process.env as Record<string, string | undefined>)[`${providerId.toUpperCase()}_DEFAULT_MODEL`]
        : undefined;
    const defaultModel =
      this.overrides[providerId]?.defaultModel ?? envDefaultModel ?? config.defaultModel;

    return { ...config, baseURL, defaultModel, apiKey };
  }

  /** 获取某厂商的 OpenAI 兼容客户端（带缓存） */
  getClient(providerId: ProviderId): OpenAI {
    if (this.clients[providerId]) return this.clients[providerId]!;
    const { apiKey, baseURL } = this.getEffectiveConfig(providerId);
    const client = new OpenAI({ apiKey, baseURL: baseURL ?? undefined });
    this.clients[providerId] = client;
    return client;
  }

  /** 非流式对话 */
  async chat(
    providerId: ProviderId,
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<ChatCompletionResult> {
    const client = this.getClient(providerId);
    const config = this.getEffectiveConfig(providerId);
    const model = options.model ?? config.defaultModel;

    const response = await client.chat.completions.create({
      model,
      messages: messages.map((m) => ({ 
        role: m.role, 
        content: m.content,
        tool_calls: m.tool_calls,
        tool_call_id: m.tool_call_id,
        name: m.name
      }) as any),
      max_tokens: options.max_tokens,
      temperature: options.temperature,
      tools: options.tools as any,
      tool_choice: options.tool_choice as any,
      stream: false,
    });

    const choice = response.choices[0];
    if (!choice?.message) throw new Error('模型未返回有效消息');

    return {
      id: response.id,
      choices: response.choices.map((c) => ({
        message: { 
          role: c.message!.role as ChatMessage['role'], 
          content: c.message!.content ?? '',
          tool_calls: c.message!.tool_calls
        },
        index: c.index,
        finish_reason: c.finish_reason,
      })),
      usage: response.usage
        ? {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens ?? 0,
            total_tokens: response.usage.total_tokens ?? 0,
          }
        : undefined,
    };
  }

  /** 流式对话，返回异步迭代器 */
  async *streamChat(
    providerId: ProviderId,
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): AsyncGenerator<ChatCompletionChunk, void, undefined> {
    const client = this.getClient(providerId);
    const config = this.getEffectiveConfig(providerId);
    const model = options.model ?? config.defaultModel;

    const stream = await client.chat.completions.create({
      model,
      messages: messages.map((m) => ({ 
        role: m.role, 
        content: m.content,
        tool_calls: m.tool_calls,
        tool_call_id: m.tool_call_id,
        name: m.name
      }) as any),
      max_tokens: options.max_tokens,
      temperature: options.temperature,
      tools: options.tools as any,
      tool_choice: options.tool_choice as any,
      stream: true,
    });

    for await (const chunk of stream) {
      yield {
        id: chunk.id,
        choices: chunk.choices.map((c) => ({
          delta: {
            role: c.delta?.role as ChatMessage['role'] | undefined,
            content: c.delta?.content ?? undefined,
            tool_calls: c.delta?.tool_calls as any,
          },
          index: c.index,
          finish_reason: c.finish_reason,
        })),
      };
    }
  }

  /** 判断某厂商是否已配置（有 API Key），用于 fallback 时只试已配置厂商 */
  isProviderConfigured(providerId: ProviderId): boolean {
    try {
      this.getEffectiveConfig(providerId);
      return true;
    } catch {
      return false;
    }
  }

  /** 列出已配置的厂商 ID */
  static getProviderIds(): ProviderId[] {
    return Object.keys(PROVIDERS) as ProviderId[];
  }

  /** 获取厂商展示信息（名称、默认模型等） */
  static getProviderInfo(providerId: ProviderId): ProviderConfig | undefined {
    return PROVIDERS[providerId];
  }

  /** 获取某厂商支持的模型 ID 列表（配置层），用于下拉、校验等；未配置 models 时返回 [defaultModel] */
  static getModels(providerId: ProviderId): string[] {
    const config = PROVIDERS[providerId];
    if (!config) return [];
    if (config.models?.length) return [...config.models];
    return [config.defaultModel];
  }
}

/** 默认单例（使用环境变量，无 overrides） */
export const modelManager = new ModelManager();
