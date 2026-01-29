import { taskService } from '../services/task';

/**
 * 数据库 AI 工具封装层 (Tool Layer)
 * 职责：定义模型可见的 Schema，并增加权限护栏 (Guardrails)
 */

// 1. 查询工具声明
export const queryMyTasksTool = {
  type: 'function',
  function: {
    name: 'query_my_tasks',
    description: '查看我目前的所有待办任务列表。',
    parameters: {
      type: 'object',
      properties: {} // 无需参数，因为我们会从上下文中自动注入用户 ID
    }
  }
};

// 2. 创建工具声明
export const createMyTaskTool = {
  type: 'function',
  function: {
    name: 'create_my_task',
    description: '在我名下创建一个新的待办任务。',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '任务标题' },
        due_at: { type: 'string', description: '截止日期 (YYYY-MM-DD)' }
      },
      required: ['title', 'due_at']
    }
  }
};

/**
 * 统一的工具执行分发器 (Handler)
 * 注意：这里通过 context 注入了当前用户的真实身份，防止 AI 越权
 */
export async function dbToolDispatcher(toolName: string, args: any, context: { currentUserId: string }) {
  console.log(`🛡️  [Tool Guard] 正在为用户 ${context.currentUserId} 执行工具: ${toolName}`);

  switch (toolName) {
    case 'query_my_tasks':
      // 护栏：强制只能查询 context 里的 userId
      const tasks = await taskService.getTasksByUserId(context.currentUserId);
      if (tasks.length === 0) return "你目前没有任何任务。";
      return tasks.map(t => `- [${t.status}] ${t.title} (截止: ${t.dueAt})`).join('\n');

    case 'create_my_task':
      // 业务校验护栏：比如标题不能为空等
      if (!args.title) return "错误：任务标题不能为空。";
      
      const newTask = await taskService.createTask({
        title: args.title,
        dueAt: args.due_at,
        creatorId: context.currentUserId // 强制注入当前用户 ID，防止 AI 给别人创建任务
      });
      return `✅ 任务已创建，任务 ID: ${newTask.id}`;

    default:
      throw new Error(`未知的数据库工具: ${toolName}`);
  }
}
