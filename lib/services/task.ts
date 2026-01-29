// import { prisma } from '../prisma';

/**
 * 任务业务逻辑层 (Service Layer)
 * 职责：纯粹的数据库操作，不感知 AI 逻辑
 */
export const taskService = {
  /**
   * 根据用户 ID 获取其名下的所有任务
   */
  async getTasksByUserId(userId: string) {
    console.log(`[Service] 正在数据库中查询用户 ${userId} 的任务...`);
    
    // 实际代码示例:
    // return await prisma.task.findMany({ where: { creatorId: userId } });

    // 备注：此处返回模拟数据
    return [
      { id: 't1', title: '完成 Agent 架构设计', dueAt: '2026-02-01', status: 'TODO' },
      { id: 't2', title: '飞书接口调试', dueAt: '2026-01-30', status: 'IN_PROGRESS' }
    ];
  },

  /**
   * 创建新任务
   */
  async createTask(data: { title: string; dueAt: string; creatorId: string }) {
    console.log(`[Service] 正在数据库中为用户 ${data.creatorId} 创建任务: ${data.title}`);
    
    // 实际代码示例:
    // return await prisma.task.create({ data });

    return { id: 'new_t_' + Math.random().toString(36).slice(2, 7), ...data };
  }
};
