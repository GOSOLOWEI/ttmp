/**
 * 模板引擎：替换 {{variable}} 占位符
 */

import type { PromptVariables } from './types';

/**
 * 获取嵌套对象的值
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((prev, curr) => {
    return prev ? prev[curr] : undefined;
  }, obj);
}

/**
 * 简单模板引擎：替换 {{variable}} 占位符
 * 示例：formatTemplate("Hello {{user.name}}", { user: { name: "World" } }) => "Hello World"
 */
export function formatTemplate(template: string, variables: PromptVariables): string {
  // 支持数字、字母、下划线、点号和横杠
  return template.replace(/\{\{([\w.-]+)\}\}/g, (match, key) => {
    const value = getNestedValue(variables, key);
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
