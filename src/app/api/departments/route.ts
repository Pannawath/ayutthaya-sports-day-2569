import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSupabaseAdmin } from '@/lib/api-helpers';
import { requireRole, writeAuditLog } from '@/lib/auth';
import { getDepartmentsData } from '@/lib/data';

const patchDepartmentSchema = z.object({
  id: z.string().uuid(),
  maxCapacity: z.number().int().min(1).max(2000).nullable().optional(),
  isClosed: z.boolean().optional(),
  closedNote: z.string().trim().max(120).nullable().optional(),
  m1Only: z.boolean().optional(),
});

export async function GET() {
  const departments = await getDepartmentsData();
  return NextResponse.json({ departments });
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

  const parsed = patchDepartmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'ข้อมูลฝ่ายไม่ถูกต้อง' }, { status: 400 });
  }

  const patchData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.maxCapacity !== undefined) patchData.max_capacity = parsed.data.maxCapacity;
  if (parsed.data.isClosed !== undefined) patchData.is_closed = parsed.data.isClosed;
  if (parsed.data.closedNote !== undefined) patchData.closed_note = parsed.data.closedNote;
  if (parsed.data.m1Only !== undefined) patchData.m1_only = parsed.data.m1Only;

  const { error } = await dbCheck.admin
    .from('departments')
    .update(patchData)
    .eq('id', parsed.data.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: 'UPDATE_DEPARTMENT',
    entityType: 'departments',
    entityId: parsed.data.id,
    metadata: patchData,
  });

  return NextResponse.json({ success: true });
}
