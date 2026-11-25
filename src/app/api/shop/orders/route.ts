import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getClientIp, requireSupabaseAdmin } from '@/lib/api-helpers';
import { writeAuditLog } from '@/lib/auth';
import { ALL_ROOMS, NUMBERS } from '@/lib/constants';
import { createLiveStoreClient, type LiveJerseyOrderRow } from '@/lib/live-store';
import { checkRateLimit } from '@/lib/rate-limit';

const SIZES = ['SS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'] as const;

const createOrderSchema = z.object({
  studentCode: z.string().trim().max(20).optional().nullable(),
  fullName: z.string().trim().min(2, 'กรุณากรอกชื่อ-นามสกุล').max(120),
  email: z.string().trim().email('กรุณากรอกอีเมลที่ถูกต้อง'),
  classRoom: z.string().refine((v) => ALL_ROOMS.includes(v), 'กรุณาเลือกห้องเรียนที่ถูกต้อง'),
  numberLabel: z.string().refine((v) => NUMBERS.includes(v), 'กรุณาเลือกเลขที่ที่ถูกต้อง'),
  screenName: z
    .string()
    .trim()
    .min(1, 'กรุณากรอกชื่อสกรีนหลังเสื้อ')
    .max(20, 'ชื่อสกรีนไม่เกิน 20 ตัวอักษร'),
  screenNumber: z
    .string()
    .trim()
    .min(1, 'กรุณากรอกเบอร์สกรีน')
    .max(4, 'เบอร์สกรีนไม่เกิน 4 หลัก'),
  size: z.enum(SIZES),
  quantity: z.number().int().min(1).max(10).default(1),
});

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('query') || '').trim().toLowerCase();
  const db = createLiveStoreClient();
  const { data } = await db
    .from('jersey_orders')
    .select('*')
    .order('created_at', { ascending: false });

  const orders = ((data as LiveJerseyOrderRow[]) || []).filter((o) => {
    if (!q) return true;
    return (
      o.full_name.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      o.class_room.toLowerCase().includes(q) ||
      o.screen_name.toLowerCase().includes(q) ||
      (o.student_code || '').toLowerCase().includes(q)
    );
  });

  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(`shop:${getClientIp(req)}`, 25, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `ส่งคำขอเร็วเกินไป กรุณารอ ${limit.retryAfterSec} วินาที` },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'ข้อมูลสั่งจองไม่ครบถ้วน' },
      { status: 400 }
    );
  }

  const dbCheck = requireSupabaseAdmin();
  if ('errorResponse' in dbCheck) return dbCheck.errorResponse;

  const client = createLiveStoreClient();
  const order: LiveJerseyOrderRow = {
    id: randomUUID(),
    student_code: parsed.data.studentCode || null,
    full_name: parsed.data.fullName,
    email: parsed.data.email.toLowerCase(),
    class_room: parsed.data.classRoom,
    number_label: parsed.data.numberLabel,
    screen_name: parsed.data.screenName.toUpperCase(),
    screen_number: parsed.data.screenNumber,
    size: parsed.data.size,
    quantity: parsed.data.quantity,
    status: 'รอชำระเงิน',
    created_at: new Date().toISOString(),
  };

  const { error } = await client.from('jersey_orders').insert({ ...order } as Record<string, unknown>);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog({
    action: 'CREATE_JERSEY_ORDER',
    entityType: 'jersey_orders',
    entityId: order.id,
    metadata: {
      fullName: order.full_name,
      size: order.size,
      quantity: order.quantity,
    },
  });

  return NextResponse.json(
    {
      order,
      message: `บันทึกคำสั่งจองเสื้อไซส์ ${order.size} (${order.screen_name} #${order.screen_number}) เรียบร้อยแล้ว`,
    },
    { status: 201 }
  );
}
