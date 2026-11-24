import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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
const QR_SECRET = process.env.QR_SIGNING_SECRET || 'ayutthaya-2569-dev-secret-change-in-env';
const LEGACY_API_URL =
  process.env.LEGACY_GAS_API_URL ||
  'https://script.google.com/macros/s/AKfycbx1QT3y_q-xjeO0n24re3G8aEnGHMCtYiUQyWIg6AWqvZdomSg9odjqqj5JnGYWsqJW/exec';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[migrate:legacy] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

function deterministicUuid(seed) {
  const hash = crypto.createHash('sha256').update(seed).digest();
  hash[6] = (hash[6] & 0x0f) | 0x40;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function signQrToken(studentId) {
  const cleanId = studentId.replace(/-/g, '').toLowerCase();
  const sig = crypto
    .createHmac('sha256', QR_SECRET)
    .update(cleanId)
    .digest('hex')
    .slice(0, 20);
  return `ASTD2569.${cleanId}.${sig}`;
}

function extractGrade(classRoom) {
  const match = String(classRoom || '').match(/^(ม\.\d)/);
  return match ? match[1] : String(classRoom || '').split('/')[0] || 'ไม่ระบุ';
}

async function main() {
  console.log('[migrate:legacy] Fetching legacy records (read-only) from Google Apps Script...');
  const response = await fetch(LEGACY_API_URL, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Legacy API responded with HTTP ${response.status}`);
  }

  const rawRecords = await response.json();
  if (!Array.isArray(rawRecords)) {
    throw new Error('Legacy API did not return a JSON array');
  }
  console.log(`[migrate:legacy] Retrieved ${rawRecords.length} live records from legacy Google Sheets.`);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Load departments map
  const { data: depts, error: deptErr } = await supabase.from('departments').select('id, name');
  if (deptErr) throw deptErr;
  const deptMap = new Map((depts || []).map((d) => [d.name, d.id]));

  const rowsToUpsert = rawRecords.map((rec, index) => {
    const legacyId = String(rec.id || `legacy_row_${index}_${rec.classRoom || ''}_${rec.numberLabel || ''}`);
    const studentUuid = deterministicUuid(`legacy_student:${legacyId}`);
    const deptName = rec.department ? String(rec.department).trim() : null;
    const deptId = deptName ? deptMap.get(deptName) ?? null : null;
    const tsNumber = Number(rec.timestamp);
    const registeredAt = Number.isFinite(tsNumber) && tsNumber > 0 ? new Date(tsNumber).toISOString() : new Date().toISOString();

    return {
      id: studentUuid,
      legacy_id: legacyId,
      full_name: String(rec.fullName || '').trim(),
      nickname: String(rec.nickname || '').trim(),
      grade: extractGrade(rec.classRoom),
      class_room: String(rec.classRoom || '').trim(),
      number_label: String(rec.numberLabel || '').trim(),
      role_category: rec.roleCategory === 'central' ? 'central' : 'department',
      central_position: rec.centralPosition ? String(rec.centralPosition).trim() : null,
      department_id: deptId,
      position: String(rec.position || rec.centralPosition || 'สมาชิกฝ่าย').trim(),
      sport_type: rec.sportType ? String(rec.sportType).trim() : null,
      auto_assigned: rec.autoAssigned === true || rec.autoAssigned === 'TRUE' || rec.autoAssigned === 'true',
      qr_token: signQrToken(studentUuid),
      registered_at: registeredAt,
      updated_at: new Date().toISOString(),
    };
  });

  // Batch upsert in chunks of 50
  let upserted = 0;
  for (let i = 0; i < rowsToUpsert.length; i += 50) {
    const chunk = rowsToUpsert.slice(i, i + 50);
    const { error } = await supabase
      .from('students')
      .upsert(chunk, { onConflict: 'legacy_id' });
    if (error) throw error;
    upserted += chunk.length;
    console.log(`[migrate:legacy] Upserted ${upserted}/${rowsToUpsert.length} records...`);
  }

  const { count, error: countErr } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });
  if (countErr) throw countErr;

  console.log(`[migrate:legacy] Migration complete. Total rows in Supabase students table: ${count}`);
}

main().catch((err) => {
  console.error('[migrate:legacy] Failed:', err);
  process.exit(1);
});
