/**
 * 模板引擎：替换 {{variable}} 占位符
 */

import type { PromptVariables } from './types';

/**
 * 简单模板引擎：替换 {{variable}} 占位符
 * 示例：formatTemplate("Hello {{name}}", { name: "World" }) => "Hello World"
 */
export function formatTemplate(template: string, variables: PromptVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key];
    if (value === undefined || value === null) {
      console.warn(`模板变量 ${key} 未提供，将保留占位符`);
      return match;
    }
    return String(value);
  });
}

/**
 * 批量格式化多个模板
 */
export function formatTemplates(
  templates: Array<{ content: string }>,
  variables: PromptVariables
): Array<{ content: string }> {
  return templates.map((t) => ({
    ...t,
    content: formatTemplate(t.content, variables),
  }));
}
