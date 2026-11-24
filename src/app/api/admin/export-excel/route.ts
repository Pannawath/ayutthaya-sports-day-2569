import { NextResponse, type NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { requireRole, writeAuditLog } from '@/lib/auth';
import { getAttendanceStatistics, getStudentsWithCheckIn } from '@/lib/data';

function safeCell(val: unknown): string | number {
  if (typeof val === 'number') return val;
  const str = String(val ?? '');
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(['ADMIN']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const sessionId = req.nextUrl.searchParams.get('sessionId') || undefined;
  const [{ students, activeSession }, stats] = await Promise.all([
    getStudentsWithCheckIn(sessionId),
    getAttendanceStatistics({ sessionId, range: 'all' }),
  ]);

  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryRows = [
    ['รายงานสรุปงานกีฬาสี อยุธยาสีชมพู 2569', ''],
    ['รอบการเช็คชื่อ', safeCell(activeSession?.title || 'ภาพรวม')],
    ['วันที่ส่งออก', new Date().toLocaleString('th-TH')],
    ['จำนวนผู้ลงทะเบียนทั้งหมด (คน)', stats.totalStudents],
    ['เช็คชื่อเข้าร่วมแล้ว (คน)', stats.checkedInCount],
    ['ยังไม่เช็คชื่อ (คน)', stats.pendingCount],
    ['อัตราการเข้าร่วม (%)', stats.attendanceRate],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปภาพรวม');

  // Sheet 2: Students
  const studentRows = students.map((s, idx) => ({
    'ลำดับ': idx + 1,
    'เลขประจำตัว': safeCell(s.studentCode || '-'),
    'ชื่อ-นามสกุล': safeCell(s.fullName),
    'ชื่อเล่น': safeCell(s.nickname || '-'),
    'ระดับชั้น': safeCell(s.grade),
    'ห้อง': safeCell(s.classRoom),
    'เลขที่': safeCell(s.numberLabel),
    'ประเภท': s.roleCategory === 'central' ? 'บริหารคณะสี' : 'ฝ่ายงาน',
    'ฝ่ายงาน': safeCell(s.departmentName || '-'),
    'ตำแหน่ง': safeCell(s.position),
    'ชนิดกีฬา': safeCell(s.sportType || '-'),
    'สถานะเช็คชื่อ': s.checkedIn ? 'มาแล้ว' : 'ยังไม่มา',
    'เวลาเช็คชื่อ': s.checkIn
      ? new Date(s.checkIn.checkedInAt).toLocaleString('th-TH')
      : '-',
    'ผู้บันทึก': safeCell(s.checkIn?.checkedInByName || '-'),
    'วิธีการเช็ค': safeCell(s.checkIn?.method || '-'),
  }));
  const wsStudents = XLSX.utils.json_to_sheet(studentRows);
  XLSX.utils.book_append_sheet(wb, wsStudents, 'รายชื่อทั้งหมด');

  // Sheet 3: By Room
  const roomRows = stats.byRoom.map((r) => ({
    'ห้อง': safeCell(r.room),
    'ระดับชั้น': safeCell(r.grade),
    'ทั้งหมด': r.total,
    'มาแล้ว': r.present,
    'ยังไม่มา': r.pending,
    'เปอร์เซ็นต์': r.rate,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(roomRows), 'สรุปตามห้อง');

  // Sheet 4: By Department
  const deptRows = stats.byDepartment.map((d) => ({
    'ฝ่ายงาน': safeCell(d.name),
    'ทั้งหมด': d.total,
    'มาแล้ว': d.present,
    'ยังไม่มา': d.pending,
    'เปอร์เซ็นต์': d.rate,
    'โควตา': d.maxCapacity ?? 'ไม่จำกัด',
    'สถานะรับสมัคร': d.isClosed ? 'ปิดรับชั่วคราว' : 'เปิดรับ',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deptRows), 'สรุปตามฝ่าย');

  // Sheet 5: Check-ins History
  const checkInRows = students
    .filter((s) => s.checkIn)
    .sort(
      (a, b) =>
        new Date(b.checkIn!.checkedInAt).getTime() - new Date(a.checkIn!.checkedInAt).getTime()
    )
    .map((s) => ({
      'เวลาเช็คชื่อ': new Date(s.checkIn!.checkedInAt).toLocaleString('th-TH'),
      'เลขประจำตัว': safeCell(s.studentCode || '-'),
      'ชื่อ-นามสกุล': safeCell(s.fullName),
      'ห้อง': safeCell(s.classRoom),
      'เลขที่': safeCell(s.numberLabel),
      'ฝ่ายงาน': safeCell(s.departmentName || s.centralPosition || '-'),
      'วิธีเช็ค': safeCell(s.checkIn!.method),
      'ผู้เช็คชื่อ': safeCell(s.checkIn!.checkedInByName || '-'),
    }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(checkInRows), 'ประวัติเช็คชื่อ');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  await writeAuditLog({
    actor: auth.profile,
    action: 'EXPORT_EXCEL',
    entityType: 'students',
    metadata: { totalStudents: students.length, sessionId: activeSession?.id },
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="ayutthaya-sports-day-2569-${Date.now()}.xlsx"`,
    },
  });
}
