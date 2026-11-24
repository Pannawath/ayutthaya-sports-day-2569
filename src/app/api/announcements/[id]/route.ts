import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSupabaseAdmin } from '@/lib/api-helpers';
import { requireRole, writeAuditLog } from '@/lib/auth';

const patchAnnouncementSchema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  category: z.enum(['NEWS', 'SCHEDULE']).optional(),
  content: z.string().trim().min(2).max(5000).optional(),
  imageUrl: z.string().trim().url().optional().nullable().or(z.literal('')),
  isPublished: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['ADMIN']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const dbCheck = requireSupabaseAdmin();
  if ('errorResponse' in dbCheck) return dbCheck.errorResponse;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const parsed = patchAnnouncementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'ข้อมูลประกาศไม่ถูกต้อง' }, { status: 400 });
  }

  const patchData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.title !== undefined) patchData.title = parsed.data.title;
  if (parsed.data.category !== undefined) patchData.category = parsed.data.category;
  if (parsed.data.content !== undefined) patchData.content = parsed.data.content;
  if (parsed.data.imageUrl !== undefined) {
    patchData.image_url = parsed.data.imageUrl ? parsed.data.imageUrl : null;
  }
  if (parsed.data.isPublished !== undefined) patchData.is_published = parsed.data.isPublished;

  const { error } = await dbCheck.admin
    .from('announcements')
    .update(patchData)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: 'UPDATE_ANNOUNCEMENT',
    entityType: 'announcements',
    entityId: id,
    metadata: patchData,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['ADMIN']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const dbCheck = requireSupabaseAdmin();
  if ('errorResponse' in dbCheck) return dbCheck.errorResponse;

  const { id } = await context.params;
  const { error } = await dbCheck.admin.from('announcements').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: 'DELETE_ANNOUNCEMENT',
    entityType: 'announcements',
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
