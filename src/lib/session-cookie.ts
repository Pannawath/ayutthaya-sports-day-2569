export const SESSION_COOKIE_NAME = 'ayutthaya_session';

export interface SessionCookiePayload {
  userId: string;
  role: 'ADMIN' | 'STAFF';
  exp: number;
}

function getSecret(): string {
  return (
    process.env.QR_SIGNING_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'ayutthaya-2569-dev-secret-change-in-env'
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array | null {
  try {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function importHmacKey() {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signSessionCookie(payload: SessionCookiePayload): Promise<string> {
  const enc = new TextEncoder();
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const key = await importHmacKey();
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  const sig = toBase64Url(new Uint8Array(sigBuf));
  return `${body}.${sig}`;
}

export async function verifySessionCookie(
  rawValue: string | undefined | null
): Promise<SessionCookiePayload | null> {
  if (!rawValue) return null;
  const parts = rawValue.split('.');
  if (parts.length !== 2) return null;
  const [body, sigStr] = parts;
  const sigBytes = fromBase64Url(sigStr);
  if (!sigBytes) return null;

  try {
    const enc = new TextEncoder();
    const key = await importHmacKey();
    const sigBuffer = new Uint8Array(sigBytes).buffer;
    const valid = await crypto.subtle.verify('HMAC', key, sigBuffer, enc.encode(body));
    if (!valid) return null;

    const bodyBytes = fromBase64Url(body);
    if (!bodyBytes) return null;
    const decoded = JSON.parse(new TextDecoder().decode(bodyBytes)) as Partial<SessionCookiePayload>;
    if (
      !decoded.userId ||
      (decoded.role !== 'ADMIN' && decoded.role !== 'STAFF') ||
      typeof decoded.exp !== 'number' ||
      decoded.exp < Date.now()
    ) {
      return null;
    }

    return {
      userId: decoded.userId,
      role: decoded.role,
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}
