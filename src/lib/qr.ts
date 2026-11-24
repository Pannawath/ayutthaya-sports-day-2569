import crypto from 'node:crypto';

function getQrSecret(): string {
  return process.env.QR_SIGNING_SECRET || 'ayutthaya-2569-dev-secret-change-in-env';
}

export function formatHexToUuid(hex32: string): string {
  const h = hex32.toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export function deterministicUuid(seed: string): string {
  const hash = crypto.createHash('sha256').update(seed).digest();
  hash[6] = (hash[6] & 0x0f) | 0x40;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  return formatHexToUuid(hash.subarray(0, 16).toString('hex'));
}

export function signQrToken(studentId: string): string {
  const cleanId = studentId.replace(/-/g, '').toLowerCase();
  const sig = crypto
    .createHmac('sha256', getQrSecret())
    .update(cleanId)
    .digest('hex')
    .slice(0, 20);
  return `ASTD2569.${cleanId}.${sig}`;
}

export interface QrVerifyResult {
  valid: boolean;
  studentId?: string;
  reason?: string;
}

export function verifyQrToken(rawToken: string): QrVerifyResult {
  const trimmed = String(rawToken || '').trim();
  const parts = trimmed.split('.');
  if (parts.length !== 3 || parts[0] !== 'ASTD2569') {
    return { valid: false, reason: 'รูปแบบ QR Code ไม่ถูกต้อง (ไม่ใช่บัตรของงานกีฬาสี 2569)' };
  }

  const cleanId = parts[1].toLowerCase();
  const providedSig = parts[2].toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(cleanId) || !/^[a-f0-9]{20}$/.test(providedSig)) {
    return { valid: false, reason: 'รหัส QR Code เสียหายหรือไม่ครบถ้วน' };
  }

  const expectedSig = crypto
    .createHmac('sha256', getQrSecret())
    .update(cleanId)
    .digest('hex')
    .slice(0, 20);

  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  const providedBuf = Buffer.from(providedSig, 'utf8');
  if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return { valid: false, reason: 'ลายเซ็น QR Code ไม่ถูกต้อง อาจมีการปลอมแปลง' };
  }

  return {
    valid: true,
    studentId: formatHexToUuid(cleanId),
  };
}
