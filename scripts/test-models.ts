import { modelManager } from '../lib/models/manager';

// 注意：运行此脚本请使用 npx tsx --env-file=.env.local scripts/test-models.ts
// 或者确保环境变量已在当前 shell 中设置

async function testDeepSeek() {
  console.log('--- 测试 DeepSeek (非流式) ---');
  try {
    const result = await modelManager.chat('deepseek', [
      { role: 'user', content: '你好，请用一句话证明你工作正常。' },
    ]);
    console.log('响应:', result.choices[0].message.content);
    console.log('Token消耗:', result.usage);
  } catch (error: any) {
    console.error('DeepSeek 测试失败:', error.message);
  }
}

async function testDoubao() {
  console.log('\n--- 测试 豆包 (流式) ---');
  try {
    const stream = modelManager.streamChat('doubao', [
      { role: 'user', content: '你好，请用一句话证明你工作正常。' },
    ]);
    process.stdout.write('响应: ');
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        process.stdout.write(content);
      }
    }
    console.log('\n--- 豆包测试完成 ---');
  } catch (error: any) {
    console.error('豆包 测试失败:', error.message);
  }
}

async function runTests() {
  console.log('🚀 开始模型配置测试...\n');
  
  // 检查已配置的厂商
  const providers = ['deepseek', 'doubao'] as const;
  for (const p of providers) {
    const isConfigured = modelManager.isProviderConfigured(p);
    console.log(`厂商 ${p} 配置状态: ${isConfigured ? '✅ 已配置' : '❌ 未配置'}`);
  }
  console.log('');

  await testDeepSeek();
  await testDoubao();

  console.log('\n✨ 所有测试执行完毕。');
}

runTests();
