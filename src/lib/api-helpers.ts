import { NextResponse, type NextRequest } from 'next/server';
import { createLiveStoreClient } from '@/lib/live-store';
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'local';
}

export function requireSupabaseAdmin():
  | { admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>> }
  | { errorResponse: NextResponse } {
  if (!isSupabaseAdminConfigured()) {
    return {
      admin: createLiveStoreClient() as unknown as NonNullable<
        ReturnType<typeof createSupabaseAdminClient>
      >,
    };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return {
      errorResponse: NextResponse.json(
        { error: 'ไม่สามารถสร้างการเชื่อมต่อฐานข้อมูลได้', code: 'SUPABASE_INIT_ERROR' },
        { status: 500 }
      ),
    };
  }

  return { admin };
}
