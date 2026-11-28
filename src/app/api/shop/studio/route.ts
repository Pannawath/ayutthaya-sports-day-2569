import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getClientIp } from '@/lib/api-helpers';
import { checkRateLimit } from '@/lib/rate-limit';

const DEFAULT_JERSEY_GAS_URL =
  'https://script.google.com/macros/s/AKfycbwjttRpZPfi9ljLegbufqFciF04efGeI2vgm-oUwLHYxmpY_RHvS1X9U2oNh8O4IoHZ/exec';

function getJerseyGasUrl(): string {
  return process.env.JERSEY_GAS_API_URL || DEFAULT_JERSEY_GAS_URL;
}

const submitStudioSchema = z.object({
  email: z.string().trim().email('กรุณากรอกอีเมลให้ถูกต้อง'),
  classroom: z.string().trim().min(1, 'กรุณาเลือกห้องเรียน/สังกัด').max(80),
  studentNumber: z.string().trim().max(30).optional().default(''),
  name: z.string().trim().min(1, 'กรุณากรอกชื่อสกรีน').max(20),
  number: z.string().trim().regex(/^\d{1,2}$/, 'เบอร์สกรีนต้องเป็นตัวเลข 1-2 หลัก (00-99)'),
  size: z.enum(['SS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']),
  action: z.enum(['create', 'update']).default('create'),
  mode: z.enum(['new', 'edit']).default('new'),
  status: z.string().trim().max(40).optional(),
  slipImage: z.string().max(4_500_000).nullable().optional(),
  slipUrl: z.string().max(500).nullable().optional(),
  slipFileName: z.string().max(200).nullable().optional(),
  slipUploadedAt: z.number().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const limit = checkRateLimit(`shop-studio-get:${getClientIp(req)}`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `ส่งคำขอเร็วเกินไป กรุณารอ ${limit.retryAfterSec} วินาที` },
      { status: 429 }
    );
  }

  const email = (req.nextUrl.searchParams.get('email') || '').trim();
  const fileId = (req.nextUrl.searchParams.get('fileId') || '').trim();
  const gasUrl = getJerseyGasUrl();

  try {
    if (fileId) {
      const resp = await fetch(
        `${gasUrl}?action=getImage&fileId=${encodeURIComponent(fileId)}`,
        { cache: 'no-store', signal: AbortSignal.timeout(15000) }
      );
      const data = await resp.json();
      return NextResponse.json(data);
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ found: false, orders: [] });
    }

    const resp = await fetch(
      `${gasUrl}?action=search&email=${encodeURIComponent(email)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(15000) }
    );
    const text = await resp.text();
    try {
      const json = JSON.parse(text);
      return NextResponse.json(json);
    } catch {
      return NextResponse.json({ found: false, orders: [] });
    }
  } catch {
    return NextResponse.json({ found: false, orders: [] }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(`shop-studio-post:${getClientIp(req)}`, 15, 60_000);
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

  const parsed = submitStudioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'กรุณากรอกข้อมูลให้ครบถ้วน' },
      { status: 400 }
    );
  }

  const nowTs = Date.now();
  const payload = {
    email: parsed.data.email.toLowerCase(),
    productTitle: 'เสื้อแข่งขันทีมสีชมพู 2026',
    studentNumber: parsed.data.studentNumber || '',
    name: parsed.data.name.toUpperCase(),
    number: parsed.data.number,
    classroom: parsed.data.classroom,
    size: parsed.data.size,
    price: 285,
    timestamp: nowTs,
    status:
      parsed.data.mode === 'new'
        ? parsed.data.slipImage
          ? 'รอตรวจสอบสลิป'
          : 'รอชำระเงิน'
        : parsed.data.status || 'รอตรวจสอบสลิป',
    isNewOrder: parsed.data.mode === 'new',
    action: parsed.data.action,
    mode: parsed.data.mode,
    slipImage: parsed.data.slipImage || null,
    slipUrl: parsed.data.slipUrl || null,
    slipFileName: parsed.data.slipFileName || null,
    slipUploadedAt: parsed.data.slipUploadedAt || (parsed.data.slipImage ? nowTs : null),
  };

  try {
    const resp = await fetch(getJerseyGasUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000),
    });
    const text = await resp.text().catch(() => '');
    let gasResult: { status?: string; message?: string } | null = null;
    try {
      gasResult = text ? JSON.parse(text) : null;
    } catch {
      gasResult = null;
    }

    if (!resp.ok || gasResult?.status === 'error') {
      return NextResponse.json(
        {
          error:
            gasResult?.message ||
            'ไม่สามารถบันทึกข้อมูลเข้า Google Sheets ได้ กรุณาลองใหม่อีกครั้ง',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        parsed.data.mode === 'edit'
          ? 'บันทึกการแก้ไขข้อมูลสั่งจองเรียบร้อยแล้ว'
          : `สั่งจองเสื้อไซส์ ${payload.size} (${payload.name} #${payload.number}) เรียบร้อยแล้ว`,
    });
  } catch {
    return NextResponse.json(
      { error: 'ไม่สามารถเชื่อมต่อระบบบันทึกคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง' },
      { status: 502 }
    );
  }
}
