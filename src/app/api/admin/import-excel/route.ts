import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { requireSupabaseAdmin } from '@/lib/api-helpers';
import { requireRole, writeAuditLog } from '@/lib/auth';
import { ALL_ROOMS, CENTRAL_POSITIONS, NUMBERS, extractGradeFromRoom } from '@/lib/constants';
import { getDepartmentsData, getStudentsData } from '@/lib/data';
import { signQrToken } from '@/lib/qr';

interface ParsedImportRow {
  rowNumber: number;
  studentCode: string | null;
  fullName: string;
  nickname: string;
  classRoom: string;
  numberLabel: string;
  roleCategory: 'department' | 'central';
  centralPosition: string | null;
  departmentName: string | null;
  position: string;
  sportType: string | null;
  status: 'READY' | 'DUPLICATE' | 'INVALID';
  reason: string;
}

function pickField(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['ADMIN']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const dbCheck = requireSupabaseAdmin();
  if ('errorResponse' in dbCheck) return dbCheck.errorResponse;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'รูปแบบไฟล์อัปโหลดไม่ถูกต้อง' }, { status: 400 });
  }

  const file = formData.get('file');
  const dryRun = formData.get('dryRun') !== 'false';
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'กรุณาแนบไฟล์ Excel (.xlsx / .xls / .csv)' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let rawRows: Record<string, unknown>[] = [];
  try {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) {
      return NextResponse.json({ error: 'ไม่พบชีตข้อมูลในไฟล์ Excel' }, { status: 400 });
    }
    rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[firstSheetName]);
  } catch {
    return NextResponse.json({ error: 'ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาตรวจสอบไฟล์' }, { status: 400 });
  }

  if (rawRows.length === 0) {
    return NextResponse.json({ error: 'ไม่พบแถวข้อมูลในไฟล์' }, { status: 400 });
  }

  const [{ students }, departments] = await Promise.all([
    getStudentsData(),
    getDepartmentsData(),
  ]);

  const deptByName = new Map(departments.map((d) => [d.name, d]));
  const existingKeys = new Set(students.map((s) => `${s.classRoom}|${s.numberLabel}`));
  const existingCodes = new Set(
    students.map((s) => s.studentCode).filter((c): c is string => Boolean(c))
  );

  const previewRows: ParsedImportRow[] = rawRows.slice(0, 500).map((raw, idx) => {
    const rowNumber = idx + 2;
    const studentCode = pickField(raw, ['เลขประจำตัว', 'studentCode', 'student_code']) || null;
    const fullName = pickField(raw, ['ชื่อ-นามสกุล', 'ชื่อสกุล', 'fullName', 'full_name']);
    const nickname = pickField(raw, ['ชื่อเล่น', 'nickname']);
    const classRoom = pickField(raw, ['ห้อง', 'ห้องเรียน', 'classRoom', 'class_room']);
    const numberLabel = pickField(raw, ['เลขที่', 'numberLabel', 'number_label']);
    const deptOrCentral = pickField(raw, ['ฝ่ายงาน', 'ฝ่าย', 'departmentName', 'department']);
    const rawPos = pickField(raw, ['ตำแหน่ง', 'position']) || 'สมาชิกฝ่าย';
    const sportType = pickField(raw, ['ชนิดกีฬา', 'กีฬา', 'sportType', 'sport_type']) || null;

    const isCentral = CENTRAL_POSITIONS.includes(rawPos);
    const roleCategory: 'department' | 'central' = isCentral ? 'central' : 'department';

    if (!fullName || !ALL_ROOMS.includes(classRoom) || !NUMBERS.includes(numberLabel)) {
      return {
        rowNumber,
        studentCode,
        fullName: fullName || '-',
        nickname,
        classRoom: classRoom || '-',
        numberLabel: numberLabel || '-',
        roleCategory,
        centralPosition: isCentral ? rawPos : null,
        departmentName: isCentral ? null : deptOrCentral || null,
        position: rawPos,
        sportType: sportType === '-' ? null : sportType,
        status: 'INVALID',
        reason: 'ชื่อ-นามสกุล, ห้องเรียน (21 ห้อง) หรือเลขที่ (1 ก-20 ข) ไม่ถูกต้อง',
      };
    }

    if (!isCentral && !deptByName.has(deptOrCentral)) {
      return {
        rowNumber,
        studentCode,
        fullName,
        nickname,
        classRoom,
        numberLabel,
        roleCategory,
        centralPosition: null,
        departmentName: deptOrCentral || null,
        position: rawPos,
        sportType: sportType === '-' ? null : sportType,
        status: 'INVALID',
        reason: `ไม่พบฝ่าย "${deptOrCentral}" ในระบบ`,
      };
    }

    const identityKey = `${classRoom}|${numberLabel}`;
    if (existingKeys.has(identityKey) || (studentCode && existingCodes.has(studentCode))) {
      return {
        rowNumber,
        studentCode,
        fullName,
        nickname,
        classRoom,
        numberLabel,
        roleCategory,
        centralPosition: isCentral ? rawPos : null,
        departmentName: isCentral ? null : deptOrCentral,
        position: rawPos,
        sportType: sportType === '-' ? null : sportType,
        status: 'DUPLICATE',
        reason: 'มีห้องและเลขที่หรือเลขประจำตัวนี้อยู่ในฐานข้อมูลแล้ว',
      };
    }

    existingKeys.add(identityKey);
    if (studentCode) existingCodes.add(studentCode);

    return {
      rowNumber,
      studentCode,
      fullName,
      nickname,
      classRoom,
      numberLabel,
      roleCategory,
      centralPosition: isCentral ? rawPos : null,
      departmentName: isCentral ? null : deptOrCentral,
      position: rawPos,
      sportType: sportType === '-' ? null : sportType,
      status: 'READY',
      reason: 'พร้อมนำเข้า',
    };
  });

  const readyRows = previewRows.filter((r) => r.status === 'READY');
  const summary = {
    totalRows: previewRows.length,
    readyCount: readyRows.length,
    duplicateCount: previewRows.filter((r) => r.status === 'DUPLICATE').length,
    invalidCount: previewRows.filter((r) => r.status === 'INVALID').length,
  };

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      summary,
      rows: previewRows,
    });
  }

  if (readyRows.length === 0) {
    return NextResponse.json(
      { error: 'ไม่มีแถวข้อมูลที่พร้อมนำเข้า', summary, rows: previewRows },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();
  const payload = readyRows.map((row) => {
    const newId = randomUUID();
    const dept = row.departmentName ? deptByName.get(row.departmentName) : undefined;
    return {
      id: newId,
      student_code: row.studentCode,
      full_name: row.fullName,
      nickname: row.nickname,
      grade: extractGradeFromRoom(row.classRoom),
      class_room: row.classRoom,
      number_label: row.numberLabel,
      role_category: row.roleCategory,
      central_position: row.centralPosition,
      department_id: dept?.id ?? null,
      position: row.position,
      sport_type: row.sportType,
      auto_assigned: false,
      qr_token: signQrToken(newId),
      registered_at: nowIso,
      updated_at: nowIso,
    };
  });

  const { error: insErr } = await dbCheck.admin.from('students').insert(payload);
  if (insErr) {
    return NextResponse.json({ error: `นำเข้าไม่สำเร็จ: ${insErr.message}` }, { status: 500 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: 'IMPORT_EXCEL',
    entityType: 'students',
    metadata: summary,
  });

  return NextResponse.json({
    dryRun: false,
    summary,
    insertedCount: payload.length,
    message: `นำเข้านักเรียนสำเร็จ ${payload.length} คน`,
  });
}
