import { modelManager } from '../lib/models/manager';

// 注意：运行此脚本请使用 npx tsx --env-file=.env.local scripts/test-tools.ts

async function testToolCalling() {
  console.log('🚀 开始模型工具调用（Function Calling）测试...\n');

  // 定义一个模拟工具
  const tools = [
    {
      type: 'function',
      function: {
        name: 'get_current_weather',
        description: '获取指定城市的当前天气',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: '城市名称，例如：北京',
            },
            unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
          },
          required: ['location'],
        },
      },
    },
  ];

  const messages = [
    { role: 'user', content: '北京今天天气怎么样？' },
  ];

  // 尝试使用不同的厂商进行测试
  const provider = 'doubao'; // 或者 'doubao'

  console.log(`--- 测试厂商: ${provider} ---`);
  try {
    const result = await modelManager.chat(provider as any, messages as any, {
      tools,
      tool_choice: 'auto',
    });

    const choice = result.choices[0];
    const message = choice.message;

    console.log('模型响应角色:', message.role);
    
    if (message.tool_calls) {
      console.log('✅ 成功触发工具调用！');
      message.tool_calls.forEach((call, index) => {
        console.log(`工具调用 #${index + 1}:`);
        console.log(`  函数名: ${call.function.name}`);
        console.log(`  参数: ${call.function.arguments}`);
      });
      
      // 模拟工具执行结果回传
      console.log('\n--- 模拟工具执行并回传结果 ---');
      const toolResult = {
        role: 'tool',
        tool_call_id: message.tool_calls[0].id,
        name: 'get_current_weather',
        content: JSON.stringify({ temperature: '25', condition: '晴朗' }),
      };

      const finalMessages = [
        ...messages,
        message, // 模型刚才发出的请求
        toolResult, // 我们的工具执行结果
      ];

      const finalResponse = await modelManager.chat(provider as any, finalMessages as any);
      console.log('模型最终回复:', finalResponse.choices[0].message.content);
      
    } else {
      console.log('❌ 模型未触发工具调用，直接回复了内容：', message.content);
    }

  } catch (error: any) {
    console.error('工具调用测试失败:', error.message);
  }
}

testToolCalling();
