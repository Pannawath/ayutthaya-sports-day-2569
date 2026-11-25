import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole, writeAuditLog } from '@/lib/auth';
import { getDuplicateGroupsData, resolveDuplicateGroup } from '@/lib/live-store';

const resolveSchema = z.object({
  studentKey: z.string().min(3),
  keepRecord: z.object({
    id: z.string().min(1),
    fullName: z.string().min(1),
    nickname: z.string().default(''),
    classRoom: z.string().min(1),
    numberLabel: z.string().min(1),
    roleCategory: z.enum(['department', 'central']),
    centralPosition: z.string().nullable(),
    department: z.string().nullable(),
    position: z.string().min(1),
    sportType: z.string().nullable(),
    timestamp: z.number().default(0),
  }),
});

export async function GET() {
  const auth = await requireRole(['ADMIN']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const duplicateGroups = await getDuplicateGroupsData();
  return NextResponse.json({ duplicateGroups });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['ADMIN']);
  if ('errorResponse' in auth) return auth.errorResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  await resolveDuplicateGroup(parsed.data);
  await writeAuditLog({
    actor: auth.profile,
    action: 'RESOLVE_DUPLICATE_REGISTRATION',
    entityType: 'students',
    entityId: parsed.data.keepRecord.id,
    metadata: {
      studentKey: parsed.data.studentKey,
      keptDepartment: parsed.data.keepRecord.department,
      keptPosition: parsed.data.keepRecord.position,
    },
  });

  const duplicateGroups = await getDuplicateGroupsData();
  return NextResponse.json({ ok: true, duplicateGroups });
}
