import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseAdmin } from '@/lib/api-helpers';
import { requireRole, writeAuditLog } from '@/lib/auth';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const auth = await requireRole(['ADMIN']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const dbCheck = requireSupabaseAdmin();
  if ('errorResponse' in dbCheck) return dbCheck.errorResponse;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'รูปแบบไฟล์อัปโหลดไม่ถูกต้อง' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'ไม่พบไฟล์รูปภาพ' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'รองรับเฉพาะไฟล์ JPG, PNG, WebP หรือ GIF เท่านั้น' },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'ขนาดไฟล์ต้องไม่เกิน 5 MB' },
      { status: 400 }
    );
  }

  const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'png';
  const objectPath = `${Date.now()}_${randomUUID().slice(0, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await dbCheck.admin.storage
    .from('announcements')
    .upload(objectPath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) {
    return NextResponse.json(
      { error: `อัปโหลดรูปไม่สำเร็จ: ${uploadErr.message}` },
      { status: 500 }
    );
  }

  const { data: urlData } = dbCheck.admin.storage
    .from('announcements')
    .getPublicUrl(objectPath);

  await writeAuditLog({
    actor: auth.profile,
    action: 'UPLOAD_ANNOUNCEMENT_IMAGE',
    entityType: 'storage.announcements',
    entityId: objectPath,
  });

  return NextResponse.json({ imageUrl: urlData.publicUrl }, { status: 201 });
}
