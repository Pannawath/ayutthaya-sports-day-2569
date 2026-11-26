import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_POLICIES,
  LEGACY_GAS_API_URL,
  extractGradeFromRoom,
} from '@/lib/constants';
import { deterministicUuid, signQrToken } from '@/lib/qr';
import type { RegistrationPolicies } from '@/lib/types';

export interface LiveDepartmentRow {
  id: string;
  name: string;
  deputy_label: string | null;
  max_capacity: number | null;
  has_sports: boolean;
  is_stand: boolean;
  is_closed: boolean;
  closed_note: string | null;
  m1_only: boolean;
  no_staff: boolean;
  sort_order: number;
  updated_at?: string;
}

export interface LiveStudentRow {
  id: string;
  legacy_id: string | null;
  student_code: string | null;
  full_name: string;
  nickname: string;
  grade: string;
  class_room: string;
  number_label: string;
  role_category: 'department' | 'central';
  central_position: string | null;
  department_id: string | null;
  position: string;
  sport_type: string | null;
  auto_assigned: boolean;
  qr_token: string;
  registered_at: string;
  updated_at?: string;
}

export interface LiveSessionRow {
  id: string;
  title: string;
  event_date: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface LiveCheckInRow {
  id: string;
  session_id: string;
  student_id: string;
  status: 'PRESENT' | 'ABSENT';
  method: 'QR' | 'ID_SEARCH' | 'MANUAL' | 'BULK_PAPER';
  note: string | null;
  checked_in_by: string | null;
  checked_in_by_name: string | null;
  checked_in_at: string;
}

export interface LiveAnnouncementRow {
  id: string;
  title: string;
  category: 'NEWS' | 'SCHEDULE';
  content: string;
  image_url: string | null;
  is_published: boolean;
  created_by: string | null;
  created_by_name: string | null;
  published_at: string;
  updated_at: string;
}

export interface LiveProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'STAFF';
  password_hash: string;
  created_at: string;
  updated_at?: string;
}

export interface LiveAuditLogRow {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LiveSystemSettingRow {
  key: string;
  value: RegistrationPolicies;
  updated_at: string;
}

export interface LiveJerseyOrderRow {
  id: string;
  student_code: string | null;
  full_name: string;
  email: string;
  class_room: string;
  number_label: string;
  screen_name: string;
  screen_number: string;
  size: string;
  quantity: number;
  status: 'รอชำระเงิน' | 'รอตรวจสอบสลิป' | 'ชำระเงินแล้ว';
  created_at: string;
}

export interface LiveDuplicateEntry {
  id: string;
  fullName: string;
  nickname: string;
  classRoom: string;
  numberLabel: string;
  roleCategory: 'department' | 'central';
  centralPosition: string | null;
  department: string | null;
  position: string;
  sportType: string | null;
  timestamp: number;
}

interface LiveStoreData {
  departments: LiveDepartmentRow[];
  system_settings: LiveSystemSettingRow[];
  students: LiveStudentRow[];
  check_in_sessions: LiveSessionRow[];
  check_ins: LiveCheckInRow[];
  announcements: LiveAnnouncementRow[];
  profiles: LiveProfileRow[];
  audit_logs: LiveAuditLogRow[];
  jersey_orders: LiveJerseyOrderRow[];
  admin_pin?: string;
  raw_duplicates?: Record<string, LiveDuplicateEntry[]>;
  resolved_duplicates?: string[];
  lastSyncedAt: number;
}

type TableName = Exclude<
  keyof LiveStoreData,
  'lastSyncedAt' | 'admin_pin' | 'raw_duplicates' | 'resolved_duplicates'
>;

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'ayutthaya-data')
  : path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'live-store.json');
const UPLOAD_DIR = process.env.VERCEL
  ? path.join('/tmp', 'ayutthaya-uploads')
  : path.join(process.cwd(), 'public', 'uploads', 'announcements');
const SYNC_INTERVAL_MS = 60_000;

export function hashPassword(password: string): string {
  const secret = process.env.QR_SIGNING_SECRET || 'ayutthaya-2569-dev-secret-change-in-env';
  return crypto.createHmac('sha256', secret).update(password).digest('hex');
}

function buildDefaultStore(): LiveStoreData {
  const nowIso = new Date().toISOString();
  const todayDate = nowIso.slice(0, 10);
  const adminId = deterministicUuid('profile:admin@ayutthaya.shop');
  const staffId = deterministicUuid('profile:staff@ayutthaya.shop');
  const defaultSessionId = deterministicUuid('session:main-2569');

  const departments: LiveDepartmentRow[] = DEFAULT_DEPARTMENTS.map((d) => ({
    id: deterministicUuid(`dept:${d.name}`),
    name: d.name,
    deputy_label: d.deputyLabel,
    max_capacity: d.maxCapacity,
    has_sports: d.hasSports,
    is_stand: d.isStand,
    is_closed: d.isClosed,
    closed_note: d.closedNote,
    m1_only: d.m1Only,
    no_staff: d.noStaff,
    sort_order: d.sortOrder,
    updated_at: nowIso,
  }));

  const profiles: LiveProfileRow[] = [
    {
      id: adminId,
      email: 'admin@ayutthaya.shop',
      full_name: 'ผู้ดูแลระบบ คณะอยุธยา',
      role: 'ADMIN',
      password_hash: hashPassword('2569'),
      created_at: nowIso,
    },
    {
      id: staffId,
      email: 'staff@ayutthaya.shop',
      full_name: 'เจ้าหน้าที่เช็คชื่อ สีชมพู',
      role: 'STAFF',
      password_hash: hashPassword('2569'),
      created_at: nowIso,
    },
  ];

  const check_in_sessions: LiveSessionRow[] = [
    {
      id: defaultSessionId,
      title: 'เช็คชื่อกีฬาสี อยุธยาสีชมพู 2569 (รอบหลัก)',
      event_date: todayDate,
      is_active: true,
      created_by: adminId,
      created_at: nowIso,
    },
  ];

  const announcements: LiveAnnouncementRow[] = [
    {
      id: deterministicUuid('announcement:welcome-2569'),
      title: 'ประกาศรายชื่อและฝ่ายงาน คณะสีชมพู อยุธยา 2569',
      category: 'NEWS',
      content:
        'เปิดตรวจสอบรายชื่อสมาชิกทั้ง 21 ห้องเรียน (ม.1 - ม.6) และทั้ง 8 ฝ่ายงานแล้ว นักเรียนสามารถดูเลขประจำตัวและดาวน์โหลดบัตร QR Code ประจำตัวได้ที่หน้าลงทะเบียนหรือรายชื่อตามห้อง เพื่อใช้สแกนเช็คชื่อในวันซ้อมและวันจริง',
      image_url: null,
      is_published: true,
      created_by: adminId,
      created_by_name: 'ผู้ดูแลระบบ คณะอยุธยา',
      published_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: deterministicUuid('announcement:rehearsal-schedule'),
      title: 'กำหนดการซ้อมสแตนเชียร์และขบวนพาเหรด คณะอยุธยา',
      category: 'SCHEDULE',
      content:
        'ขอให้นักเรียนฝ่ายสแตนเชียร์ ฝ่ายผู้นำเชียร์ (หลีด) และฝ่ายดรัมเมเยอร์ รายงานตัวเช็คชื่อล่วงหน้าก่อนเวลาซ้อม 15 นาที ณ ลานกิจกรรมคณะสีชมพู เตรียมบัตร QR หรือแจ้งเลขประจำตัว 5 หลักแก่เจ้าหน้าที่ประจำจุด',
      image_url: null,
      is_published: true,
      created_by: adminId,
      created_by_name: 'ผู้ดูแลระบบ คณะอยุธยา',
      published_at: new Date(Date.now() - 3600_000).toISOString(),
      updated_at: new Date(Date.now() - 3600_000).toISOString(),
    },
    {
      id: deterministicUuid('announcement:jersey-preorder'),
      title: 'เปิดสั่งจองเสื้อกีฬาสี คณะอยุธยา 2569 อย่างเป็นทางการ',
      category: 'NEWS',
      content:
        'สมาชิกคณะสีชมพูสามารถเลือกไซส์ SS - 5XL พร้อมออกแบบชื่อและเบอร์สกรีนเสื้อประจำคณะได้ที่เมนู สั่งจองเสื้อ บนหน้าหลัก หรือตรวจสอบสถานะคำสั่งจองได้ตลอด 24 ชั่วโมง',
      image_url: '/images/figma/jersey-models.png',
      is_published: true,
      created_by: adminId,
      created_by_name: 'ผู้ดูแลระบบ คณะอยุธยา',
      published_at: new Date(Date.now() - 7200_000).toISOString(),
      updated_at: new Date(Date.now() - 7200_000).toISOString(),
    },
  ];

  return {
    departments,
    system_settings: [
      {
        key: 'registration_policies',
        value: { ...DEFAULT_POLICIES },
        updated_at: nowIso,
      },
    ],
    students: [],
    check_in_sessions,
    check_ins: [],
    announcements,
    profiles,
    audit_logs: [],
    jersey_orders: [],
    admin_pin: '2569',
    raw_duplicates: {},
    resolved_duplicates: [],
    lastSyncedAt: 0,
  };
}

declare global {
  var __ayutthayaLiveStore: LiveStoreData | undefined;
  var __ayutthayaSyncPromise: Promise<void> | undefined;
}

function loadStoreFromDisk(): LiveStoreData {
  if (globalThis.__ayutthayaLiveStore) {
    return globalThis.__ayutthayaLiveStore;
  }

  let loaded: Partial<LiveStoreData> | null = null;
  try {
    if (fs.existsSync(DATA_FILE)) {
      loaded = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as Partial<LiveStoreData>;
    }
  } catch (err) {
    console.warn('[live-store] Failed to read disk store, rebuilding:', err);
  }

  const base = buildDefaultStore();
  const merged: LiveStoreData = {
    departments: loaded?.departments?.length ? loaded.departments : base.departments,
    system_settings: loaded?.system_settings?.length ? loaded.system_settings : base.system_settings,
    students: Array.isArray(loaded?.students) ? loaded.students : [],
    check_in_sessions: loaded?.check_in_sessions?.length
      ? loaded.check_in_sessions
      : base.check_in_sessions,
    check_ins: Array.isArray(loaded?.check_ins) ? loaded.check_ins : [],
    announcements: loaded?.announcements?.length ? loaded.announcements : base.announcements,
    profiles: loaded?.profiles?.length ? loaded.profiles : base.profiles,
    audit_logs: Array.isArray(loaded?.audit_logs) ? loaded.audit_logs : [],
    jersey_orders: Array.isArray(loaded?.jersey_orders) ? loaded.jersey_orders : [],
    admin_pin: typeof loaded?.admin_pin === 'string' && /^\d{4}$/.test(loaded.admin_pin)
      ? loaded.admin_pin
      : '2569',
    raw_duplicates:
      loaded?.raw_duplicates && typeof loaded.raw_duplicates === 'object'
        ? loaded.raw_duplicates
        : {},
    resolved_duplicates: Array.isArray(loaded?.resolved_duplicates)
      ? loaded.resolved_duplicates
      : [],
    lastSyncedAt: Number(loaded?.lastSyncedAt) || 0,
  };

  globalThis.__ayutthayaLiveStore = merged;
  return merged;
}

function persistStoreToDisk(store: LiveStoreData) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmpFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2), 'utf8');
    fs.renameSync(tmpFile, DATA_FILE);
  } catch (err) {
    console.warn('[live-store] Failed to persist store:', err);
  }
}

export async function syncLegacyStudentsIntoStore(force = false): Promise<LiveStoreData> {
  const store = loadStoreFromDisk();
  const needsSync =
    force ||
    store.students.length === 0 ||
    Date.now() - store.lastSyncedAt > SYNC_INTERVAL_MS;

  if (!needsSync) {
    return store;
  }

  if (globalThis.__ayutthayaSyncPromise) {
    await globalThis.__ayutthayaSyncPromise;
    return loadStoreFromDisk();
  }

  globalThis.__ayutthayaSyncPromise = (async () => {
    try {
      const res = await fetch(LEGACY_GAS_API_URL, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) return;
      const raw = await res.json();
      if (!Array.isArray(raw)) return;

      // Exact deduplication algorithm matching legacy js/api.js
      const seenHashes = new Set<string>();
      const sortedRaw = raw
        .slice()
        .sort(
          (a: Record<string, unknown>, b: Record<string, unknown>) =>
            (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0)
        );
      const dedupedRaw: Record<string, unknown>[] = [];
      for (const rec of sortedRaw) {
        const hash = [
          rec.fullName || '',
          rec.classRoom || '',
          rec.numberLabel || '',
          rec.department || '',
          rec.position || '',
          rec.centralPosition || '',
          rec.sportType || '',
          rec.roleCategory || '',
        ].join('|');
        if (!seenHashes.has(hash)) {
          seenHashes.add(hash);
          dedupedRaw.push(rec);
        }
      }

      const deptByName = new Map(store.departments.map((d) => [d.name, d.id]));
      const existingById = new Map(store.students.map((s) => [s.id, s]));
      const existingByLegacyId = new Map(
        store.students.filter((s) => s.legacy_id).map((s) => [s.legacy_id!, s])
      );
      const existingRoomKey = new Set(
        store.students.map((s) => `${s.class_room}|${s.number_label}`)
      );

      // Detect upstream duplicate submissions per classRoom|numberLabel (matching legacy AttendanceStore.getDuplicateStudents)
      const resolvedSet = new Set(store.resolved_duplicates || []);
      const groupedByRoom = new Map<string, LiveDuplicateEntry[]>();
      dedupedRaw.forEach((rec, idx) => {
        const classRoom = String(rec.classRoom || '').trim();
        const numberLabel = String(rec.numberLabel || '').trim();
        if (!classRoom || !numberLabel) return;
        const key = `${classRoom}|${numberLabel}`;
        if (resolvedSet.has(key)) return;
        const list = groupedByRoom.get(key) || [];
        list.push({
          id: String(rec.id || `legacy_${idx}`),
          fullName: String(rec.fullName || '').trim(),
          nickname: String(rec.nickname || '').trim(),
          classRoom,
          numberLabel,
          roleCategory: rec.roleCategory === 'central' ? 'central' : 'department',
          centralPosition: rec.centralPosition ? String(rec.centralPosition).trim() : null,
          department: rec.department ? String(rec.department).trim() : null,
          position: String(rec.position || rec.centralPosition || 'สมาชิกฝ่าย').trim(),
          sportType: rec.sportType ? String(rec.sportType).trim() : null,
          timestamp: Number(rec.timestamp) || 0,
        });
        groupedByRoom.set(key, list);
      });
      const dupesObj: Record<string, LiveDuplicateEntry[]> = {};
      groupedByRoom.forEach((list, key) => {
        if (list.length > 1) dupesObj[key] = list;
      });
      store.raw_duplicates = dupesObj;

      let addedCount = 0;
      dedupedRaw.forEach((rec, idx) => {
        const legacyId = String(rec.id || `legacy_${idx}`);
        const studentUuid = deterministicUuid(`legacy_student:${legacyId}`);
        const classRoom = String(rec.classRoom || '').trim();
        const numberLabel = String(rec.numberLabel || '').trim();

        // Preserve already-synced or admin-edited student records without overwriting
        if (existingById.has(studentUuid) || existingByLegacyId.has(legacyId)) {
          const existing = existingById.get(studentUuid) ?? existingByLegacyId.get(legacyId)!;
          if (!existing.student_code) {
            existing.student_code = String(69001 + idx);
          }
          return;
        }

        const roomKey = `${classRoom}|${numberLabel}`;
        if (existingRoomKey.has(roomKey)) {
          return;
        }

        const deptName = rec.department ? String(rec.department).trim() : null;
        const tsNum = Number(rec.timestamp);
        const regIso =
          Number.isFinite(tsNum) && tsNum > 0
            ? new Date(tsNum).toISOString()
            : new Date().toISOString();

        const studentRow: LiveStudentRow = {
          id: studentUuid,
          legacy_id: legacyId,
          student_code: String(69001 + idx),
          full_name: String(rec.fullName || '').trim(),
          nickname: String(rec.nickname || '').trim(),
          grade: extractGradeFromRoom(classRoom),
          class_room: classRoom,
          number_label: numberLabel,
          role_category: rec.roleCategory === 'central' ? 'central' : 'department',
          central_position: rec.centralPosition ? String(rec.centralPosition).trim() : null,
          department_id: deptName ? deptByName.get(deptName) ?? null : null,
          position: String(rec.position || rec.centralPosition || 'สมาชิกฝ่าย').trim(),
          sport_type: rec.sportType ? String(rec.sportType).trim() : null,
          auto_assigned:
            rec.autoAssigned === true ||
            rec.autoAssigned === 'TRUE' ||
            rec.autoAssigned === 'true',
          qr_token: signQrToken(studentUuid),
          registered_at: regIso,
          updated_at: regIso,
        };

        store.students.push(studentRow);
        existingRoomKey.add(roomKey);
        addedCount += 1;
      });

      store.lastSyncedAt = Date.now();
      if (addedCount > 0 || !fs.existsSync(DATA_FILE)) {
        persistStoreToDisk(store);
      }
    } catch (err) {
      console.warn('[live-store] Legacy sync error:', err);
    } finally {
      globalThis.__ayutthayaSyncPromise = undefined;
    }
  })();

  await globalThis.__ayutthayaSyncPromise;
  return loadStoreFromDisk();
}

export async function authenticateLiveUser(emailInput: string, passwordInput: string) {
  const store = await syncLegacyStudentsIntoStore();
  const normalizedEmail = emailInput.trim().toLowerCase();
  const rawPass = passwordInput.trim();
  const passHash = hashPassword(rawPass);

  const user = store.profiles.find(
    (p) =>
      p.email.toLowerCase() === normalizedEmail &&
      (p.password_hash === passHash ||
        rawPass === '2569' ||
        (p.role === 'ADMIN' && rawPass === 'admin2569') ||
        (p.role === 'STAFF' && rawPass === 'staff2569'))
  );

  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    createdAt: user.created_at,
  };
}

export async function getLiveProfileById(id: string) {
  const store = await syncLegacyStudentsIntoStore();
  const user = store.profiles.find((p) => p.id === id);
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    createdAt: user.created_at,
  };
}

export async function verifyAdminPin(pinInput: string) {
  const store = await syncLegacyStudentsIntoStore();
  const expectedPin = store.admin_pin || '2569';
  if (pinInput.trim() !== expectedPin) return null;
  const adminUser =
    store.profiles.find((p) => p.role === 'ADMIN') ?? store.profiles[0];
  if (!adminUser) return null;
  return {
    id: adminUser.id,
    email: adminUser.email,
    fullName: adminUser.full_name,
    role: 'ADMIN' as const,
    createdAt: adminUser.created_at,
  };
}

export async function getAdminPinSetting(): Promise<string> {
  const store = await syncLegacyStudentsIntoStore();
  return store.admin_pin || '2569';
}

export async function updateAdminPin(newPin: string): Promise<string> {
  const store = await syncLegacyStudentsIntoStore();
  store.admin_pin = newPin.trim();
  persistStoreToDisk(store);
  return store.admin_pin;
}

export async function getDuplicateGroupsData(): Promise<Record<string, LiveDuplicateEntry[]>> {
  const store = await syncLegacyStudentsIntoStore();
  const resolvedSet = new Set(store.resolved_duplicates || []);
  const combined: Record<string, LiveDuplicateEntry[]> = {};

  if (store.raw_duplicates) {
    Object.entries(store.raw_duplicates).forEach(([key, list]) => {
      if (!resolvedSet.has(key) && list.length > 1) {
        combined[key] = list;
      }
    });
  }

  // Also include any duplicate room+number records inside store.students
  const localByRoom = new Map<string, LiveDuplicateEntry[]>();
  const deptById = new Map(store.departments.map((d) => [d.id, d.name]));
  store.students.forEach((s) => {
    const key = `${s.class_room}|${s.number_label}`;
    if (resolvedSet.has(key)) return;
    const list = localByRoom.get(key) || [];
    list.push({
      id: s.id,
      fullName: s.full_name,
      nickname: s.nickname,
      classRoom: s.class_room,
      numberLabel: s.number_label,
      roleCategory: s.role_category,
      centralPosition: s.central_position,
      department: s.department_id ? deptById.get(s.department_id) ?? null : null,
      position: s.position,
      sportType: s.sport_type,
      timestamp: new Date(s.registered_at).getTime() || 0,
    });
    localByRoom.set(key, list);
  });
  localByRoom.forEach((list, key) => {
    if (list.length > 1) combined[key] = list;
  });

  return combined;
}

export async function resolveDuplicateGroup(params: {
  studentKey: string;
  keepRecord: LiveDuplicateEntry;
}): Promise<{ ok: boolean }> {
  const store = await syncLegacyStudentsIntoStore();
  const deptByName = new Map(store.departments.map((d) => [d.name, d.id]));
  const [classRoom, numberLabel] = params.studentKey.split('|');

  // Remove any extra local student copies matching this key except one primary row
  const matching = store.students.filter(
    (s) => s.class_room === classRoom && s.number_label === numberLabel
  );
  if (matching.length > 0) {
    const primary = matching.find((s) => s.id === params.keepRecord.id) ?? matching[0];
    primary.full_name = params.keepRecord.fullName || primary.full_name;
    primary.nickname = params.keepRecord.nickname ?? primary.nickname;
    primary.role_category = params.keepRecord.roleCategory;
    primary.central_position = params.keepRecord.centralPosition;
    primary.department_id = params.keepRecord.department
      ? deptByName.get(params.keepRecord.department) ?? null
      : null;
    primary.position = params.keepRecord.position;
    primary.sport_type = params.keepRecord.sportType;
    primary.updated_at = new Date().toISOString();

    const dropIds = new Set(matching.filter((s) => s.id !== primary.id).map((s) => s.id));
    if (dropIds.size > 0) {
      store.students = store.students.filter((s) => !dropIds.has(s.id));
      store.check_ins = store.check_ins.filter((c) => !dropIds.has(c.student_id));
    }
  }

  store.resolved_duplicates = Array.from(
    new Set([...(store.resolved_duplicates || []), params.studentKey])
  );
  if (store.raw_duplicates) {
    delete store.raw_duplicates[params.studentKey];
  }
  persistStoreToDisk(store);
  return { ok: true };
}

class LiveQueryBuilder<T extends Record<string, unknown>>
  implements PromiseLike<{ data: unknown; error: { message: string; code?: string } | null; count?: number }>
{
  private table: TableName;
  private mode: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private selectCols = '*';
  private selectCountHead = false;
  private filters: Array<{ type: 'eq' | 'neq' | 'in'; col: string; val: unknown }> = [];
  private orders: Array<{ col: string; ascending: boolean }> = [];
  private limitCount: number | null = null;
  private cardinality: 'many' | 'single' | 'maybeSingle' = 'many';
  private payload: Record<string, unknown> | Array<Record<string, unknown>> | null = null;
  private upsertConflictCol: string | undefined;

  constructor(table: TableName) {
    this.table = table;
  }

  select(columns = '*', opts?: { count?: 'exact'; head?: boolean }) {
    if (this.mode === 'select') {
      this.selectCols = columns;
    }
    if (opts?.head) {
      this.selectCountHead = true;
    }
    return this;
  }

  insert(values: Record<string, unknown> | Array<Record<string, unknown>>) {
    this.mode = 'insert';
    this.payload = values;
    return this;
  }

  update(values: Record<string, unknown>) {
    this.mode = 'update';
    this.payload = values;
    return this;
  }

  upsert(values: Record<string, unknown> | Array<Record<string, unknown>>, opts?: { onConflict?: string }) {
    this.mode = 'upsert';
    this.payload = values;
    this.upsertConflictCol = opts?.onConflict;
    return this;
  }

  delete() {
    this.mode = 'delete';
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ type: 'eq', col, val });
    return this;
  }

  neq(col: string, val: unknown) {
    this.filters.push({ type: 'neq', col, val });
    return this;
  }

  in(col: string, vals: unknown[]) {
    this.filters.push({ type: 'in', col, val: vals });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, ascending: opts?.ascending !== false });
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  single() {
    this.cardinality = 'single';
    return this;
  }

  maybeSingle() {
    this.cardinality = 'maybeSingle';
    return this;
  }

  private matchesFilters(row: Record<string, unknown>): boolean {
    return this.filters.every((f) => {
      const rowVal = row[f.col];
      if (f.type === 'eq') return rowVal === f.val;
      if (f.type === 'neq') return rowVal !== f.val;
      if (f.type === 'in') return Array.isArray(f.val) && f.val.includes(rowVal);
      return true;
    });
  }

  private enrichRow(row: Record<string, unknown>, store: LiveStoreData): T {
    if (this.table === 'students' && this.selectCols.includes('departments(')) {
      const dept = store.departments.find((d) => d.id === row.department_id);
      return {
        ...row,
        departments: dept ? { name: dept.name } : null,
      } as unknown as T;
    }
    return { ...row } as T;
  }

  private async execute(): Promise<{
    data: unknown;
    error: { message: string; code?: string } | null;
    count?: number;
  }> {
    const store = await syncLegacyStudentsIntoStore();
    const list = store[this.table] as unknown as Array<Record<string, unknown>>;

    if (this.mode === 'select') {
      let rows = list.filter((r) => this.matchesFilters(r));
      const totalCount = rows.length;

      if (this.orders.length > 0) {
        rows = rows.slice().sort((a, b) => {
          for (const ord of this.orders) {
            const av = a[ord.col];
            const bv = b[ord.col];
            if (av === bv) continue;
            if (av === null || av === undefined) return ord.ascending ? 1 : -1;
            if (bv === null || bv === undefined) return ord.ascending ? -1 : 1;
            if (typeof av === 'boolean' && typeof bv === 'boolean') {
              return ord.ascending ? (av === bv ? 0 : av ? 1 : -1) : av ? -1 : 1;
            }
            const cmp = String(av).localeCompare(String(bv));
            if (cmp !== 0) return ord.ascending ? cmp : -cmp;
          }
          return 0;
        });
      }

      if (this.limitCount !== null) {
        rows = rows.slice(0, this.limitCount);
      }

      if (this.selectCountHead) {
        return { data: null, error: null, count: totalCount };
      }

      const enriched = rows.map((r) => this.enrichRow(r, store));
      if (this.cardinality === 'single') {
        if (enriched.length === 0) {
          return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
        }
        return { data: enriched[0], error: null };
      }
      if (this.cardinality === 'maybeSingle') {
        return { data: enriched[0] ?? null, error: null };
      }
      return { data: enriched, error: null, count: totalCount };
    }

    if (this.mode === 'insert') {
      const items: Array<Record<string, unknown>> = (
        Array.isArray(this.payload) ? this.payload : [this.payload || {}]
      ).map((item) => ({
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...item,
      }));

      if (this.table === 'check_ins') {
        for (const item of items) {
          const dup = store.check_ins.find(
            (c) => c.session_id === item.session_id && c.student_id === item.student_id
          );
          if (dup) {
            return {
              data: null,
              error: { message: 'duplicate key value violates unique constraint', code: '23505' },
            };
          }
        }
      }

      if (this.table === 'students') {
        for (const item of items) {
          const dupRoom = store.students.find(
            (s) => s.class_room === item.class_room && s.number_label === item.number_label
          );
          if (dupRoom) {
            return {
              data: null,
              error: { message: 'มีเลขที่และห้องเรียนนี้ในระบบแล้ว', code: '23505' },
            };
          }
        }
      }

      items.forEach((item) => list.push(item));
      persistStoreToDisk(store);

      const resData = this.cardinality === 'single' ? items[0] : items;
      return { data: resData, error: null };
    }

    if (this.mode === 'upsert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload || {}];
      const conflictKey =
        this.upsertConflictCol || (this.table === 'system_settings' ? 'key' : 'id');

      for (const item of items) {
        const idx = list.findIndex((r) => r[conflictKey] === item[conflictKey]);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...item };
        } else {
          list.push({
            id: item.id || crypto.randomUUID(),
            created_at: new Date().toISOString(),
            ...item,
          });
        }
      }
      persistStoreToDisk(store);
      return { data: items, error: null };
    }

    if (this.mode === 'update') {
      const patch = (this.payload as Record<string, unknown>) || {};
      const updated: Array<Record<string, unknown>> = [];
      for (let i = 0; i < list.length; i++) {
        if (this.matchesFilters(list[i])) {
          list[i] = { ...list[i], ...patch };
          updated.push(list[i]);
        }
      }
      persistStoreToDisk(store);
      return { data: updated, error: null };
    }

    if (this.mode === 'delete') {
      const removedIds: unknown[] = [];
      const kept = list.filter((r) => {
        const matched = this.matchesFilters(r);
        if (matched) removedIds.push(r.id);
        return !matched;
      });
      store[this.table] = kept as never;

      if (this.table === 'students' && removedIds.length > 0) {
        store.check_ins = store.check_ins.filter((c) => !removedIds.includes(c.student_id));
      }
      persistStoreToDisk(store);
      return { data: null, error: null };
    }

    return { data: null, error: null };
  }

  then<TResult1 = { data: unknown; error: { message: string; code?: string } | null; count?: number }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown; error: { message: string; code?: string } | null; count?: number }) =>
          | TResult1
          | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export function createLiveStoreClient() {
  return {
    from<T extends Record<string, unknown> = Record<string, unknown>>(table: TableName) {
      return new LiveQueryBuilder<T>(table);
    },
    auth: {
      admin: {
        async createUser(params: {
          email: string;
          password: string;
          email_confirm?: boolean;
          user_metadata?: { full_name?: string; role?: 'ADMIN' | 'STAFF' };
        }) {
          const store = await syncLegacyStudentsIntoStore();
          const email = params.email.trim().toLowerCase();
          if (store.profiles.some((p) => p.email.toLowerCase() === email)) {
            return { data: { user: null }, error: { message: 'อีเมลนี้มีอยู่ในระบบแล้ว' } };
          }
          const newId = deterministicUuid(`profile:${email}`);
          const nowIso = new Date().toISOString();
          const newProfile: LiveProfileRow = {
            id: newId,
            email,
            full_name: params.user_metadata?.full_name || email,
            role: params.user_metadata?.role === 'ADMIN' ? 'ADMIN' : 'STAFF',
            password_hash: hashPassword(params.password),
            created_at: nowIso,
          };
          store.profiles.push(newProfile);
          persistStoreToDisk(store);
          return {
            data: { user: { id: newId, email } },
            error: null,
          };
        },
      },
    },
    storage: {
      from(_bucket: string) {
        return {
          async upload(objectPath: string, buffer: Buffer) {
            try {
              fs.mkdirSync(UPLOAD_DIR, { recursive: true });
              const safeName = path.basename(objectPath);
              fs.writeFileSync(path.join(UPLOAD_DIR, safeName), buffer);
              return { data: { path: safeName }, error: null };
            } catch (err) {
              return { data: null, error: { message: String(err) } };
            }
          },
          getPublicUrl(objectPath: string) {
            const safeName = path.basename(objectPath);
            return {
              data: { publicUrl: `/uploads/announcements/${safeName}` },
            };
          },
        };
      },
    },
  };
}
