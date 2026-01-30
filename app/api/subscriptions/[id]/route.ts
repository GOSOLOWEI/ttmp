import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - 获取单个订阅
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subscriptionId = decodeURIComponent(id);

    const subscription = await prisma.subscription.findUnique({
      where: { subscriptionId },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: '订阅不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: subscription });
  } catch (error: any) {
    console.error('获取订阅失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - 更新订阅
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subscriptionId = decodeURIComponent(id);
    const body = await request.json();

    // 检查订阅是否存在
    const existing = await prisma.subscription.findUnique({
      where: { subscriptionId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '订阅不存在' },
        { status: 404 }
      );
    }

    // 更新订阅
    const updateData: any = {};
    if (body.subscriptionName !== undefined) updateData.subscriptionName = body.subscriptionName;
    if (body.level1Category !== undefined) updateData.level1Category = body.level1Category;
    if (body.level2Category !== undefined) updateData.level2Category = body.level2Category;
    if (body.billingCycle !== undefined) updateData.billingCycle = body.billingCycle;
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount);
    if (body.paymentChannel !== undefined) updateData.paymentChannel = body.paymentChannel;
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
    if (body.renewalRule !== undefined) updateData.renewalRule = body.renewalRule || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.usageLevel !== undefined) updateData.usageLevel = body.usageLevel;
    if (body.decision !== undefined) updateData.decision = body.decision;

    const subscription = await prisma.subscription.update({
      where: { subscriptionId },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: subscription });
  } catch (error: any) {
    console.error('更新订阅失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - 删除订阅
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subscriptionId = decodeURIComponent(id);

    // 检查订阅是否存在
    const existing = await prisma.subscription.findUnique({
      where: { subscriptionId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '订阅不存在' },
        { status: 404 }
      );
    }

    // 删除订阅
    await prisma.subscription.delete({
      where: { subscriptionId },
    });

    return NextResponse.json({ success: true, message: '订阅已删除' });
  } catch (error: any) {
    console.error('删除订阅失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
