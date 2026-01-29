/**
 * 带校验器的任务工具 (Guardrails Demo)
 */

export const guardedTaskTool = {
  type: 'function',
  function: {
    name: 'create_secure_task',
    description: '安全地创建一个飞书任务。具备内置的合规性校验。',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: '任务标题' },
        due_time: { type: 'string', description: '截止时间 (YYYY-MM-DD HH:mm)' }
      },
      required: ['summary', 'due_time']
    }
  }
};

/**
 * 带护栏的执行器
 */
export async function handleCreateTaskWithGuardrails(args: { summary: string, due_time: string }) {
  console.log(`🛡️  [Guardrail] 正在校验参数:`, args);

  // 1. 标题校验
  if (args.summary.length < 4) {
    return {
      status: 'rejected',
      reason: '标题太短',
      message: '任务标题至少需要4个字符以确保描述清晰。',
      suggestion: '请根据用户的原意，生成一个更具描述性的标题（例如将"开会"优化为"关于项目进度的周会"）。'
    };
  }

  // 2. 时间校验
  const due = new Date(args.due_time);
  const now = new Date();
  
  if (isNaN(due.getTime())) {
    return {
      status: 'rejected',
      reason: '日期格式错误',
      message: '无法解析提供的日期。',
      suggestion: '请确保使用 YYYY-MM-DD HH:mm 格式。'
    };
  }

  if (due < now) {
    return {
      status: 'rejected',
      reason: '截止时间过期',
      message: `提供的截止时间 (${args.due_time}) 早于当前系统时间 (${now.toLocaleString()})。`,
      suggestion: '你不能创建过去的任务。请检查是否误解了用户的相对时间描述（如"昨天"），并要求用户提供一个未来的时间，或自动顺延到下一个可用时间。'
    };
  }

  // 3. 通过校验
  console.log(`✅ [Guardrail] 校验通过，正在调用飞书 API...`);
  return {
    status: 'success',
    task_id: 'task_' + Math.random().toString(36).substr(2, 9),
    message: '任务已成功创建'
  };
}
