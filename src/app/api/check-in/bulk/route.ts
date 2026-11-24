import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSupabaseAdmin } from '@/lib/api-helpers';
import { requireRole, writeAuditLog } from '@/lib/auth';
import { getActiveSession } from '@/lib/data';

const bulkSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1, 'กรุณาเลือกนักเรียนอย่างน้อย 1 คน').max(300),
  sessionId: z.string().uuid().optional(),
  method: z.enum(['BULK_PAPER', 'MANUAL']).default('BULK_PAPER'),
  note: z.string().trim().max(250).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const auth = await requireRole(['ADMIN', 'STAFF']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const dbCheck = requireSupabaseAdmin();
  if ('errorResponse' in dbCheck) return dbCheck.errorResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'ข้อมูลไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  const session = parsed.data.sessionId
    ? { id: parsed.data.sessionId }
    : await getActiveSession();

  if (!session) {
    return NextResponse.json({ error: 'ไม่พบรอบเช็คชื่อที่เปิดใช้งาน' }, { status: 400 });
  }

  const uniqueIds = Array.from(new Set(parsed.data.studentIds));
  const { data: existing } = await dbCheck.admin
    .from('check_ins')
    .select('student_id')
    .eq('session_id', session.id)
    .in('student_id', uniqueIds);

  const alreadySet = new Set((existing || []).map((r) => r.student_id));
  const toInsertIds = uniqueIds.filter((id) => !alreadySet.has(id));

  if (toInsertIds.length === 0) {
    return NextResponse.json({
      insertedCount: 0,
      skippedDuplicateCount: uniqueIds.length,
      message: 'นักเรียนที่เลือกทั้งหมดถูกเช็คชื่อในรอบนี้ไปแล้ว',
    });
  }

  const nowIso = new Date().toISOString();
  const payload = toInsertIds.map((studentId) => ({
    session_id: session.id,
    student_id: studentId,
    status: 'PRESENT',
    method: parsed.data.method,
    note: parsed.data.note || 'บันทึกจากใบเช็คชื่อกระดาษ',
    checked_in_by: auth.profile.id,
    checked_in_by_name: auth.profile.fullName,
    checked_in_at: nowIso,
  }));

  const { error: insErr } = await dbCheck.admin.from('check_ins').insert(payload);
  if (insErr) {
    return NextResponse.json({ error: `บันทึกแบบกลุ่มไม่สำเร็จ: ${insErr.message}` }, { status: 500 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: 'BULK_CHECK_IN',
    entityType: 'check_ins',
    entityId: session.id,
    metadata: {
      insertedCount: toInsertIds.length,
      skippedDuplicateCount: uniqueIds.length - toInsertIds.length,
      method: parsed.data.method,
    },
  });

  return NextResponse.json(
    {
      insertedCount: toInsertIds.length,
      skippedDuplicateCount: uniqueIds.length - toInsertIds.length,
      message: `เช็คชื่อสำเร็จ ${toInsertIds.length} คน (ข้ามซ้ำ ${uniqueIds.length - toInsertIds.length} คน)`,
    },
    { status: 201 }
  );
}
