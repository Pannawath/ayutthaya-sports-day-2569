import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSupabaseAdmin } from '@/lib/api-helpers';
import { requireRole, writeAuditLog } from '@/lib/auth';

const patchCheckInSchema = z.object({
  status: z.enum(['PRESENT', 'ABSENT']),
  note: z.string().trim().max(250).optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['ADMIN']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const dbCheck = requireSupabaseAdmin();
  if ('errorResponse' in dbCheck) return dbCheck.errorResponse;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const parsed = patchCheckInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'สถานะไม่ถูกต้อง' }, { status: 400 });
  }

  const { error } = await dbCheck.admin
    .from('check_ins')
    .update({ status: parsed.data.status, note: parsed.data.note ?? null })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: 'UPDATE_CHECK_IN_STATUS',
    entityType: 'check_ins',
    entityId: id,
    metadata: parsed.data,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['ADMIN', 'STAFF']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const dbCheck = requireSupabaseAdmin();
  if ('errorResponse' in dbCheck) return dbCheck.errorResponse;

  const { id } = await context.params;
  const { error } = await dbCheck.admin.from('check_ins').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: 'DELETE_CHECK_IN',
    entityType: 'check_ins',
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
