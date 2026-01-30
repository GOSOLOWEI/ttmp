import { NextRequest, NextResponse } from 'next/server';
import { accountingService } from '@/lib/services/accounting.service';
import { sendMessage } from '@/lib/feishu/messages';

/**
 * 订阅处理定时任务
 * 职责：
 * 1. 自动生成当天的月付订阅扣费流水
 * 2. 扫描并推送即将到来的扣费提醒
 */
export async function GET(req: NextRequest) {
  try {
    // 1. 处理扣费流水生成
    const billResult = await accountingService.processSubscriptionBills();

    // 2. 处理扣费预警提醒
    const reminders = await accountingService.checkSubscriptionReminders();
    for (const reminder of reminders) {
      if (reminder.userId) {
        await sendMessage(reminder.userId, reminder.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: '订阅任务处理完成',
      data: {
        billing: billResult,
        remindersSent: reminders.length
      }
    });
  } catch (error: any) {
    console.error('❌ 订阅任务 API 报错:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
