/**
 * 任务表单工具
 * 用于演示交互式填单（Slot Filling）逻辑
 */

export const taskFormTool = {
  type: 'function',
  function: {
    name: 'update_task_form',
    description: '【重要】只要识别到任务标题、截止时间或描述，必须调用此工具更新后台状态。',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: '任务标题（如：开会、周报）' },
        due_time: { type: 'string', description: '截止时间（需解析为具体的日期时间字符串，如 2026-01-30 15:00）' },
        description: { type: 'string', description: '任务详细描述' }
      },
      required: [] // 所有字段都是可选的，因为是逐步填单
    }
  }
};

/** 模拟表单状态存储（实际项目中应根据 chat_id 存入数据库或 Session） */
export class TaskFormManager {
  private state: Record<string, any> = {
    summary: null,
    due_time: null,
    description: null
  };

  /** 获取当前状态 */
  getState() {
    return this.state;
  }

  /** 更新状态 */
  update(args: any) {
    Object.keys(args).forEach(key => {
      if (args[key] !== undefined && args[key] !== null) {
        this.state[key] = args[key];
      }
    });
    return this.state;
  }

  /** 检查必填项是否已填满 */
  isComplete() {
    return !!(this.state.summary && this.state.due_time);
  }

  /** 获取缺失的字段描述 */
  getMissingFields() {
    const missing = [];
    if (!this.state.summary) missing.push('任务标题');
    if (!this.state.due_time) missing.push('截止时间');
    return missing;
  }

  /** 重置表单 */
  reset() {
    this.state = { summary: null, due_time: null, description: null };
  }
}
