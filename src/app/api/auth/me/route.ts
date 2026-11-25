import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export async function GET() {
  const supabaseMode = isSupabaseConfigured();
  const profile = await getCurrentUserProfile();
  return NextResponse.json({
    configured: true,
    mode: supabaseMode ? 'supabase' : 'live-store',
    profile,
  });
}
