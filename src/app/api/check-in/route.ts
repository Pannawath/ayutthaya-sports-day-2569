import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getClientIp, requireSupabaseAdmin } from '@/lib/api-helpers';
import { requireRole, writeAuditLog } from '@/lib/auth';
import { getActiveSession, getCheckInsData } from '@/lib/data';
import { verifyQrToken } from '@/lib/qr';
import { checkRateLimit } from '@/lib/rate-limit';

const checkInSchema = z.object({
  studentId: z.string().uuid().optional(),
  qrToken: z.string().trim().optional(),
  studentCode: z.string().trim().optional(),
  sessionId: z.string().uuid().optional(),
  method: z.enum(['QR', 'ID_SEARCH', 'MANUAL', 'BULK_PAPER']).default('MANUAL'),
  note: z.string().trim().max(250).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId') || undefined;
  const activeSession = await getActiveSession();
  const targetSessionId = sessionId || activeSession?.id;
  const checkIns = targetSessionId ? await getCheckInsData(targetSessionId) : [];

  return NextResponse.json({
    session: activeSession,
    checkIns,
  });
}

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(`checkin:${getClientIp(req)}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `ส่งคำขอเร็วเกินไป กรุณารอ ${limit.retryAfterSec} วินาที` },
      { status: 429 }
    );
  }

  const auth = await requireRole(['ADMIN', 'STAFF']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const dbCheck = requireSupabaseAdmin();
  if ('errorResponse' in dbCheck) return dbCheck.errorResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบ JSON ไม่ถูกต้อง' }, { status: 400 });
  }

  const parsed = checkInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'ข้อมูลเช็คชื่อไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  let resolvedStudentId = parsed.data.studentId;
  if (parsed.data.method === 'QR') {
    if (!parsed.data.qrToken) {
      return NextResponse.json({ error: 'ไม่พบรหัส QR Code' }, { status: 400 });
    }
    const verified = verifyQrToken(parsed.data.qrToken);
    if (!verified.valid || !verified.studentId) {
      return NextResponse.json(
        { error: verified.reason || 'QR Code ไม่ถูกต้อง' },
        { status: 400 }
      );
    }
    resolvedStudentId = verified.studentId;
  } else if (!resolvedStudentId && parsed.data.studentCode) {
    const { data: foundByCode } = await dbCheck.admin
      .from('students')
      .select('id')
      .eq('student_code', parsed.data.studentCode)
      .maybeSingle();
    if (!foundByCode) {
      return NextResponse.json(
        { error: `ไม่พบนักเรียนเลขประจำตัว ${parsed.data.studentCode}` },
        { status: 404 }
      );
    }
    resolvedStudentId = foundByCode.id;
  }

  if (!resolvedStudentId) {
    return NextResponse.json({ error: 'กรุณาระบุนักเรียนที่ต้องการเช็คชื่อ' }, { status: 400 });
  }

  const session = parsed.data.sessionId
    ? { id: parsed.data.sessionId }
    : await getActiveSession();

  if (!session) {
    return NextResponse.json(
      { error: 'ไม่พบรอบการเช็คชื่อ กรุณาให้ Admin สร้างรอบเช็คชื่อก่อน' },
      { status: 400 }
    );
  }

  const { data: student } = await dbCheck.admin
    .from('students')
    .select('id, full_name, nickname, class_room, number_label, position, departments(name)')
    .eq('id', resolvedStudentId)
    .maybeSingle();

  if (!student) {
    return NextResponse.json({ error: 'ไม่พบข้อมูลนักเรียนในฐานข้อมูล' }, { status: 404 });
  }

  // Prevent duplicate check-in in same session
  const { data: existingCheckIn } = await dbCheck.admin
    .from('check_ins')
    .select('id, checked_in_at, checked_in_by_name, method')
    .eq('session_id', session.id)
    .eq('student_id', student.id)
    .maybeSingle();

  if (existingCheckIn) {
    const timeText = new Date(existingCheckIn.checked_in_at).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return NextResponse.json(
      {
        error: `${student.full_name} เช็คชื่อในรอบนี้แล้วเมื่อ ${timeText} น. (โดย ${existingCheckIn.checked_in_by_name || 'เจ้าหน้าที่'})`,
        code: 'ALREADY_CHECKED_IN',
        existingCheckIn,
        student,
      },
      { status: 409 }
    );
  }

  const nowIso = new Date().toISOString();
  const { data: inserted, error: insErr } = await dbCheck.admin
    .from('check_ins')
    .insert({
      session_id: session.id,
      student_id: student.id,
      status: 'PRESENT',
      method: parsed.data.method,
      note: parsed.data.note || null,
      checked_in_by: auth.profile.id,
      checked_in_by_name: auth.profile.fullName,
      checked_in_at: nowIso,
    })
    .select('*')
    .single();

  if (insErr) {
    if (insErr.code === '23505') {
      return NextResponse.json(
        { error: `${student.full_name} เช็คชื่อซ้ำในรอบเดียวกัน`, code: 'ALREADY_CHECKED_IN' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: `เช็คชื่อไม่สำเร็จ: ${insErr.message}` }, { status: 500 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: 'CHECK_IN_STUDENT',
    entityType: 'check_ins',
    entityId: inserted.id,
    metadata: {
      studentId: student.id,
      fullName: student.full_name,
      classRoom: student.class_room,
      method: parsed.data.method,
    },
  });

  return NextResponse.json(
    {
      checkIn: inserted,
      student,
      message: `เช็คชื่อ ${student.full_name} (${student.class_room}) สำเร็จ`,
    },
    { status: 201 }
  );
}
