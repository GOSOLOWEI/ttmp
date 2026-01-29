/**
 * 预设 Prompt 配置库
 * 按场景组织，便于复用和统一管理
 */

import type { PromptConfig } from './types';

/**
 * 预设 Prompt 配置库
 */
export const PROMPT_PRESETS: Record<string, PromptConfig> = {
  // 代码助手
  'code-assistant': {
    id: 'code-assistant',
    system: '你是一个专业的代码助手，擅长编写清晰、高效的代码。',
    user: '请用{{language}}编写一个{{task}}，要求：{{requirements}}',
    defaultOptions: {
      max_tokens: 2000,
      temperature: 0.3,
    },
  },

  // 代码审查
  'code-review': {
    id: 'code-review',
    system: '你是一个经验丰富的代码审查专家，专注于代码质量、性能和最佳实践。',
    user: '请审查以下{{language}}代码，指出潜在问题和改进建议：\n\n```{{language}}\n{{code}}\n```',
    defaultOptions: {
      max_tokens: 1500,
      temperature: 0.2,
    },
  },

  // 翻译
  translator: {
    id: 'translator',
    system: '你是一个专业的翻译助手，能够准确、流畅地翻译文本。',
    user: '请将以下{{sourceLang}}文本翻译成{{targetLang}}：\n\n{{text}}',
    defaultOptions: {
      temperature: 0.3,
    },
  },

  // 文本总结
  summarizer: {
    id: 'summarizer',
    system: '你是一个专业的文本总结助手，能够提取关键信息并生成简洁的摘要。',
    user: '请总结以下文本，要求：{{requirements}}\n\n{{text}}',
    defaultOptions: {
      max_tokens: 500,
      temperature: 0.4,
    },
  },

  // 结构化输出（JSON）
  'json-extractor': {
    id: 'json-extractor',
    system: `你是一个数据提取助手。请从文本中提取信息，并严格按照以下 JSON 格式返回：
{
  "key1": "value1",
  "key2": "value2"
}

只返回 JSON，不要其他说明文字。`,
    user: '请从以下文本中提取信息：\n\n{{text}}',
    defaultOptions: {
      temperature: 0.1, // 低温度保证格式稳定
    },
  },

  // Chain-of-Thought 推理
  'cot-reasoning': {
    id: 'cot-reasoning',
    system: '你是一个逻辑推理专家。请先一步步思考，再给出最终答案。',
    user: '问题：{{question}}\n\n请先分析，再给出答案。',
    defaultOptions: {
      max_tokens: 1000,
      temperature: 0.5,
    },
  },

  // RAG 问答助手（配合背景信息注入使用）
  'rag-assistant': {
    id: 'rag-assistant',
    system: '你是一个知识助手，基于提供的背景信息回答问题。如果背景信息中没有相关内容，请明确说明。',
    user: '问题：{{query}}',
    defaultOptions: {
      max_tokens: 1000,
      temperature: 0.3,
    },
  },
};

/**
 * 获取预设配置
 */
export function getPreset(presetId: string): PromptConfig | undefined {
  return PROMPT_PRESETS[presetId];
}

/**
 * 列出所有预设 ID
 */
export function listPresets(): string[] {
  return Object.keys(PROMPT_PRESETS);
}
