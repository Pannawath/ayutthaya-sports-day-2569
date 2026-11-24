import { NextResponse } from 'next/server';
import { getCurrentUserProfile } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export async function GET() {
  const configured = isSupabaseConfigured();
  const profile = configured ? await getCurrentUserProfile() : null;
  return NextResponse.json({
    configured,
    profile,
  });
}
