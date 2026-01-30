import { NextRequest, NextResponse } from 'next/server';
import { accountingService } from '@/lib/services/accounting.service';
import { prisma } from '@/lib/prisma';

/**
 * 财务阶段分析任务
 * 建议运行时间：每月 1 号凌晨 4:00
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    // 默认分析上个月，如果是月初运行的话。如果是月中运行，默认分析本月。
    const defaultPeriod = new Date().toISOString().slice(0, 7);
    const period = req.nextUrl.searchParams.get('period') || defaultPeriod;

    // 如果指定了用户，只处理该用户
    if (userId) {
      const result = await accountingService.generateStageAnalysis({ userId, period });
      return NextResponse.json({ success: true, data: result });
    }

    // 默认处理所有有快照的活跃用户
    const activeUsers = await prisma.monthlyFinancialSnapshot.groupBy({
      by: ['userId'],
      where: {
        month: period
      }
    });

    console.log(`[Cron] 开始为 ${activeUsers.length} 个用户生成 ${period} 阶段分析...`);
    
    const results = [];
    for (const user of activeUsers) {
      if (user.userId) {
        try {
          await accountingService.generateStageAnalysis({ 
            userId: user.userId, 
            period 
          });
          results.push({ userId: user.userId, success: true });
        } catch (e: any) {
          console.error(`[Cron] 用户 ${user.userId} 阶段分析失败: ${e.message}`);
          results.push({ userId: user.userId, success: false, error: e.message });
        }
      }
    }

    return NextResponse.json({
      success: true,
      period,
      total: activeUsers.length,
      processed: results.filter(r => r.success).length,
      details: results
    });
  } catch (error: any) {
    console.error('❌ 阶段分析任务 API 报错:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
