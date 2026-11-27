import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getClientIp } from '@/lib/api-helpers';
import { writeAuditLog } from '@/lib/auth';
import { authenticateLiveUser } from '@/lib/live-store';
import { checkRateLimit } from '@/lib/rate-limit';
import { SESSION_COOKIE_NAME, signSessionCookie } from '@/lib/session-cookie';

const loginSchema = z.object({
  email: z.string().trim().email('กรุณากรอกอีเมลที่ถูกต้อง'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(`login:${getClientIp(req)}`, 10, 300_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `ส่งคำขอเข้าสู่ระบบถี่เกินไป กรุณารอ ${limit.retryAfterSec} วินาที` },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'กรุณากรอกอีเมลและรหัสผ่าน' },
      { status: 400 }
    );
  }

  const profile = await authenticateLiveUser(parsed.data.email, parsed.data.password);
  if (!profile) {
    return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
  }

  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const token = await signSessionCookie({
    userId: profile.id,
    role: profile.role,
    exp,
  });

  await writeAuditLog({
    actor: profile,
    action: 'USER_LOGIN',
    entityType: 'profiles',
    entityId: profile.id,
    metadata: { email: profile.email, mode: 'live-store' },
  });

  const res = NextResponse.json({ profile });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
