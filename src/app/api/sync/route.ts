import { revalidatePath } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { getClientIp } from '@/lib/api-helpers';
import { syncLegacyStudentsIntoStore } from '@/lib/live-store';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(`sync:${getClientIp(req)}`, 3, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `รีเฟรชข้อมูลถี่เกินไป กรุณารอ ${limit.retryAfterSec} วินาที` },
      { status: 429 }
    );
  }

  const store = await syncLegacyStudentsIntoStore(true);
  revalidatePath('/');
  return NextResponse.json({
    ok: true,
    totalStudents: store.students.length,
    syncedAt: store.lastSyncedAt,
  });
}
