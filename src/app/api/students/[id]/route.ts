import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSupabaseAdmin } from '@/lib/api-helpers';
import { requireRole, writeAuditLog } from '@/lib/auth';
import { ALL_ROOMS, NUMBERS, extractGradeFromRoom } from '@/lib/constants';
import { getDepartmentsData, getStudentsData } from '@/lib/data';

const patchStudentSchema = z.object({
  studentCode: z.string().trim().max(20).optional().nullable(),
  fullName: z.string().trim().min(2).max(120).optional(),
  nickname: z.string().trim().max(40).optional(),
  classRoom: z.string().refine((v) => ALL_ROOMS.includes(v)).optional(),
  numberLabel: z.string().refine((v) => NUMBERS.includes(v)).optional(),
  roleCategory: z.enum(['department', 'central']).optional(),
  centralPosition: z.string().trim().optional().nullable(),
  departmentName: z.string().trim().optional().nullable(),
  position: z.string().trim().min(1).optional(),
  sportType: z.string().trim().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { students } = await getStudentsData();
  const student = students.find((s) => s.id === id);
  if (!student) {
    return NextResponse.json({ error: 'ไม่พบข้อมูลนักเรียน' }, { status: 404 });
  }
  return NextResponse.json({ student });
}

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

  const parsed = patchStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'ข้อมูลแก้ไขไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  const { data: existing, error: fetchErr } = await dbCheck.admin
    .from('students')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'ไม่พบนักเรียนที่ต้องการแก้ไข' }, { status: 404 });
  }

  const patchData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.studentCode !== undefined) {
    patchData.student_code = parsed.data.studentCode ? parsed.data.studentCode : null;
  }
  if (parsed.data.fullName !== undefined) patchData.full_name = parsed.data.fullName;
  if (parsed.data.nickname !== undefined) patchData.nickname = parsed.data.nickname;
  if (parsed.data.classRoom !== undefined) {
    patchData.class_room = parsed.data.classRoom;
    patchData.grade = extractGradeFromRoom(parsed.data.classRoom);
  }
  if (parsed.data.numberLabel !== undefined) patchData.number_label = parsed.data.numberLabel;
  if (parsed.data.roleCategory !== undefined) patchData.role_category = parsed.data.roleCategory;
  if (parsed.data.centralPosition !== undefined) patchData.central_position = parsed.data.centralPosition;
  if (parsed.data.position !== undefined) patchData.position = parsed.data.position;
  if (parsed.data.sportType !== undefined) patchData.sport_type = parsed.data.sportType;

  if (parsed.data.departmentName !== undefined) {
    if (!parsed.data.departmentName) {
      patchData.department_id = null;
    } else {
      const depts = await getDepartmentsData();
      const matched = depts.find((d) => d.name === parsed.data.departmentName);
      if (!matched) {
        return NextResponse.json({ error: 'ไม่พบฝ่ายงานที่ระบุ' }, { status: 400 });
      }
      patchData.department_id = matched.id;
    }
  }

  const { error: updateErr } = await dbCheck.admin
    .from('students')
    .update(patchData)
    .eq('id', id);

  if (updateErr) {
    return NextResponse.json({ error: `อัปเดตไม่สำเร็จ: ${updateErr.message}` }, { status: 500 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: 'UPDATE_STUDENT',
    entityType: 'students',
    entityId: id,
    metadata: patchData,
  });

  return NextResponse.json({ success: true, message: 'อัปเดตข้อมูลนักเรียนเรียบร้อยแล้ว' });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['ADMIN']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const dbCheck = requireSupabaseAdmin();
  if ('errorResponse' in dbCheck) return dbCheck.errorResponse;

  const { id } = await context.params;
  const { data: target } = await dbCheck.admin
    .from('students')
    .select('id, full_name, class_room')
    .eq('id', id)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: 'ไม่พบรายการนักเรียน' }, { status: 404 });
  }

  const { error: delErr } = await dbCheck.admin.from('students').delete().eq('id', id);
  if (delErr) {
    return NextResponse.json({ error: `ลบไม่สำเร็จ: ${delErr.message}` }, { status: 500 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: 'DELETE_STUDENT',
    entityType: 'students',
    entityId: id,
    metadata: { fullName: target.full_name, classRoom: target.class_room },
  });

  return NextResponse.json({ success: true, message: `ลบข้อมูล ${target.full_name} แล้ว` });
}
