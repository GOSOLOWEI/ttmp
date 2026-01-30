import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - 获取单个分类
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ level1: string; level2: string }> }
) {
  try {
    const { level1, level2 } = await params;
    const level1Category = decodeURIComponent(level1);
    const level2Category = decodeURIComponent(level2);

    const category = await prisma.category.findUnique({
      where: {
        level1Category_level2Category: {
          level1Category,
          level2Category,
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: '分类不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error: any) {
    console.error('获取分类失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - 更新分类
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ level1: string; level2: string }> }
) {
  try {
    const { level1, level2 } = await params;
    const level1Category = decodeURIComponent(level1);
    const level2Category = decodeURIComponent(level2);
    const body = await request.json();

    const { defaultType, defaultIsAnalysis, remark, isActive } = body;

    // 检查分类是否存在
    const existing = await prisma.category.findUnique({
      where: {
        level1Category_level2Category: {
          level1Category,
          level2Category,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '分类不存在' },
        { status: 404 }
      );
    }

    // 更新分类
    const updateData: any = {};
    if (defaultType !== undefined) updateData.defaultType = defaultType;
    if (defaultIsAnalysis !== undefined) updateData.defaultIsAnalysis = defaultIsAnalysis;
    if (remark !== undefined) updateData.remark = remark;
    if (isActive !== undefined) updateData.isActive = isActive;

    const category = await prisma.category.update({
      where: {
        level1Category_level2Category: {
          level1Category,
          level2Category,
        },
      },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: category });
  } catch (error: any) {
    console.error('更新分类失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - 删除分类
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ level1: string; level2: string }> }
) {
  try {
    const { level1, level2 } = await params;
    const level1Category = decodeURIComponent(level1);
    const level2Category = decodeURIComponent(level2);

    // 检查分类是否存在
    const existing = await prisma.category.findUnique({
      where: {
        level1Category_level2Category: {
          level1Category,
          level2Category,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '分类不存在' },
        { status: 404 }
      );
    }

    // 检查是否有交易使用此分类
    const transactionCount = await prisma.transaction.count({
      where: {
        level1Category,
        level2Category,
      },
    });

    if (transactionCount > 0) {
      // 如果有交易使用，只标记为不活跃，不删除
      await prisma.category.update({
        where: {
          level1Category_level2Category: {
            level1Category,
            level2Category,
          },
        },
        data: {
          isActive: false,
        },
      });
      return NextResponse.json({
        success: true,
        message: '分类已标记为不活跃（有交易记录使用此分类）',
      });
    }

    // 如果没有交易使用，可以删除
    await prisma.category.delete({
      where: {
        level1Category_level2Category: {
          level1Category,
          level2Category,
        },
      },
    });

    return NextResponse.json({ success: true, message: '分类已删除' });
  } catch (error: any) {
    console.error('删除分类失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
