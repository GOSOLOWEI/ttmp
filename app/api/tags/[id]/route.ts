import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - 获取单个标签
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tagId = decodeURIComponent(id);

    const tag = await prisma.tag.findUnique({
      where: { tagId },
    });

    if (!tag) {
      return NextResponse.json(
        { success: false, error: '标签不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: tag });
  } catch (error: any) {
    console.error('获取标签失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - 更新标签
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tagId = decodeURIComponent(id);
    const body = await request.json();

    // 检查标签是否存在
    const existing = await prisma.tag.findUnique({
      where: { tagId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '标签不存在' },
        { status: 404 }
      );
    }

    // 更新标签
    const updateData: any = {};
    if (body.tagName !== undefined) updateData.tagName = body.tagName;
    if (body.tagType !== undefined) updateData.tagType = body.tagType;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const tag = await prisma.tag.update({
      where: { tagId },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: tag });
  } catch (error: any) {
    console.error('更新标签失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - 删除标签
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tagId = decodeURIComponent(id);

    // 检查标签是否存在
    const existing = await prisma.tag.findUnique({
      where: { tagId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '标签不存在' },
        { status: 404 }
      );
    }

    // 检查是否有交易使用此标签（通过使用次数判断）
    if (existing.usageCount > 0) {
      // 如果有交易使用，只标记为不活跃，不删除
      await prisma.tag.update({
        where: { tagId },
        data: {
          isActive: false,
        },
      });
      return NextResponse.json({
        success: true,
        message: '标签已标记为不活跃（有交易记录使用此标签）',
      });
    }

    // 如果没有交易使用，可以删除
    await prisma.tag.delete({
      where: { tagId },
    });

    return NextResponse.json({ success: true, message: '标签已删除' });
  } catch (error: any) {
    console.error('删除标签失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
