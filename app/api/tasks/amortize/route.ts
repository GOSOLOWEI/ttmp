import { NextRequest, NextResponse } from 'next/server';
import { accountingService } from '@/lib/services/accounting.service';

/**
 * 触发预付分摊的 API 入口
 * 建议在生产环境增加 API_KEY 校验
 */
export async function POST(req: NextRequest) {
  try {
    // 1. 获取目标月份 (可选)
    const { month } = await req.json().catch(() => ({}));
    
    // 2. 执行分摊
    const result = await accountingService.runAmortization(month);
    
    return NextResponse.json({
      success: true,
      message: `分摊任务执行完成 (${result.month})`,
      data: result
    });
  } catch (error: any) {
    console.error('❌ 分摊任务 API 报错:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// 支持 GET 请求方便手动测试
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month') || undefined;
  const result = await accountingService.runAmortization(month);
  return NextResponse.json({
    success: true,
    data: result
  });
}
