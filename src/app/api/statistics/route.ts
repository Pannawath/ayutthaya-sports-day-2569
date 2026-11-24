import { NextResponse, type NextRequest } from 'next/server';
import { getAttendanceStatistics, getSessionsData } from '@/lib/data';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId') || undefined;
  const rawRange = req.nextUrl.searchParams.get('range');
  const range =
    rawRange === 'today' || rawRange === '7d' || rawRange === 'all' ? rawRange : 'all';

  const [stats, sessions] = await Promise.all([
    getAttendanceStatistics({ sessionId, range }),
    getSessionsData(),
  ]);

  return NextResponse.json({
    ...stats,
    sessions,
    range,
  });
}
