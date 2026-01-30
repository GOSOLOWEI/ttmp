import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - 获取单个预付费用
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prepaidId = decodeURIComponent(id);

    const prepaidExpense = await prisma.prepaidExpense.findUnique({
      where: { prepaidId },
    });

    if (!prepaidExpense) {
      return NextResponse.json(
        { success: false, error: '预付费用不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: prepaidExpense });
  } catch (error: any) {
    console.error('获取预付费用失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - 更新预付费用
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prepaidId = decodeURIComponent(id);
    const body = await request.json();

    // 检查预付费用是否存在
    const existing = await prisma.prepaidExpense.findUnique({
      where: { prepaidId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '预付费用不存在' },
        { status: 404 }
      );
    }

    // 更新预付费用
    const updateData: any = {};
    if (body.expenseName !== undefined) updateData.expenseName = body.expenseName;
    if (body.level1Category !== undefined) updateData.level1Category = body.level1Category;
    if (body.level2Category !== undefined) updateData.level2Category = body.level2Category;
    if (body.totalAmount !== undefined) updateData.totalAmount = parseFloat(body.totalAmount);
    if (body.startMonth !== undefined) updateData.startMonth = body.startMonth;
    if (body.endMonth !== undefined) updateData.endMonth = body.endMonth;
    if (body.months !== undefined) updateData.months = parseInt(body.months);
    if (body.monthlyAmount !== undefined) updateData.monthlyAmount = parseFloat(body.monthlyAmount);
    if (body.paymentChannel !== undefined) updateData.paymentChannel = body.paymentChannel;
    if (body.accountName !== undefined) updateData.accountName = body.accountName || null;
    if (body.paymentTransactionId !== undefined) updateData.paymentTransactionId = body.paymentTransactionId || null;
    if (body.lastAmortizedMonth !== undefined) updateData.lastAmortizedMonth = body.lastAmortizedMonth || null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.remark !== undefined) updateData.remark = body.remark || null;

    const prepaidExpense = await prisma.prepaidExpense.update({
      where: { prepaidId },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: prepaidExpense });
  } catch (error: any) {
    console.error('更新预付费用失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - 删除预付费用
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prepaidId = decodeURIComponent(id);

    // 检查预付费用是否存在
    const existing = await prisma.prepaidExpense.findUnique({
      where: { prepaidId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '预付费用不存在' },
        { status: 404 }
      );
    }

    // 删除预付费用
    await prisma.prepaidExpense.delete({
      where: { prepaidId },
    });

    return NextResponse.json({ success: true, message: '预付费用已删除' });
  } catch (error: any) {
    console.error('删除预付费用失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
