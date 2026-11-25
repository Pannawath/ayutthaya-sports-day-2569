import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSupabaseAdmin } from '@/lib/api-helpers';
import { requireRole, writeAuditLog } from '@/lib/auth';
import {
  getDepartmentsData,
  getPoliciesData,
  getStudentsData,
  getStudentsWithCheckIn,
} from '@/lib/data';
import { signQrToken } from '@/lib/qr';
import {
  normalizeAndValidateRegistration,
  registrationInputSchema,
} from '@/lib/validation';

const adminCreateStudentSchema = registrationInputSchema.extend({
  bypassRules: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sessionId = searchParams.get('sessionId') || undefined;
  const grade = searchParams.get('grade') || '';
  const room = searchParams.get('room') || '';
  const department = searchParams.get('department') || '';
  const search = (searchParams.get('search') || '').trim().toLowerCase();

  const data = await getStudentsWithCheckIn(sessionId);

  const filtered = data.students.filter((s) => {
    if (grade && grade !== 'ALL' && s.grade !== grade) return false;
    if (room && s.classRoom !== room) return false;
    if (department && s.departmentName !== department) return false;
    if (!search) return true;
    return (
      s.fullName.toLowerCase().includes(search) ||
      s.nickname.toLowerCase().includes(search) ||
      (s.studentCode || '').toLowerCase().includes(search) ||
      s.classRoom.toLowerCase().includes(search) ||
      s.numberLabel.toLowerCase().includes(search) ||
      (s.departmentName || '').toLowerCase().includes(search)
    );
  });

  return NextResponse.json({
    students: filtered,
    totalCount: data.students.length,
    sessions: data.sessions,
    activeSession: data.activeSession,
    departments: data.departments,
    policies: data.policies,
    sourceMode: data.sourceMode,
  });
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
    return NextResponse.json({ error: 'รูปแบบ JSON ไม่ถูกต้อง' }, { status: 400 });
  }

  const parsed = adminCreateStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'ข้อมูลไม่ครบถ้วน' },
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
    bypassM1Lock: parsed.data.bypassRules,
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
      { error: `เพิ่มนักเรียนไม่สำเร็จ: ${insertErr.message}` },
      { status: 500 }
    );
  }

  await writeAuditLog({
    actor: auth.profile,
    action: 'CREATE_STUDENT',
    entityType: 'students',
    entityId: newId,
    metadata: { fullName: validated.record.fullName, classRoom: validated.record.classRoom },
  });

  // Best-effort sync to legacy Google Apps Script (Google Sheets)
  const gasUrl = process.env.LEGACY_GAS_API_URL;
  if (gasUrl) {
    fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        id: newId,
        fullName: validated.record.fullName,
        nickname: validated.record.nickname,
        classRoom: validated.record.classRoom,
        numberLabel: validated.record.numberLabel,
        roleCategory: validated.record.roleCategory,
        centralPosition: validated.record.centralPosition || '',
        department: validated.record.departmentName || '',
        position: validated.record.position,
        sportType: validated.record.sportType || '',
        autoAssigned: validated.record.autoAssigned,
        timestamp: Date.now(),
      }),
    }).catch(() => null);
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
    },
    { status: 201 }
  );
}
