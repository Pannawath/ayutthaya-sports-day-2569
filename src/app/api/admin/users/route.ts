import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSupabaseAdmin } from '@/lib/api-helpers';
import { requireRole, writeAuditLog } from '@/lib/auth';
import { getUsersProfilesData } from '@/lib/data';

const createUserSchema = z.object({
  email: z.string().trim().email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  fullName: z.string().trim().min(2, 'กรุณากรอกชื่อ-นามสกุล'),
  role: z.enum(['ADMIN', 'STAFF']).default('STAFF'),
});

const patchUserSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['ADMIN', 'STAFF']),
  fullName: z.string().trim().min(2).optional(),
});

export async function GET() {
  const auth = await requireRole(['ADMIN']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const users = await getUsersProfilesData();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['ADMIN']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const dbCheck = requireSupabaseAdmin();
  if ('errorResponse' in dbCheck) return dbCheck.errorResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'ข้อมูลผู้ใช้ไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  const { data: createdAuth, error: authErr } = await dbCheck.admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName, role: parsed.data.role },
  });

  if (authErr || !createdAuth.user) {
    return NextResponse.json(
      { error: authErr?.message || 'สร้างบัญชีผู้ใช้ไม่สำเร็จ' },
      { status: 400 }
    );
  }

  const { error: profileErr } = await dbCheck.admin.from('profiles').upsert({
    id: createdAuth.user.id,
    email: parsed.data.email,
    full_name: parsed.data.fullName,
    role: parsed.data.role,
  });

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: 'CREATE_USER',
    entityType: 'profiles',
    entityId: createdAuth.user.id,
    metadata: { email: parsed.data.email, role: parsed.data.role },
  });

  return NextResponse.json(
    {
      user: {
        id: createdAuth.user.id,
        email: parsed.data.email,
        fullName: parsed.data.fullName,
        role: parsed.data.role,
      },
    },
    { status: 201 }
  );
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRole(['ADMIN']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const dbCheck = requireSupabaseAdmin();
  if ('errorResponse' in dbCheck) return dbCheck.errorResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const parsed = patchUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const patchData: Record<string, unknown> = {
    role: parsed.data.role,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.fullName) patchData.full_name = parsed.data.fullName;

  const { error } = await dbCheck.admin
    .from('profiles')
    .update(patchData)
    .eq('id', parsed.data.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: 'UPDATE_USER_ROLE',
    entityType: 'profiles',
    entityId: parsed.data.id,
    metadata: patchData,
  });

  return NextResponse.json({ success: true });
}
