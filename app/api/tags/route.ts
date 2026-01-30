import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - 获取所有标签
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tagType = searchParams.get('tagType'); // psychological, goal, risk
    const isActive = searchParams.get('isActive');

    const where: any = {};
    
    if (tagType) {
      where.tagType = tagType;
    }
    
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const tags = await prisma.tag.findMany({
      where,
      orderBy: [
        { tagType: 'asc' },
        { usageCount: 'desc' },
        { tagName: 'asc' },
      ],
    });

    return NextResponse.json({ success: true, data: tags });
  } catch (error: any) {
    console.error('获取标签失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - 创建新标签
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tagId, tagName, tagType, description, isActive } = body;

    // 验证必填字段
    if (!tagId || !tagName || !tagType) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段：tagId, tagName, tagType' },
        { status: 400 }
      );
    }

    // 检查标签 ID 是否已存在
    const existing = await prisma.tag.findUnique({
      where: { tagId },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: '标签 ID 已存在' },
        { status: 409 }
      );
    }

    const tag = await prisma.tag.create({
      data: {
        tagId,
        tagName,
        tagType,
        description: description || null,
        isActive: isActive ?? true,
        usageCount: 0,
      },
    });

    return NextResponse.json({ success: true, data: tag }, { status: 201 });
  } catch (error: any) {
    console.error('创建标签失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
