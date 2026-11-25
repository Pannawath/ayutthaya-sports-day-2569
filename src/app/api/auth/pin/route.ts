import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole, writeAuditLog } from '@/lib/auth';
import { updateAdminPin, verifyAdminPin } from '@/lib/live-store';
import { SESSION_COOKIE_NAME, signSessionCookie } from '@/lib/session-cookie';

const verifyPinSchema = z.object({
  pin: z.string().trim().regex(/^\d{4}$/, 'กรุณากรอกรหัส PIN 4 หลัก'),
});

const updatePinSchema = z.object({
  newPin: z.string().trim().regex(/^\d{4}$/, 'รหัส PIN ใหม่ต้องเป็นตัวเลข 4 หลัก'),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const parsed = verifyPinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'รหัส PIN ไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  const profile = await verifyAdminPin(parsed.data.pin);
  if (!profile) {
    return NextResponse.json({ error: 'รหัส PIN ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' }, { status: 401 });
  }

  const exp = Date.now() + 24 * 60 * 60 * 1000;
  const token = await signSessionCookie({
    userId: profile.id,
    role: 'ADMIN',
    exp,
  });

  await writeAuditLog({
    actor: profile,
    action: 'ADMIN_PIN_LOGIN',
    entityType: 'profiles',
    entityId: profile.id,
  });

  const res = NextResponse.json({ ok: true, profile });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRole(['ADMIN']);
  if ('errorResponse' in auth) return auth.errorResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const parsed = updatePinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'รหัส PIN ใหม่ไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  const savedPin = await updateAdminPin(parsed.data.newPin);
  await writeAuditLog({
    actor: auth.profile,
    action: 'UPDATE_ADMIN_PIN',
    entityType: 'system_settings',
    entityId: 'admin_pin',
  });

  return NextResponse.json({ ok: true, pin: savedPin });
}
