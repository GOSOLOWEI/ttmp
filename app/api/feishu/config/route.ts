import { NextRequest, NextResponse } from 'next/server';
import { getJSSDKConfig } from '@/lib/feishu/client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    // 飞书 JSSDK 签名所需的 URL 必须是当前页面的完整 URL，排除 hash 部分
    const cleanUrl = url.split('#')[0];
    const config = await getJSSDKConfig(cleanUrl);
    
    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Feishu JSSDK Config Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
