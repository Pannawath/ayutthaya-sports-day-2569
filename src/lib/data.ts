import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_POLICIES,
  GRADES,
  LEGACY_GAS_API_URL,
  extractGradeFromRoom,
} from '@/lib/constants';
import { deterministicUuid, signQrToken } from '@/lib/qr';
import { createLiveStoreClient } from '@/lib/live-store';
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin';
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type {
  AnnouncementRecord,
  AttendanceSummaryStats,
  AuditLogRecord,
  CheckInRecord,
  CheckInSessionRecord,
  DepartmentRecord,
  RegistrationPolicies,
  StudentRecord,
  StudentWithCheckIn,
  UserProfile,
} from '@/lib/types';

interface LegacyCache {
  students: StudentRecord[];
  fetchedAt: number;
}

let legacyCache: LegacyCache | null = null;
const LEGACY_CACHE_TTL_MS = 30_000;

function getDefaultDepartmentsWithIds(): DepartmentRecord[] {
  return DEFAULT_DEPARTMENTS.map((d) => ({
    id: deterministicUuid(`dept:${d.name}`),
    name: d.name,
    deputyLabel: d.deputyLabel,
    maxCapacity: d.maxCapacity,
    hasSports: d.hasSports,
    isStand: d.isStand,
    isClosed: d.isClosed,
    closedNote: d.closedNote,
    m1Only: d.m1Only,
    noStaff: d.noStaff,
    sortOrder: d.sortOrder,
  }));
}

async function fetchLegacyStudentsReadOnly(): Promise<StudentRecord[]> {
  if (legacyCache && Date.now() - legacyCache.fetchedAt < LEGACY_CACHE_TTL_MS) {
    return legacyCache.students;
  }

  try {
    const res = await fetch(LEGACY_GAS_API_URL, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });
    if (!res.ok) return legacyCache?.students ?? [];
    const raw = await res.json();
    if (!Array.isArray(raw)) return legacyCache?.students ?? [];

    const depts = getDefaultDepartmentsWithIds();
    const deptByName = new Map(depts.map((d) => [d.name, d.id]));

    const mapped: StudentRecord[] = raw.map((rec: Record<string, unknown>, idx: number) => {
      const legacyId = String(rec.id || `legacy_${idx}`);
      const studentUuid = deterministicUuid(`legacy_student:${legacyId}`);
      const classRoom = String(rec.classRoom || '').trim();
      const deptName = rec.department ? String(rec.department).trim() : null;
      const tsNum = Number(rec.timestamp);

      return {
        id: studentUuid,
        legacyId,
        studentCode: null,
        fullName: String(rec.fullName || '').trim(),
        nickname: String(rec.nickname || '').trim(),
        grade: extractGradeFromRoom(classRoom),
        classRoom,
        numberLabel: String(rec.numberLabel || '').trim(),
        roleCategory: rec.roleCategory === 'central' ? 'central' : 'department',
        centralPosition: rec.centralPosition ? String(rec.centralPosition).trim() : null,
        departmentId: deptName ? deptByName.get(deptName) ?? null : null,
        departmentName: deptName,
        position: String(rec.position || rec.centralPosition || 'สมาชิกฝ่าย').trim(),
        sportType: rec.sportType ? String(rec.sportType).trim() : null,
        autoAssigned: rec.autoAssigned === true || rec.autoAssigned === 'TRUE' || rec.autoAssigned === 'true',
        qrToken: signQrToken(studentUuid),
        registeredAt:
          Number.isFinite(tsNum) && tsNum > 0
            ? new Date(tsNum).toISOString()
            : new Date().toISOString(),
      };
    });

    legacyCache = { students: mapped, fetchedAt: Date.now() };
    return mapped;
  } catch (err) {
    console.warn('[data.ts] Legacy GAS read failed:', err);
    return legacyCache?.students ?? [];
  }
}

async function getReaderClient() {
  if (isSupabaseAdminConfigured()) {
    return createSupabaseAdminClient();
  }
  if (isSupabaseConfigured()) {
    return await createSupabaseServerClient();
  }
  return createLiveStoreClient() as unknown as NonNullable<
    ReturnType<typeof createSupabaseAdminClient>
  >;
}

export async function getDepartmentsData(): Promise<DepartmentRecord[]> {
  const client = await getReaderClient();
  if (!client) return getDefaultDepartmentsWithIds();

  const { data, error } = await client
    .from('departments')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error || !data || data.length === 0) {
    return getDefaultDepartmentsWithIds();
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    deputyLabel: row.deputy_label,
    maxCapacity: row.max_capacity,
    hasSports: Boolean(row.has_sports),
    isStand: Boolean(row.is_stand),
    isClosed: Boolean(row.is_closed),
    closedNote: row.closed_note,
    m1Only: Boolean(row.m1_only),
    noStaff: Boolean(row.no_staff),
    sortOrder: Number(row.sort_order) || 0,
  }));
}

export async function getPoliciesData(): Promise<RegistrationPolicies> {
  const client = await getReaderClient();
  if (!client) return { ...DEFAULT_POLICIES };

  const { data } = await client
    .from('system_settings')
    .select('value')
    .eq('key', 'registration_policies')
    .maybeSingle();

  const val = (data?.value as Partial<RegistrationPolicies> | null) ?? null;
  return {
    strictOnePerson:
      typeof val?.strictOnePerson === 'boolean'
        ? val.strictOnePerson
        : DEFAULT_POLICIES.strictOnePerson,
    lockM1Registration:
      typeof val?.lockM1Registration === 'boolean'
        ? val.lockM1Registration
        : DEFAULT_POLICIES.lockM1Registration,
    m1StandOnly:
      typeof val?.m1StandOnly === 'boolean' ? val.m1StandOnly : DEFAULT_POLICIES.m1StandOnly,
  };
}

export async function getStudentsData(): Promise<{
  students: StudentRecord[];
  sourceMode: 'supabase' | 'legacy-readonly';
}> {
  const client = await getReaderClient();
  if (!client) {
    return {
      students: await fetchLegacyStudentsReadOnly(),
      sourceMode: 'legacy-readonly',
    };
  }

  const [depts, { data, error }] = await Promise.all([
    getDepartmentsData(),
    client.from('students').select('*').order('registered_at', { ascending: false }),
  ]);

  if (error) {
    return {
      students: await fetchLegacyStudentsReadOnly(),
      sourceMode: 'legacy-readonly',
    };
  }

  const deptById = new Map(depts.map((d) => [d.id, d.name]));
  const students: StudentRecord[] = (data || []).map((row) => ({
    id: row.id,
    legacyId: row.legacy_id,
    studentCode: row.student_code,
    fullName: row.full_name,
    nickname: row.nickname || '',
    grade: row.grade,
    classRoom: row.class_room,
    numberLabel: row.number_label,
    roleCategory: row.role_category === 'central' ? 'central' : 'department',
    centralPosition: row.central_position,
    departmentId: row.department_id,
    departmentName: row.department_id ? deptById.get(row.department_id) ?? null : null,
    position: row.position,
    sportType: row.sport_type,
    autoAssigned: Boolean(row.auto_assigned),
    qrToken: row.qr_token,
    registeredAt: row.registered_at,
  }));

  return {
    students,
    sourceMode: isSupabaseAdminConfigured() || isSupabaseConfigured() ? 'supabase' : 'legacy-readonly',
  };
}

export async function getSessionsData(): Promise<CheckInSessionRecord[]> {
  const client = await getReaderClient();
  if (!client) return [];

  const { data } = await client
    .from('check_in_sessions')
    .select('*')
    .order('is_active', { ascending: false })
    .order('event_date', { ascending: false });

  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    eventDate: row.event_date,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  }));
}

export async function getActiveSession(): Promise<CheckInSessionRecord | null> {
  const sessions = await getSessionsData();
  return sessions.find((s) => s.isActive) ?? sessions[0] ?? null;
}

export async function getCheckInsData(sessionId?: string): Promise<CheckInRecord[]> {
  const client = await getReaderClient();
  if (!client) return [];

  let query = client
    .from('check_ins')
    .select('*')
    .order('checked_in_at', { ascending: false });

  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  const { data } = await query;
  return (data || []).map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    studentId: row.student_id,
    status: row.status === 'ABSENT' ? 'ABSENT' : 'PRESENT',
    method: row.method,
    note: row.note,
    checkedInBy: row.checked_in_by,
    checkedInByName: row.checked_in_by_name,
    checkedInAt: row.checked_in_at,
  }));
}

export async function getStudentsWithCheckIn(sessionId?: string): Promise<{
  students: StudentWithCheckIn[];
  sessions: CheckInSessionRecord[];
  activeSession: CheckInSessionRecord | null;
  departments: DepartmentRecord[];
  policies: RegistrationPolicies;
  sourceMode: 'supabase' | 'legacy-readonly';
}> {
  const [studentRes, sessions, departments, policies] = await Promise.all([
    getStudentsData(),
    getSessionsData(),
    getDepartmentsData(),
    getPoliciesData(),
  ]);

  const targetSession =
    (sessionId ? sessions.find((s) => s.id === sessionId) : null) ??
    sessions.find((s) => s.isActive) ??
    sessions[0] ??
    null;

  const checkIns = targetSession ? await getCheckInsData(targetSession.id) : [];
  const checkInByStudent = new Map<string, CheckInRecord>();
  checkIns.forEach((ci) => {
    if (ci.status === 'PRESENT') {
      checkInByStudent.set(ci.studentId, ci);
    }
  });

  const enriched: StudentWithCheckIn[] = studentRes.students.map((student) => {
    const ci = checkInByStudent.get(student.id) ?? null;
    return {
      ...student,
      checkedIn: Boolean(ci),
      checkIn: ci,
    };
  });

  return {
    students: enriched,
    sessions,
    activeSession: targetSession,
    departments,
    policies,
    sourceMode: studentRes.sourceMode,
  };
}

export async function getAnnouncementsData(includeDrafts = false): Promise<AnnouncementRecord[]> {
  const client = await getReaderClient();
  if (!client) return [];

  let query = client
    .from('announcements')
    .select('*')
    .order('published_at', { ascending: false });

  if (!includeDrafts) {
    query = query.eq('is_published', true);
  }

  const { data } = await query;
  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category === 'SCHEDULE' ? 'SCHEDULE' : 'NEWS',
    content: row.content,
    imageUrl: row.image_url,
    isPublished: Boolean(row.is_published),
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    publishedAt: row.published_at,
  }));
}

export async function getUsersProfilesData(): Promise<UserProfile[]> {
  const client = await getReaderClient();
  if (!client) return [];

  const { data } = await client
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  return (data || []).map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role === 'ADMIN' ? 'ADMIN' : 'STAFF',
    createdAt: row.created_at,
  }));
}

export async function getAuditLogsData(limit = 100): Promise<AuditLogRecord[]> {
  const client = await getReaderClient();
  if (!client) return [];

  const { data } = await client
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []).map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: row.created_at,
  }));
}

export async function getAttendanceStatistics(options?: {
  sessionId?: string;
  range?: 'today' | '7d' | 'all';
}): Promise<AttendanceSummaryStats> {
  const { students, activeSession, departments, sourceMode } = await getStudentsWithCheckIn(
    options?.sessionId
  );

  const now = Date.now();
  const rangeMs =
    options?.range === 'today'
      ? 24 * 60 * 60 * 1000
      : options?.range === '7d'
        ? 7 * 24 * 60 * 60 * 1000
        : null;

  const isInRange = (s: StudentWithCheckIn) => {
    if (!s.checkedIn || !s.checkIn) return false;
    if (!rangeMs) return true;
    const t = new Date(s.checkIn.checkedInAt).getTime();
    return now - t <= rangeMs;
  };

  const totalStudents = students.length;
  const checkedInStudents = students.filter(isInRange);
  const checkedInCount = checkedInStudents.length;
  const pendingCount = Math.max(0, totalStudents - checkedInCount);
  const attendanceRate =
    totalStudents > 0 ? Math.round((checkedInCount / totalStudents) * 1000) / 10 : 0;

  const byDepartment = departments.map((dept) => {
    const members = students.filter((s) => s.departmentName === dept.name);
    const present = members.filter(isInRange).length;
    const total = members.length;
    const pending = Math.max(0, total - present);
    return {
      name: dept.name,
      total,
      present,
      pending,
      rate: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
      maxCapacity: dept.maxCapacity,
      isClosed: dept.isClosed,
    };
  });

  const byGrade = GRADES.map((g) => {
    const members = students.filter((s) => s.grade === g.grade);
    const present = members.filter(isInRange).length;
    const total = members.length;
    const pending = Math.max(0, total - present);
    return {
      grade: g.grade,
      total,
      present,
      pending,
      rate: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
    };
  });

  const byRoom = GRADES.flatMap((g) =>
    g.rooms.map((room) => {
      const members = students.filter((s) => s.classRoom === room);
      const present = members.filter(isInRange).length;
      const total = members.length;
      const pending = Math.max(0, total - present);
      return {
        room,
        grade: g.grade,
        total,
        present,
        pending,
        rate: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
      };
    })
  );

  // Timeline sorted chronologically by hour bucket (e.g. "08:00")
  const bucketsMap = new Map<string, number>();
  checkedInStudents
    .slice()
    .sort(
      (a, b) =>
        new Date(a.checkIn!.checkedInAt).getTime() - new Date(b.checkIn!.checkedInAt).getTime()
    )
    .forEach((s) => {
      const d = new Date(s.checkIn!.checkedInAt);
      const label = d.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const hourBucket = `${label.slice(0, 2)}:00`;
      bucketsMap.set(hourBucket, (bucketsMap.get(hourBucket) ?? 0) + 1);
    });

  let cumulative = 0;
  const timeline = Array.from(bucketsMap.entries()).map(([bucket, count]) => {
    cumulative += count;
    return { bucket, count, cumulative };
  });

  return {
    totalStudents,
    checkedInCount,
    pendingCount,
    attendanceRate,
    activeSession,
    byDepartment,
    byGrade,
    byRoom,
    timeline,
    sourceMode,
  };
}
