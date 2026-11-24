import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let val = line.slice(eqIndex + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(path.resolve(process.cwd(), '.env.local'));
loadEnvFile(path.resolve(process.cwd(), '.env'));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const email = process.argv[2];
const password = process.argv[3];
const fullName = process.argv[4] || 'ผู้ดูแลระบบหลัก (Admin)';
const role = (process.argv[5] || 'ADMIN').toUpperCase() === 'STAFF' ? 'STAFF' : 'ADMIN';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[create:admin] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

if (!email || !password || password.length < 6) {
  console.error('Usage: npm run create:admin -- <email> <password(min 6 chars)> [fullName] [ADMIN|STAFF]');
  process.exit(1);
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userRes, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (createErr) throw createErr;
  const userId = userRes.user.id;

  const { error: profileErr } = await supabase.from('profiles').upsert({
    id: userId,
    email,
    full_name: fullName,
    role,
  });

  if (profileErr) throw profileErr;
  console.log(`[create:admin] Created ${role} account successfully: ${email} (${userId})`);
}

main().catch((err) => {
  console.error('[create:admin] Failed:', err.message || err);
  process.exit(1);
});
