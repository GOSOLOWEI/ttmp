import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - 获取所有预付费用
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // in_progress, completed

    const where: any = {};
    
    if (status) {
      where.status = status;
    }

    const prepaidExpenses = await prisma.prepaidExpense.findMany({
      where,
      orderBy: [
        { startMonth: 'desc' },
        { prepaidId: 'desc' },
      ],
    });

    return NextResponse.json({ success: true, data: prepaidExpenses });
  } catch (error: any) {
    console.error('获取预付费用失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - 创建新预付费用
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prepaidId,
      expenseName,
      level1Category,
      level2Category,
      totalAmount,
      startMonth,
      endMonth,
      months,
      monthlyAmount,
      paymentChannel,
      accountName,
      paymentTransactionId,
      remark,
    } = body;

    // 验证必填字段
    if (!prepaidId || !expenseName || !level1Category || !level2Category || 
        !totalAmount || !startMonth || !endMonth || !months || !monthlyAmount || 
        !paymentChannel) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 检查预付费用 ID 是否已存在
    const existing = await prisma.prepaidExpense.findUnique({
      where: { prepaidId },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: '预付费用 ID 已存在' },
        { status: 409 }
      );
    }

    const prepaidExpense = await prisma.prepaidExpense.create({
      data: {
        prepaidId,
        expenseName,
        level1Category,
        level2Category,
        totalAmount: parseFloat(totalAmount),
        startMonth,
        endMonth,
        months: parseInt(months),
        monthlyAmount: parseFloat(monthlyAmount),
        paymentChannel,
        accountName: accountName || null,
        paymentTransactionId: paymentTransactionId || null,
        remark: remark || null,
        status: 'in_progress',
      },
    });

    return NextResponse.json({ success: true, data: prepaidExpense }, { status: 201 });
  } catch (error: any) {
    console.error('创建预付费用失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
