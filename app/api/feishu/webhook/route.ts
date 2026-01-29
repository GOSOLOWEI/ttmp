import { NextRequest } from 'next/server';
import { createEventDispatcher, handleNextApiRequest } from '@/lib/feishu/events';

// 实例化事件分发器
// 此时会根据环境变量 FEISHU_ENCRYPT_KEY 和 FEISHU_VERIFICATION_TOKEN 自动配置
const dispatcher = createEventDispatcher();

/**
 * 飞书事件 Webhook 接收入口
 * 飞书后台配置的“请求地址”应指向此接口 (例如: https://your-domain.com/api/feishu/webhook)
 */
export async function POST(req: NextRequest) {
  try {
    console.log('📬 收到飞书 Webhook 推送');
    return await handleNextApiRequest(dispatcher, req);
  } catch (error: any) {
    console.error('❌ 飞书 Webhook 处理失败:', error);
    // 即使失败也返回 200，防止飞书因重试导致负载过高，具体错误通过日志排查
    return new Response(JSON.stringify({ 
      code: 1, 
      msg: 'Internal Server Error',
      error: error.message 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
