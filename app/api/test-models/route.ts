import { NextRequest, NextResponse } from 'next/server';
import { modelManager } from '@/lib/models/manager';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider') || 'deepseek';
  const prompt = searchParams.get('prompt') || '你好';

  try {
    console.log(`[TestRoute] 正在测试厂商: ${provider}, 提示词: ${prompt}`);
    
    if (!['deepseek', 'doubao'].includes(provider)) {
      return NextResponse.json({ error: '无效的厂商 ID' }, { status: 400 });
    }

    const result = await modelManager.chat(provider as any, [
      { role: 'user', content: prompt },
    ]);

    return NextResponse.json({
      success: true,
      provider,
      result
    });
  } catch (error: any) {
    console.error(`[TestRoute] 测试失败:`, error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
