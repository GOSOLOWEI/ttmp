import { modelManager } from '../lib/models/manager';
import { routerTools } from '../lib/tools/router';

/**
 * 意图分拣中心
 * 模拟将用户请求路由到不同的业务处理逻辑
 */
async function mainDispatcher(userInput: string) {
  console.log(`\n-----------------------------------------`);
  console.log(`👤 用户输入: "${userInput}"`);

  // 1. 让模型作为分拣员 (Router)
  // 使用 tool_choice: 'required' 强制模型必须调用工具进行分类
  const result = await modelManager.chat('deepseek', [
    { 
      role: 'system', 
      content: '你是一个高效率的后台请求分拣员。请分析用户的意图，并调用唯一正确的工具进行分类。禁止直接聊天。' 
    },
    { role: 'user', content: userInput }
  ], {
    tools: routerTools,
    tool_choice: 'auto' // 这里使用 auto 也可以，因为 system prompt 已经很强，但在某些模型上可以用强制模式
  });

  const message = result.choices[0].message;
  
  if (message.tool_calls) {
    const toolCall = message.tool_calls[0];
    const intent = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);

    console.log(`🎯 模型识别意图: [${intent}]`);
    console.log(`📦 提取参数:`, args);

    // 2. 根据分拣结果，进入固定的业务执行路径 (Dispatcher)
    // 这里的流程是由代码 (Switch Case) 控制的，非常安全稳定
    switch (intent) {
      case 'route_to_task_manager':
        await handleTaskManager(args);
        break;
      case 'route_to_knowledge_base':
        await handleKnowledgeBase(args);
        break;
      case 'route_to_chat':
        await handleGeneralChat(args, userInput);
        break;
      default:
        console.log("⚠️ 路由失败：未定义该路径的处理逻辑");
    }
  } else {
    console.log(`🤖 AI 直接回复（未分拣）: ${message.content}`);
  }
}

/** --- 业务柜台 A: 任务管理 --- */
async function handleTaskManager(args: any) {
  console.log("⚙️ [执行柜台: 任务管理]");
  console.log(">>> 第一步：校验飞书权限...");
  console.log(">>> 第二步：检查是否存在重复任务...");
  console.log(`>>> 第三步：进入 Slot Filling 填单流程，处理请求: "${args.raw_request}"`);
}

/** --- 业务柜台 B: 知识库检索 --- */
async function handleKnowledgeBase(args: any) {
  console.log("⚙️ [执行柜台: 知识库查询]");
  console.log(`>>> 第一步：调用向量数据库检索关键词: "${args.search_query}"`);
  console.log(">>> 第二步：合并结果并返回给用户...");
}

/** --- 业务柜台 C: 闲聊/兜底 --- */
async function handleGeneralChat(args: any, input: string) {
  console.log(`⚙️ [执行柜台: 通用对话] 建议语调: ${args.reply_tone || '默认'}`);
  const res = await modelManager.chat('deepseek', [{ role: 'user', content: input }]);
  console.log(`🤖 回复: ${res.choices[0].message.content}`);
}

/** --- 测试运行 --- */
async function runRouterTest() {
  console.log("🚀 开始 Router 分拣模式测试...\n");
  
  const testCases = [
    "帮我记一下明天下午三点跟李总开会",
    "公司关于年假的规定在哪里看？",
    "你好啊，今天忙吗？"
  ];

  for (const tc of testCases) {
    await mainDispatcher(tc);
  }

  console.log(`\n-----------------------------------------`);
  console.log("✨ 分拣测试执行完毕。");
}

runRouterTest().catch(console.error);
