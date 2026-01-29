import { modelManager } from '../lib/models/manager';
import { guardedTaskTool, handleCreateTaskWithGuardrails } from '../lib/tools/guarded-task';

/**
 * 运行 Guardrails（校验器反馈循环）测试
 */
async function runGuardrailsTest() {
  console.log('🚀 开始 Guardrails（带校验器的工具调用）测试...');
  console.log('场景：用户给出了一个不合法的日期（昨天），看 AI 如何在被校验器拦截后自动修正。\n');

  // 模拟当前时间
  const now = new Date();
  console.log(`📅 系统当前时间: ${now.toLocaleString()}`);

  const messages: any[] = [
    { 
      role: 'system', 
      content: `你是一个飞书助手。当前系统时间是 ${now.toLocaleString()}。
当用户要求创建任务时，你必须调用 create_secure_task 工具。

[自愈规则]
1. 如果工具返回 'rejected'，请优先根据建议自行修正参数。
2. 特别注意日期问题：如果用户提到的是过去的时间（如“昨天”），由于系统限制不能创建过去的任务，请你自动将时间顺延至【当前时间】或【今天晚些时候】，并在回复中告知用户已为你顺延时间记录。
3. 你的目标是尽可能通过自我修正完成工具调用，实现“自动化处理”。` 
    },
    { role: 'user', content: '帮我记下昨天开会的事，标题叫"开会"' }
  ];

  let turn = 1;
  let success = false;

  while (turn <= 5 && !success) {
    console.log(`\n--- 第 ${turn} 轮对话 ---`);
    
    // 1. 发起模型请求
    const result = await modelManager.chat('deepseek', messages, {
      tools: [guardedTaskTool],
      // 第一轮强制调用工具，以触发护栏演示
      tool_choice: turn === 1 ? { type: 'function', function: { name: 'create_secure_task' } } : 'auto'
    });

    const assistantMessage = result.choices[0].message;

    // 2. 处理模型响应
    if (assistantMessage.tool_calls) {
      const call = assistantMessage.tool_calls[0];
      const args = JSON.parse(call.function.arguments);
      console.log(`🤖 AI 尝试调用工具: ${call.function.name}`, args);

      // 3. 执行带校验的 Handler (这就是护栏)
      const executionResult = await handleCreateTaskWithGuardrails(args);

      if (executionResult.status === 'success') {
        console.log(`✨ 执行成功:`, executionResult.message);
        success = true;
      } else {
        console.log(`❌ 被校验器拦截: [${executionResult.reason}] ${executionResult.message}`);
        console.log(`💡 校验器给 AI 的建议: ${executionResult.suggestion}`);

        // 将错误反馈给 AI，让它自我修正
        messages.push(assistantMessage);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: 'create_secure_task',
          content: JSON.stringify(executionResult)
        });
      }
    } else {
      console.log(`🤖 AI 回复: ${assistantMessage.content}`);
      messages.push(assistantMessage);
      // 不再 break，给 AI 机会在下一轮根据之前的对话继续尝试（如果还有轮数）
    }

    turn++;
  }

  if (success) {
    console.log('\n✅ 测试成功：经过反馈循环，AI 最终生成了合规的请求并成功执行。');
  } else {
    console.log('\n❌ 测试结束，未能在限制轮数内完成合规调用。');
  }
}

runGuardrailsTest().catch(console.error);
