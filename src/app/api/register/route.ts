import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getClientIp, requireSupabaseAdmin } from '@/lib/api-helpers';
import { requireRole } from '@/lib/auth';
import { getDepartmentsData, getPoliciesData, getStudentsData } from '@/lib/data';
import { signQrToken } from '@/lib/qr';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  normalizeAndValidateRegistration,
  registrationInputSchema,
} from '@/lib/validation';

export async function POST(req: NextRequest) {
  const auth = await requireRole(['ADMIN']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const ip = getClientIp(req);
  const limit = checkRateLimit(`register:${ip}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `ส่งคำขอบ่อยเกินไป กรุณารอ ${limit.retryAfterSec} วินาที แล้วลองใหม่` },
      { status: 429 }
    );
  }

  const dbCheck = requireSupabaseAdmin();
  if ('errorResponse' in dbCheck) {
    return dbCheck.errorResponse;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const parsed = registrationInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'กรุณากรอกข้อมูลให้ครบถ้วน' },
      { status: 400 }
    );
  }

  const [{ students }, departments, policies] = await Promise.all([
    getStudentsData(),
    getDepartmentsData(),
    getPoliciesData(),
  ]);

  const validated = normalizeAndValidateRegistration({
    input: parsed.data,
    existingStudents: students,
    departments,
    policies,
  });

  if (!validated.ok) {
    return NextResponse.json({ error: validated.message }, { status: validated.status });
  }

  const newId = randomUUID();
  const qrToken = signQrToken(newId);
  const nowIso = new Date().toISOString();

  const { error: insertErr } = await dbCheck.admin.from('students').insert({
    id: newId,
    student_code: validated.record.studentCode,
    full_name: validated.record.fullName,
    nickname: validated.record.nickname,
    grade: validated.record.grade,
    class_room: validated.record.classRoom,
    number_label: validated.record.numberLabel,
    role_category: validated.record.roleCategory,
    central_position: validated.record.centralPosition,
    department_id: validated.record.departmentId,
    position: validated.record.position,
    sport_type: validated.record.sportType,
    auto_assigned: validated.record.autoAssigned,
    qr_token: qrToken,
    registered_at: nowIso,
    updated_at: nowIso,
  });

  if (insertErr) {
    return NextResponse.json(
      { error: `บันทึกไม่สำเร็จ: ${insertErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      student: {
        id: newId,
        legacyId: null,
        ...validated.record,
        qrToken,
        registeredAt: nowIso,
      },
      message: `ลงทะเบียน ${validated.record.fullName} เรียบร้อยแล้ว`,
    },
    { status: 201 }
  );
}
