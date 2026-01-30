/**
 * Prompt 工程层入口
 * 与模型层解耦：只负责构建 messages，不关心具体厂商/模型
 */

export { formatTemplate, formatTemplates } from './template';
export { buildPrompt, buildPromptWithContext } from './builder';
export { PROMPT_PRESETS, getPreset, getPromptConfig, listPresets } from './presets';
export { ContextInjector } from './injector';
export { parseJSON, safeParseJSON, parseStreamJSON } from './parser';
export type {
  PromptConfig,
  PromptVariables,
  BuiltPrompt,
  MessageTemplate,
} from './types';
export type {
  DataSource,
  DataSourceResult,
  VectorDataSource,
  DatabaseDataSource,
  APIDataSource,
  HistoryDataSource,
} from './datasource';
export type {
  InjectionConfig,
  InjectionStrategy,
} from './injector';
