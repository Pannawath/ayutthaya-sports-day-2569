import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createLiveStoreClient, getLiveProfileById } from '@/lib/live-store';
import { SESSION_COOKIE_NAME, verifySessionCookie } from '@/lib/session-cookie';
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { UserProfile, UserRole } from '@/lib/types';

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured()) {
    try {
      const cookieStore = await cookies();
      const rawSession = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      const parsed = await verifySessionCookie(rawSession);
      if (!parsed) return null;
      return await getLiveProfileById(parsed.userId);
    } catch {
      return null;
    }
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Prefer admin client if configured so profile read cannot fail on strict RLS edge cases
  const reader = createSupabaseAdminClient() ?? supabase;
  const { data: profile } = await reader
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role === 'ADMIN' ? 'ADMIN' : 'STAFF',
    createdAt: profile.created_at,
  };
}

export async function requireRole(
  allowedRoles: UserRole[]
): Promise<{ profile: UserProfile } | { errorResponse: NextResponse }> {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return {
      errorResponse: NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ', code: 'UNAUTHORIZED' },
        { status: 401 }
      ),
    };
  }

  if (!allowedRoles.includes(profile.role)) {
    return {
      errorResponse: NextResponse.json(
        { error: 'บัญชีของคุณไม่มีสิทธิ์เข้าถึงส่วนนี้', code: 'FORBIDDEN' },
        { status: 403 }
      ),
    };
  }

  return { profile };
}

export async function writeAuditLog(params: {
  actor?: UserProfile | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const adminClient =
    createSupabaseAdminClient() ??
    (createLiveStoreClient() as unknown as ReturnType<typeof createSupabaseAdminClient>);
  if (!adminClient) return;

  try {
    await adminClient.from('audit_logs').insert({
      actor_id: params.actor?.id ?? null,
      actor_name: params.actor?.fullName ?? 'System',
      actor_role: params.actor?.role ?? 'PUBLIC',
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (err) {
    console.warn('[audit_logs] Failed to persist audit log:', err);
  }
}
