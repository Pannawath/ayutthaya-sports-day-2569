import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getAuditLogsData } from '@/lib/data';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['ADMIN']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const rawLimit = Number(req.nextUrl.searchParams.get('limit') || '100');
  const limit = Number.isFinite(rawLimit) ? Math.min(300, Math.max(10, rawLimit)) : 100;
  const logs = await getAuditLogsData(limit);

  return NextResponse.json({ logs });
}
