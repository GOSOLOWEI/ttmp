import { modelManager } from '../lib/models/manager';
import { queryMyTasksTool, createMyTaskTool, dbToolDispatcher } from '../lib/tools/db-tools';

/**
 * 数据库接入演示脚本
 * 展示“Service 层 -> Tool 层 -> AI 调度”的完整链路
 */
async function runDbAgentDemo() {
  console.log('🚀 开始数据库 Agent 架构演示...\n');

  // 1. 模拟从 JWT 或飞书 Session 获取的当前用户信息 (Context)
  // 这是安全的关键：不要让 AI 决定用户 ID，而是在代码层注入
  const userContext = { currentUserId: 'fs_user_888' };

  const messages: any[] = [
    { 
      role: 'system', 
      content: `你是一个智能助理。当前用户的飞书 ID 是 ${userContext.currentUserId}。
你可以调用数据库工具来查看或创建任务。请注意，你只能操作该用户自己的数据。` 
    },
    { role: 'user', content: '我最近有哪些活要干？顺便帮我记个明天要交周报的任务。' }
  ];

  console.log(`👤 用户输入: "${messages[1].content}"\n`);

  // 2. 发起 AI 请求
  const result = await modelManager.chat('deepseek', messages, {
    tools: [queryMyTasksTool, createMyTaskTool],
    tool_choice: 'auto'
  });

  const message = result.choices[0].message;

  // 3. 处理工具调用循环
  if (message.tool_calls) {
    for (const call of message.tool_calls) {
      const toolName = call.function.name;
      const args = JSON.parse(call.function.arguments);

      // 调用分层后的 Dispatcher，并注入 context
      const executionResult = await dbToolDispatcher(toolName, args, userContext);
      
      console.log(`🤖 AI 调用工具 [${toolName}]`);
      console.log(`📥 执行结果:\n${executionResult}\n`);

      // 4. 将结果给回 AI (模拟下一轮回复)
      messages.push(message);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: toolName,
        content: String(executionResult)
      });
    }

    const finalResponse = await modelManager.chat('deepseek', messages);
    console.log(`🤖 AI 最终回复: ${finalResponse.choices[0].message.content}`);
  }

  console.log('\n✅ 演示完毕：架构层次分明，逻辑安全可控。');
}

runDbAgentDemo().catch(console.error);
