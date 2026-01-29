/**
 * 飞书任务（Tasks V2）封装
 */

import { getFeishuClient } from './client';
import type { TaskParams } from './types';
import { wrapRequest } from './utils';

/**
 * 创建飞书任务 (V2)
 */
export async function createFeishuTask(params: TaskParams) {
  const client = getFeishuClient();

  return await wrapRequest(client.task.v2.task.create({
    data: {
      summary: params.summary,
      description: params.description,
      due: params.dueTime ? {
        timestamp: Math.floor(params.dueTime).toString(), // V2 通常接收毫秒级或秒级字符串，此处统一转换
      } : undefined,
      members: params.ownerId ? [
        {
          id: params.ownerId,
          role: 'assignee', // V2 中指定负责人
        }
      ] : [],
    },
  }));
}
