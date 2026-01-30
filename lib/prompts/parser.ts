/**
 * JSON 解析器：使用 Zod 校验模型返回的结构化数据
 */

import { z } from 'zod';
import type { ChatCompletionResult } from '@/lib/models';

/**
 * 解析并校验模型返回的 JSON 内容
 * @param result 模型返回结果
 * @param schema Zod schema
 * @returns 解析后的类型安全数据
 */
export function parseJSON<T>(
  result: ChatCompletionResult,
  schema: z.ZodSchema<T>
): T {
  const content = result.choices[0]?.message?.content;
  if (!content) {
    throw new Error('模型未返回有效内容');
  }

  // 尝试提取 JSON（可能包含 markdown 代码块）
  let jsonStr = '';
  if (typeof content === 'string') {
    jsonStr = content.trim();
  } else {
    // 处理 MessageContentPart[]
    jsonStr = content
      .map((part) => (part.type === 'text' ? part.text : ''))
      .join('')
      .trim();
  }

  // 移除 markdown 代码块标记
  if (jsonStr.startsWith('```')) {
    const lines = jsonStr.split('\n');
    const startIndex = lines.findIndex((line: string) => line.includes('```'));
    const endIndex = lines.findIndex((line: string, idx: number) => idx > startIndex && line.includes('```'));
    if (startIndex !== -1 && endIndex !== -1) {
      jsonStr = lines.slice(startIndex + 1, endIndex).join('\n');
    }
  }

  // 尝试解析 JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (error) {
    throw new Error(`JSON 解析失败: ${error instanceof Error ? error.message : String(error)}\n原始内容: ${content}`);
  }

  // Zod 校验
  try {
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Zod 校验失败:\n${error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n')}\n原始内容: ${content}`
      );
    }
    throw error;
  }
}

/**
 * 安全解析：校验失败时返回错误而不是抛异常
 */
export function safeParseJSON<T>(
  result: ChatCompletionResult,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = parseJSON(result, schema);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 从流式结果中提取完整内容并解析 JSON
 * 注意：需要先收集完整流式内容
 */
export function parseStreamJSON<T>(
  fullContent: string,
  schema: z.ZodSchema<T>
): T {
  let jsonStr = fullContent.trim();

  // 移除 markdown 代码块标记
  if (jsonStr.startsWith('```')) {
    const lines = jsonStr.split('\n');
    const startIndex = lines.findIndex((line) => line.includes('```'));
    const endIndex = lines.findIndex((line, idx) => idx > startIndex && line.includes('```'));
    if (startIndex !== -1 && endIndex !== -1) {
      jsonStr = lines.slice(startIndex + 1, endIndex).join('\n');
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (error) {
    throw new Error(`JSON 解析失败: ${error instanceof Error ? error.message : String(error)}\n原始内容: ${fullContent}`);
  }

  try {
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Zod 校验失败:\n${error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n')}\n原始内容: ${fullContent}`
      );
    }
    throw error;
  }
}
