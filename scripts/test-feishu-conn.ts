import { getFeishuClient } from '../lib/feishu/client';

/**
 * 飞书连通性测试脚本
 * 验证 FEISHU_APP_ID 和 FEISHU_APP_SECRET 是否正确配置
 */
async function testFeishuConnection() {
  console.log('🚀 开始飞书 API 连通性测试...');

  try {
    const client = getFeishuClient();
    
    console.log('⏳ 正在尝试获取 Tenant Access Token...');
    const token = await client.tokenManager.getTenantAccessToken();

    if (token) {
      console.log('✅ 连接成功！');
      console.log('📦 有效 Token 获取成功 (前15位):', token.substring(0, 15) + '...');
      
      // 进一步尝试获取机器人基本信息
      console.log('⏳ 正在获取机器人基本信息...');
      const botInfo: any = await client.request({
        method: 'GET',
        url: 'https://open.feishu.cn/open-apis/bot/v3/info'
      });
      
      if (botInfo.code === 0 && botInfo.data?.bot) {
        console.log('🤖 机器人名称:', botInfo.data.bot.app_name);
        console.log('🆔 机器人 ID:', botInfo.data.bot.app_id);
      } else {
        console.log('⚠️ 无法获取机器人详细信息。');
        console.log('API 返回状态码:', botInfo.code);
        console.log('API 返回消息:', botInfo.msg);
        console.log('💡 提示：这通常是因为应用权限中未启用“获取机器人信息”权限，但连接本身是成功的。');
      }
    }
  } catch (error: any) {
    console.error('❌ 飞书连接失败！');
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误信息:', error.response.data);
    } else {
      console.error('错误描述:', error.message);
    }
    
    console.log('\n💡 排查建议:');
    console.log('1. 请检查 .env.local 中的 FEISHU_APP_ID 和 FEISHU_APP_SECRET 是否准确。');
    console.log('2. 确保飞书开放平台后台的“版本管理与发布”已上线应用。');
    console.log('3. 检查当前网络环境是否能正常访问 open.feishu.cn。');
  }
}

testFeishuConnection();
