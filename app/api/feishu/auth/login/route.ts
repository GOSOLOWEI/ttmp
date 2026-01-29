import { NextRequest, NextResponse } from 'next/server';
import { getFeishuUserByCode } from '@/lib/feishu/client';
import { signJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
    }

    const user = await getFeishuUserByCode(code);
    
    // 签发 JWT
    const token = await signJWT(user);

    // 设置 HttpOnly Cookie 持久化 Session
    const response = NextResponse.json(user);
    const cookieStore = await cookies();
    cookieStore.set('feishu_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7200, // 2 小时有效期，与飞书 Ticket 同步
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Feishu Auth Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
