import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('feishu_session')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // 返回用户信息
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
