import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSupabaseAdmin } from '@/lib/api-helpers';
import { requireRole, writeAuditLog } from '@/lib/auth';
import { getPoliciesData } from '@/lib/data';

const patchPoliciesSchema = z.object({
  strictOnePerson: z.boolean().optional(),
  lockM1Registration: z.boolean().optional(),
  m1StandOnly: z.boolean().optional(),
});

export async function GET() {
  const policies = await getPoliciesData();
  return NextResponse.json({ policies });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRole(['ADMIN']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const dbCheck = requireSupabaseAdmin();
  if ('errorResponse' in dbCheck) return dbCheck.errorResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const parsed = patchPoliciesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'ค่านโยบายไม่ถูกต้อง' }, { status: 400 });
  }

  const current = await getPoliciesData();
  const nextPolicies = {
    strictOnePerson: parsed.data.strictOnePerson ?? current.strictOnePerson,
    lockM1Registration: parsed.data.lockM1Registration ?? current.lockM1Registration,
    m1StandOnly: parsed.data.m1StandOnly ?? current.m1StandOnly,
  };

  const { error } = await dbCheck.admin.from('system_settings').upsert({
    key: 'registration_policies',
    value: nextPolicies,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (parsed.data.m1StandOnly !== undefined) {
    await dbCheck.admin
      .from('departments')
      .update({ m1_only: parsed.data.m1StandOnly, updated_at: new Date().toISOString() })
      .eq('is_stand', true);
  }

  await writeAuditLog({
    actor: auth.profile,
    action: 'UPDATE_POLICIES',
    entityType: 'system_settings',
    entityId: 'registration_policies',
    metadata: nextPolicies,
  });

  return NextResponse.json({ policies: nextPolicies });
}
