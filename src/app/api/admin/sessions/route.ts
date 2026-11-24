import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSupabaseAdmin } from '@/lib/api-helpers';
import { requireRole, writeAuditLog } from '@/lib/auth';
import { getSessionsData } from '@/lib/data';

const createSessionSchema = z.object({
  title: z.string().trim().min(2, 'กรุณาระบุชื่อรอบเช็คชื่อ').max(150),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ YYYY-MM-DD ไม่ถูกต้อง'),
  isActive: z.boolean().optional().default(true),
});

const patchSessionSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
});

export async function GET() {
  const sessions = await getSessionsData();
  return NextResponse.json({ sessions });
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

  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'ข้อมูลรอบไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  if (parsed.data.isActive) {
    await dbCheck.admin.from('check_in_sessions').update({ is_active: false }).neq('id', '');
  }

  const { data: session, error } = await dbCheck.admin
    .from('check_in_sessions')
    .insert({
      title: parsed.data.title,
      event_date: parsed.data.eventDate,
      is_active: parsed.data.isActive,
      created_by: auth.profile.id,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: 'CREATE_SESSION',
    entityType: 'check_in_sessions',
    entityId: session.id,
    metadata: { title: session.title, eventDate: session.event_date },
  });

  return NextResponse.json({ session }, { status: 201 });
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

  const parsed = patchSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  if (parsed.data.isActive) {
    await dbCheck.admin
      .from('check_in_sessions')
      .update({ is_active: false })
      .neq('id', parsed.data.id);
  }

  const { error } = await dbCheck.admin
    .from('check_in_sessions')
    .update({ is_active: parsed.data.isActive })
    .eq('id', parsed.data.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: 'ACTIVATE_SESSION',
    entityType: 'check_in_sessions',
    entityId: parsed.data.id,
    metadata: { isActive: parsed.data.isActive },
  });

  return NextResponse.json({ success: true });
}
