import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSupabaseAdmin } from '@/lib/api-helpers';
import { getCurrentUserProfile, requireRole, writeAuditLog } from '@/lib/auth';
import { getAnnouncementsData } from '@/lib/data';

const createAnnouncementSchema = z.object({
  title: z.string().trim().min(2, 'กรุณากรอกหัวข้อประกาศ').max(180),
  category: z.enum(['NEWS', 'SCHEDULE']).default('NEWS'),
  content: z.string().trim().min(2, 'กรุณากรอกรายละเอียดประกาศ').max(5000),
  imageUrl: z.string().trim().url('URL รูปภาพไม่ถูกต้อง').optional().nullable().or(z.literal('')),
  isPublished: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  const wantAll = req.nextUrl.searchParams.get('all') === '1';
  let includeDrafts = false;
  if (wantAll) {
    const profile = await getCurrentUserProfile();
    includeDrafts = profile?.role === 'ADMIN';
  }
  const announcements = await getAnnouncementsData(includeDrafts);
  return NextResponse.json({ announcements });
}

export async function POST(req: NextRequest) {
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

  const parsed = createAnnouncementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'ข้อมูลประกาศไม่ครบถ้วน' },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();
  const { data: created, error } = await dbCheck.admin
    .from('announcements')
    .insert({
      title: parsed.data.title,
      category: parsed.data.category,
      content: parsed.data.content,
      image_url: parsed.data.imageUrl ? parsed.data.imageUrl : null,
      is_published: parsed.data.isPublished,
      created_by: auth.profile.id,
      created_by_name: auth.profile.fullName,
      published_at: nowIso,
      updated_at: nowIso,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: 'CREATE_ANNOUNCEMENT',
    entityType: 'announcements',
    entityId: created.id,
    metadata: { title: created.title, category: created.category },
  });

  return NextResponse.json({ announcement: created }, { status: 201 });
}
