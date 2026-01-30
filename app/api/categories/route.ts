import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - 获取所有分类
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // income, expense, asset_change
    const isActive = searchParams.get('isActive');

    const where: any = {};
    
    if (type) {
      where.defaultType = type;
    }
    
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: [
        { level1Category: 'asc' },
        { level2Category: 'asc' },
      ],
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    console.error('获取分类失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - 创建新分类
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level1Category, level2Category, defaultType, defaultIsAnalysis, remark, isActive } = body;

    // 验证必填字段
    if (!level1Category || !level2Category || !defaultType) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段：level1Category, level2Category, defaultType' },
        { status: 400 }
      );
    }

    // 检查分类是否已存在
    const existing = await prisma.category.findUnique({
      where: {
        level1Category_level2Category: {
          level1Category,
          level2Category,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: '分类已存在' },
        { status: 409 }
      );
    }

    const category = await prisma.category.create({
      data: {
        level1Category,
        level2Category,
        defaultType,
        defaultIsAnalysis: defaultIsAnalysis ?? true,
        remark: remark || null,
        isActive: isActive ?? true,
        usageCount: 0,
      },
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error: any) {
    console.error('创建分类失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
