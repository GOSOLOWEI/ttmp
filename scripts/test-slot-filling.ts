import { modelManager } from '../lib/models/manager';
import { taskFormTool, TaskFormManager } from '../lib/tools/task-form';

/**
 * 运行交互式填单（Slot Filling）测试
 * 模拟用户与 AI 的多轮对话
 */
async function runSlotFillingTest() {
  console.log('🚀 开始交互式填单（Slot Filling）测试...');
  console.log('场景：用户想要创建一个任务，但信息不全，AI 将引导补全。\n');

  const formManager = new TaskFormManager();
  const messages: any[] = [
    { 
      role: 'system', 
      content: `你是一个飞书任务助手。你的职责是收集创建任务所需的 [任务标题] 和 [截止时间]。
请通过调用 update_task_form 工具来保存用户提供的信息。
如果信息不完整，请查阅当前状态并有礼貌地向用户追问缺失的项。
如果信息已完整，请向用户确认所有信息并询问是否立即创建。` 
    }
  ];

  // 模拟用户的多轮输入
  const userSteps = [
    "帮我记个明天开会的事",   // 第一轮：只提供了标题和部分日期
    "下午三点"               // 第二轮：补充具体时间
  ];

  for (let i = 0; i < userSteps.length; i++) {
    const userInput = userSteps[i];
    console.log(`\n--- 第 ${i + 1} 轮 ---`);
    console.log(`👤 用户: ${userInput}`);
    
    // 动态更新系统提示词，确保模型知道当前表单里有什么
    const currentState = formManager.getState();
    messages[0].content = `你是一个飞书任务助手。
你的职责是收集创建任务所需的 [任务标题] 和 [截止时间]。

[当前表单状态]
${JSON.stringify(currentState, null, 2)}

[指令]
1. 只要从用户输入中解析到标题或时间，必须立即调用 update_task_form 工具。
2. 即使信息不全（例如只有日期没有具体时间），也要先调用工具保存已有的部分。
3. 调用工具后，查看工具返回的结果，如果有缺失项，请有礼貌地向用户追问。
4. 严禁在解析到信息的情况下不调用工具直接回复。`;

    messages.push({ role: 'user', content: userInput });

    // 1. 发起请求，携带工具定义
    const result = await modelManager.chat('deepseek', messages, {
      tools: [taskFormTool],
      tool_choice: 'auto'
    });

    const assistantMessage = result.choices[0].message;

    // 2. 如果模型决定调用工具
    if (assistantMessage.tool_calls) {
      for (const call of assistantMessage.tool_calls) {
        const args = JSON.parse(call.function.arguments);
        console.log(`🤖 AI 决定调用工具 [${call.function.name}]:`, args);
        
        // 执行工具：更新内存中的表单状态
        const newState = formManager.update(args);
        
        // 将工具执行结果回传给模型
        messages.push(assistantMessage);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: 'update_task_form',
          content: JSON.stringify({ 
            current_form: newState, 
            is_complete: formManager.isComplete(),
            missing_fields: formManager.getMissingFields()
          })
        });
      }

      // 再次请求模型，让它基于更新后的状态生成回复
      const secondResult = await modelManager.chat('deepseek', messages);
      const finalReply = secondResult.choices[0].message.content;
      console.log(`🤖 AI 回复: ${finalReply}`);
      messages.push({ role: 'assistant', content: finalReply });
    } else {
      // 模型没有调用工具，直接回复了
      console.log(`🤖 AI 直接回复: ${assistantMessage.content}`);
      messages.push(assistantMessage);
    }

    console.log(`📊 当前表单状态:`, formManager.getState());
  }

  if (formManager.isComplete()) {
    console.log('\n✅ 测试成功：表单已填满，现在可以调用真正的飞书 API 创建任务了。');
  } else {
    console.log('\n⏳ 表单尚未填满，还需要继续追问。');
  }
}

runSlotFillingTest().catch(console.error);
