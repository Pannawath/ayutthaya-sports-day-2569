import { NextResponse, type NextRequest } from 'next/server';
import { getStudentsWithCheckIn } from '@/lib/data';
import { verifyQrToken } from '@/lib/qr';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const sessionId = req.nextUrl.searchParams.get('sessionId') || undefined;

  const verification = verifyQrToken(token);
  if (!verification.valid || !verification.studentId) {
    return NextResponse.json(
      { valid: false, error: verification.reason || 'QR Code ไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  const data = await getStudentsWithCheckIn(sessionId);
  const student = data.students.find((s) => s.id === verification.studentId);

  if (!student) {
    return NextResponse.json(
      { valid: false, error: 'QR Code ถูกต้อง แต่ไม่พบรายชื่อนักเรียนในระบบปัจจุบัน' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    valid: true,
    student,
    activeSession: data.activeSession,
  });
}
