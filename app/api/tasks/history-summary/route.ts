import { NextRequest, NextResponse } from 'next/server';
import { accountingService } from '@/lib/services/accounting.service';
import { prisma } from '@/lib/prisma';

/**
 * 历史消费摘要生成任务
 * 建议运行时间：凌晨 3:00
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    const window = (req.nextUrl.searchParams.get('window') as any) || 'last_30_days';

    // 如果指定了用户，只处理该用户
    if (userId) {
      const result = await accountingService.generateHistorySummary({ userId, window });
      return NextResponse.json({ success: true, data: result });
    }

    // 默认处理所有有流水的活跃用户 (批量处理)
    const activeUsers = await prisma.transaction.groupBy({
      by: ['userId'],
      where: {
        userId: { not: null }
      }
    });

    console.log(`[Cron] 开始为 ${activeUsers.length} 个用户生成历史摘要...`);
    
    const results = [];
    for (const user of activeUsers) {
      if (user.userId) {
        const res = await accountingService.generateHistorySummary({ 
          userId: user.userId, 
          window 
        });
        results.push({ userId: user.userId, success: true });
      }
    }

    return NextResponse.json({
      success: true,
      total: activeUsers.length,
      processed: results.length
    });
  } catch (error: any) {
    console.error('❌ 历史摘要任务 API 报错:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
