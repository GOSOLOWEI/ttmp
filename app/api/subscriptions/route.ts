import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - 获取所有订阅
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('isActive');
    const decision = searchParams.get('decision'); // keep, watch, cancel

    const where: any = {};
    
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }
    
    if (decision) {
      where.decision = decision;
    }

    const subscriptions = await prisma.subscription.findMany({
      where,
      orderBy: [
        { isActive: 'desc' },
        { startDate: 'desc' },
      ],
    });

    return NextResponse.json({ success: true, data: subscriptions });
  } catch (error: any) {
    console.error('获取订阅失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - 创建新订阅
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      subscriptionId,
      subscriptionName,
      level1Category,
      level2Category,
      billingCycle,
      amount,
      paymentChannel,
      startDate,
      renewalRule,
      isActive,
      usageLevel,
      decision,
    } = body;

    // 验证必填字段
    if (!subscriptionId || !subscriptionName || !level1Category || !level2Category || 
        !billingCycle || !amount || !paymentChannel || !startDate) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 检查订阅 ID 是否已存在
    const existing = await prisma.subscription.findUnique({
      where: { subscriptionId },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: '订阅 ID 已存在' },
        { status: 409 }
      );
    }

    const subscription = await prisma.subscription.create({
      data: {
        subscriptionId,
        subscriptionName,
        level1Category,
        level2Category,
        billingCycle,
        amount: parseFloat(amount),
        paymentChannel,
        startDate: new Date(startDate),
        renewalRule: renewalRule || null,
        isActive: isActive ?? true,
        usageLevel: usageLevel || 'medium',
        decision: decision || 'watch',
      },
    });

    return NextResponse.json({ success: true, data: subscription }, { status: 201 });
  } catch (error: any) {
    console.error('创建订阅失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
