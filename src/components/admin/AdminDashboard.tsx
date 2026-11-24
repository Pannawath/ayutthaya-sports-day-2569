'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  Download,
  Edit3,
  FileSpreadsheet,
  Plus,
  Search,
  Shield,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { ErrorState, SuccessBanner } from '@/components/ui/States';
import { ALL_ROOMS, CENTRAL_POSITIONS, NUMBERS } from '@/lib/constants';
import type {
  AttendanceSummaryStats,
  AuditLogRecord,
  CheckInSessionRecord,
  DepartmentRecord,
  RegistrationPolicies,
  StudentWithCheckIn,
  UserProfile,
} from '@/lib/types';

interface AdminDashboardProps {
  profile: UserProfile;
  initialStudents: StudentWithCheckIn[];
  initialDepartments: DepartmentRecord[];
  initialPolicies: RegistrationPolicies;
  initialSessions: CheckInSessionRecord[];
  initialStats: AttendanceSummaryStats;
  initialUsers: UserProfile[];
  initialAuditLogs: AuditLogRecord[];
}

type AdminTab =
  | 'overview'
  | 'students'
  | 'departments'
  | 'sessions'
  | 'excel'
  | 'users';

interface ExcelPreviewRow {
  rowNumber: number;
  fullName: string;
  classRoom: string;
  numberLabel: string;
  departmentName: string | null;
  position: string;
  status: 'READY' | 'DUPLICATE' | 'INVALID';
  reason: string;
}

export function AdminDashboard({
  profile,
  initialStudents,
  initialDepartments,
  initialPolicies,
  initialSessions,
  initialStats,
  initialUsers,
  initialAuditLogs,
}: AdminDashboardProps) {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [students, setStudents] = useState<StudentWithCheckIn[]>(initialStudents);
  const [departments, setDepartments] = useState<DepartmentRecord[]>(initialDepartments);
  const [policies, setPolicies] = useState<RegistrationPolicies>(initialPolicies);
  const [sessions, setSessions] = useState<CheckInSessionRecord[]>(initialSessions);
  const [stats, setStats] = useState<AttendanceSummaryStats>(initialStats);
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>(initialAuditLogs);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Students filters & edit modal
  const [studentSearch, setStudentSearch] = useState('');
  const [editingStudent, setEditingStudent] = useState<StudentWithCheckIn | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add student state
  const [newStudent, setNewStudent] = useState({
    studentCode: '',
    fullName: '',
    nickname: '',
    classRoom: ALL_ROOMS[0],
    numberLabel: NUMBERS[0],
    departmentName: initialDepartments[0]?.name || 'ฝ่ายอุปกรณ์',
    position: 'สมาชิกฝ่าย',
  });

  // New session state
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));

  // Excel import state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelPreview, setExcelPreview] = useState<{
    summary: { totalRows: number; readyCount: number; duplicateCount: number; invalidCount: number };
    rows: ExcelPreviewRow[];
  } | null>(null);
  const [excelBusy, setExcelBusy] = useState(false);

  // New user state
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'STAFF' as 'ADMIN' | 'STAFF',
  });

  async function reloadAll() {
    const [studRes, deptRes, polRes, statRes, sesRes, usrRes, logRes] = await Promise.all([
      fetch('/api/students'),
      fetch('/api/departments'),
      fetch('/api/settings'),
      fetch('/api/statistics'),
      fetch('/api/admin/sessions'),
      fetch('/api/admin/users'),
      fetch('/api/admin/audit-logs?limit=60'),
    ]);

    if (studRes.ok) {
      const d = await studRes.json();
      setStudents(d.students || []);
    }
    if (deptRes.ok) {
      const d = await deptRes.json();
      setDepartments(d.departments || []);
    }
    if (polRes.ok) {
      const d = await polRes.json();
      setPolicies(d.policies);
    }
    if (statRes.ok) {
      setStats(await statRes.json());
    }
    if (sesRes.ok) {
      const d = await sesRes.json();
      setSessions(d.sessions || []);
    }
    if (usrRes.ok) {
      const d = await usrRes.json();
      setUsers(d.users || []);
    }
    if (logRes.ok) {
      const d = await logRes.json();
      setAuditLogs(d.logs || []);
    }
  }

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.nickname.toLowerCase().includes(q) ||
        (s.studentCode || '').toLowerCase().includes(q) ||
        s.classRoom.toLowerCase().includes(q) ||
        (s.departmentName || '').toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const duplicateGroups = useMemo(() => {
    const map = new Map<string, StudentWithCheckIn[]>();
    students.forEach((s) => {
      const k = `${s.classRoom}|${s.numberLabel}`;
      const list = map.get(k) || [];
      list.push(s);
      map.set(k, list);
    });
    return Array.from(map.entries()).filter(([, list]) => list.length > 1);
  }, [students]);

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const isCentral = CENTRAL_POSITIONS.includes(newStudent.position);
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentCode: newStudent.studentCode.trim() || null,
        fullName: newStudent.fullName.trim(),
        nickname: newStudent.nickname.trim(),
        classRoom: newStudent.classRoom,
        numberLabel: newStudent.numberLabel,
        roleCategory: isCentral ? 'central' : 'department',
        centralPosition: isCentral ? newStudent.position : null,
        departmentName: isCentral ? null : newStudent.departmentName,
        position: newStudent.position,
        bypassRules: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'error', message: data.error || 'เพิ่มนักเรียนไม่สำเร็จ' });
      return;
    }
    setShowAddModal(false);
    setNewStudent({ ...newStudent, studentCode: '', fullName: '', nickname: '' });
    setFeedback({ type: 'success', message: 'เพิ่มนักเรียนเรียบร้อยแล้ว' });
    await reloadAll();
  }

  async function handleSaveEditStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStudent) return;
    setFeedback(null);
    const res = await fetch(`/api/students/${editingStudent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentCode: editingStudent.studentCode || null,
        fullName: editingStudent.fullName,
        nickname: editingStudent.nickname,
        classRoom: editingStudent.classRoom,
        numberLabel: editingStudent.numberLabel,
        departmentName: editingStudent.departmentName,
        position: editingStudent.position,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'error', message: data.error || 'แก้ไขไม่สำเร็จ' });
      return;
    }
    setEditingStudent(null);
    setFeedback({ type: 'success', message: 'บันทึกการแก้ไขข้อมูลนักเรียนแล้ว' });
    await reloadAll();
  }

  async function handleDeleteStudent(id: string, name: string) {
    if (!confirm(`ยืนยันลบข้อมูลของ "${name}" ออกจากฐานข้อมูล?`)) return;
    const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'error', message: data.error || 'ลบไม่สำเร็จ' });
      return;
    }
    setFeedback({ type: 'success', message: data.message });
    await reloadAll();
  }

  async function handleUpdateDepartment(
    id: string,
    patch: { maxCapacity?: number | null; isClosed?: boolean }
  ) {
    setFeedback(null);
    const res = await fetch('/api/departments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    if (res.ok) {
      setFeedback({ type: 'success', message: 'อัปเดตฝ่ายงานลงฐานข้อมูลแล้ว (มีผลทุกเครื่องทันที)' });
      await reloadAll();
    } else {
      const d = await res.json();
      setFeedback({ type: 'error', message: d.error || 'อัปเดตไม่สำเร็จ' });
    }
  }

  async function handleTogglePolicy(key: keyof RegistrationPolicies, val: boolean) {
    setFeedback(null);
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: val }),
    });
    if (res.ok) {
      setFeedback({ type: 'success', message: 'บันทึกนโยบายลง Supabase แล้ว' });
      await reloadAll();
    }
  }

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: sessionTitle, eventDate: sessionDate, isActive: true }),
    });
    const d = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'error', message: d.error || 'สร้างรอบไม่สำเร็จ' });
      return;
    }
    setSessionTitle('');
    setFeedback({ type: 'success', message: 'สร้างและเปิดใช้รอบเช็คชื่อใหม่แล้ว' });
    await reloadAll();
  }

  async function handleActivateSession(id: string) {
    const res = await fetch('/api/admin/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: true }),
    });
    if (res.ok) {
      setFeedback({ type: 'success', message: 'สลับรอบเช็คชื่อหลักเรียบร้อย' });
      await reloadAll();
    }
  }

  async function handleUndoCheckIn(checkInId: string) {
    if (!confirm('ต้องการยกเลิกสถานะเช็คชื่อรายการนี้?')) return;
    const res = await fetch(`/api/check-in/${checkInId}`, { method: 'DELETE' });
    if (res.ok) {
      setFeedback({ type: 'success', message: 'อัปเดตสถานะเช็คชื่อแล้ว' });
      await reloadAll();
    }
  }

  async function handleExcelPreview() {
    if (!excelFile) return;
    setExcelBusy(true);
    setFeedback(null);
    try {
      const fd = new FormData();
      fd.append('file', excelFile);
      fd.append('dryRun', 'true');
      const res = await fetch('/api/admin/import-excel', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'อ่านไฟล์ไม่สำเร็จ' });
        return;
      }
      setExcelPreview(data);
    } finally {
      setExcelBusy(false);
    }
  }

  async function handleExcelCommit() {
    if (!excelFile) return;
    setExcelBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', excelFile);
      fd.append('dryRun', 'false');
      const res = await fetch('/api/admin/import-excel', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'นำเข้าไม่สำเร็จ' });
        return;
      }
      setExcelPreview(null);
      setExcelFile(null);
      setFeedback({ type: 'success', message: data.message });
      await reloadAll();
    } finally {
      setExcelBusy(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    const d = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'error', message: d.error || 'สร้างผู้ใช้ไม่สำเร็จ' });
      return;
    }
    setNewUser({ email: '', password: '', fullName: '', role: 'STAFF' });
    setFeedback({ type: 'success', message: 'เพิ่มบัญชีเจ้าหน้าที่/Admin เรียบร้อยแล้ว' });
    await reloadAll();
  }

  async function handleChangeUserRole(id: string, role: 'ADMIN' | 'STAFF') {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role }),
    });
    if (res.ok) {
      setFeedback({ type: 'success', message: 'อัปเดตสิทธิ์ผู้ใช้แล้ว' });
      await reloadAll();
    }
  }

  const tabs: Array<{ id: AdminTab; label: string }> = [
    { id: 'overview', label: 'ภาพรวม' },
    { id: 'students', label: `นักเรียน (${students.length})` },
    { id: 'departments', label: 'ฝ่าย & นโยบาย' },
    { id: 'sessions', label: 'รอบ & ประวัติเช็คชื่อ' },
    { id: 'excel', label: 'Excel นำเข้า/ส่งออก' },
    { id: 'users', label: 'ผู้ใช้ & Audit Log' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 lg:pt-8 space-y-5">
      {/* Header */}
      <div className="figma-charcoal-surface text-white rounded-3xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 border border-pinkteam-light/25">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pinkteam-magenta text-white text-xs font-bold">
            <Shield className="w-3.5 h-3.5" /> 07 · ADMIN CONTROL CENTER
          </span>
          <h1 className="mt-2 font-display font-extrabold text-2xl">
            ศูนย์ควบคุมผู้ดูแลระบบ (Admin)
          </h1>
          <p className="text-xs sm:text-sm text-pinkteam-light">
            ผู้ใช้งาน: {profile.fullName} ({profile.email}) · สิทธิ์: {profile.role}
          </p>
        </div>

        <a
          href="/api/admin/export-excel"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pinkteam-light text-pinkteam-charcoal font-display font-bold text-xs sm:text-sm hover:bg-white transition"
        >
          <Download className="w-4 h-4" /> ส่งออก Excel (.xlsx)
        </a>
      </div>

      {feedback &&
        (feedback.type === 'success' ? (
          <SuccessBanner message={feedback.message} />
        ) : (
          <ErrorState message={feedback.message} />
        ))}

      {/* Tab Bar */}
      <div className="flex flex-wrap gap-1.5 bg-white/85 p-1.5 rounded-2xl border border-pinkteam-soft">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              tab === t.id
                ? 'bg-pinkteam-magenta text-white shadow'
                : 'text-pinkteam-charcoal hover:bg-pinkteam-blush'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="editorial-panel rounded-2xl p-4">
              <div className="text-xs text-pinkteam-muted font-semibold">นักเรียนทั้งหมด</div>
              <div className="font-display font-extrabold text-3xl text-pinkteam-charcoal mt-1">
                {stats.totalStudents}
              </div>
            </div>
            <div className="editorial-panel rounded-2xl p-4">
              <div className="text-xs text-emerald-700 font-semibold">มาเข้าร่วม (รอบปัจจุบัน)</div>
              <div className="font-display font-extrabold text-3xl text-emerald-600 mt-1">
                {stats.checkedInCount}
              </div>
            </div>
            <div className="editorial-panel rounded-2xl p-4">
              <div className="text-xs text-amber-700 font-semibold">ลงทะเบียนซ้ำ (ห้อง+เลขที่)</div>
              <div className="font-display font-extrabold text-3xl text-amber-600 mt-1">
                {duplicateGroups.length}
              </div>
            </div>
            <div className="editorial-panel rounded-2xl p-4">
              <div className="text-xs text-pinkteam-magenta font-semibold">บัญชีเจ้าหน้าที่/Admin</div>
              <div className="font-display font-extrabold text-3xl text-pinkteam-magenta mt-1">
                {users.length}
              </div>
            </div>
          </div>

          {duplicateGroups.length > 0 && (
            <div className="editorial-panel rounded-3xl p-5 space-y-3">
              <h2 className="font-display font-bold text-base text-amber-800">
                พบนักเรียนที่มีข้อมูลซ้ำซ้อนตามห้องและเลขที่ ({duplicateGroups.length} กลุ่ม)
              </h2>
              <div className="space-y-2">
                {duplicateGroups.map(([key, group]) => (
                  <div
                    key={key}
                    className="rounded-2xl bg-amber-50 border border-amber-200 p-3 space-y-1.5"
                  >
                    <div className="text-xs font-bold text-amber-900">
                      ห้อง {group[0].classRoom} · เลขที่ {group[0].numberLabel} ({group.length} รายการ)
                    </div>
                    {group.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between bg-white rounded-xl px-3 py-2 text-xs"
                      >
                        <span>
                          {g.fullName} · {g.departmentName || g.centralPosition} ({g.position})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(g.id, g.fullName)}
                          className="text-red-600 font-bold hover:underline"
                        >
                          ลบรายการนี้
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STUDENTS CRUD */}
      {tab === 'students' && (
        <div className="editorial-panel rounded-3xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-pinkteam-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="ค้นหาชื่อ, ห้อง, รหัสนักเรียน, ฝ่าย..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-pinkteam-soft bg-white text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pinkteam-magenta text-white text-xs sm:text-sm font-bold"
            >
              <Plus className="w-4 h-4" /> เพิ่มนักเรียน
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse min-w-[680px]">
              <thead>
                <tr className="border-b border-pinkteam-soft text-left text-pinkteam-muted">
                  <th className="py-2 pr-3">รหัส</th>
                  <th className="py-2 pr-3">ชื่อ-นามสกุล</th>
                  <th className="py-2 pr-3">ห้อง / เลขที่</th>
                  <th className="py-2 pr-3">ฝ่าย / ตำแหน่ง</th>
                  <th className="py-2 pr-3">เช็คชื่อ</th>
                  <th className="py-2 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="border-b border-pinkteam-blush">
                    <td className="py-2.5 pr-3 text-pinkteam-muted">{s.studentCode || '-'}</td>
                    <td className="py-2.5 pr-3 font-semibold text-pinkteam-charcoal">
                      {s.fullName} {s.nickname ? `(${s.nickname})` : ''}
                    </td>
                    <td className="py-2.5 pr-3">
                      {s.classRoom} · {s.numberLabel}
                    </td>
                    <td className="py-2.5 pr-3">
                      {s.roleCategory === 'central'
                        ? s.centralPosition
                        : `${s.departmentName || '-'} · ${s.position}`}
                    </td>
                    <td className="py-2.5 pr-3">
                      {s.checkedIn ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                          มาแล้ว
                        </span>
                      ) : (
                        <span className="text-pinkteam-muted">ยังไม่มา</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => setEditingStudent(s)}
                        className="p-1.5 rounded-lg bg-pinkteam-blush text-pinkteam-magenta hover:bg-pinkteam-soft"
                        aria-label={`แก้ไข ${s.fullName}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(s.id, s.fullName)}
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                        aria-label={`ลบ ${s.fullName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENTS & POLICIES */}
      {tab === 'departments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="editorial-panel rounded-3xl p-5 space-y-3">
            <h2 className="font-display font-bold text-lg text-pinkteam-charcoal">
              นโยบายระบบ (มีผลทันทีทุกอุปกรณ์)
            </h2>
            <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-pinkteam-blush/60 border border-pinkteam-soft">
              <div>
                <div className="font-bold text-sm text-pinkteam-charcoal">
                  ล็อกสิทธิ์ 1 คนต่อ 1 ฝ่ายงาน (Strict 1-Person)
                </div>
                <div className="text-xs text-pinkteam-muted">
                  ป้องกันนักเรียนห้องและเลขที่เดียวกันลงซ้ำ
                </div>
              </div>
              <input
                type="checkbox"
                checked={policies.strictOnePerson}
                onChange={(e) => handleTogglePolicy('strictOnePerson', e.target.checked)}
                className="w-5 h-5"
              />
            </label>

            <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-pinkteam-blush/60 border border-pinkteam-soft">
              <div>
                <div className="font-bold text-sm text-pinkteam-charcoal">
                  ล็อกห้อง ม.1 เข้าฝ่ายสแตนเชียร์อัตโนมัติ
                </div>
                <div className="text-xs text-pinkteam-muted">
                  ม.1/2, ม.1/9, ม.1/12 จะถูกจัดเข้าฝ่ายสแตนเชียร์ (สมาชิกฝ่าย)
                </div>
              </div>
              <input
                type="checkbox"
                checked={policies.lockM1Registration}
                onChange={(e) => handleTogglePolicy('lockM1Registration', e.target.checked)}
                className="w-5 h-5"
              />
            </label>

            <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-pinkteam-blush/60 border border-pinkteam-soft">
              <div>
                <div className="font-bold text-sm text-pinkteam-charcoal">
                  สงวนสิทธิ์ฝ่ายสแตนเชียร์เฉพาะ ม.1 เท่านั้น
                </div>
                <div className="text-xs text-pinkteam-muted">
                  หากปิด (แนะนำ) พี่ ม.2–ม.6 สามารถเลือกเข้าฝ่ายสแตนเชียร์ได้
                </div>
              </div>
              <input
                type="checkbox"
                checked={policies.m1StandOnly}
                onChange={(e) => handleTogglePolicy('m1StandOnly', e.target.checked)}
                className="w-5 h-5"
              />
            </label>
          </div>

          <div className="editorial-panel rounded-3xl p-5 space-y-3">
            <h2 className="font-display font-bold text-lg text-pinkteam-charcoal">
              โควตาและการเปิด/ปิดรับสมัครรายฝ่าย
            </h2>
            <div className="space-y-2.5">
              {departments.map((d) => (
                <div
                  key={d.id}
                  className="rounded-2xl border border-pinkteam-soft bg-white p-3.5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold text-sm text-pinkteam-charcoal">{d.name}</div>
                    <div className="text-xs text-pinkteam-muted">
                      ลงแล้ว {students.filter((s) => s.departmentName === d.name).length} คน
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      placeholder="ไม่จำกัด"
                      defaultValue={d.maxCapacity ?? ''}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        const nextVal = raw === '' ? null : Number(raw);
                        if (nextVal !== d.maxCapacity) {
                          handleUpdateDepartment(d.id, { maxCapacity: nextVal });
                        }
                      }}
                      className="w-24 px-2.5 py-1.5 rounded-lg border border-pinkteam-soft text-xs text-center"
                    />
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={!d.isClosed}
                        onChange={(e) =>
                          handleUpdateDepartment(d.id, { isClosed: !e.target.checked })
                        }
                      />
                      <span>{d.isClosed ? 'ปิดรับ' : 'เปิดรับ'}</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SESSIONS & CHECK-IN HISTORY */}
      {tab === 'sessions' && (
        <div className="space-y-5">
          <div className="editorial-panel rounded-3xl p-5 space-y-4">
            <h2 className="font-display font-bold text-lg text-pinkteam-charcoal">
              รอบการเช็คชื่อ (Check-in Sessions)
            </h2>
            <form onSubmit={handleCreateSession} className="flex flex-wrap gap-2.5">
              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="ชื่อรอบใหม่ เช่น วันซ้อมใหญ่ / วันแข่งขันจริง"
                required
                className="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl border border-pinkteam-soft bg-white text-sm"
              />
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
                className="px-3.5 py-2 rounded-xl border border-pinkteam-soft bg-white text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-pinkteam-magenta text-white text-sm font-bold"
              >
                สร้างและเปิดใช้งานรอบนี้
              </button>
            </form>

            <div className="space-y-2">
              {sessions.map((ses) => (
                <div
                  key={ses.id}
                  className="rounded-xl border border-pinkteam-soft bg-white p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-sm text-pinkteam-charcoal">{ses.title}</div>
                    <div className="text-xs text-pinkteam-muted">วันที่: {ses.eventDate}</div>
                  </div>
                  {ses.isActive ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      กำลังเปิดใช้งาน
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleActivateSession(ses.id)}
                      className="px-3 py-1 rounded-lg bg-pinkteam-blush text-pinkteam-magenta text-xs font-bold"
                    >
                      เปิดใช้รอบนี้
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="editorial-panel rounded-3xl p-5 space-y-3">
            <h2 className="font-display font-bold text-lg text-pinkteam-charcoal">
              รายการเช็คชื่อล่าสุดในรอบปัจจุบัน ({students.filter((s) => s.checkIn).length} คน)
            </h2>
            <div className="space-y-2 max-h-[380px] overflow-y-auto">
              {students
                .filter((s) => s.checkIn)
                .map((s) => (
                  <div
                    key={s.checkIn!.id}
                    className="rounded-xl border border-pinkteam-soft bg-white px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm"
                  >
                    <div>
                      <strong>{s.fullName}</strong> ({s.classRoom}) · วิธี{' '}
                      <span className="font-semibold text-pinkteam-magenta">
                        {s.checkIn!.method}
                      </span>{' '}
                      · โดย {s.checkIn!.checkedInByName || '-'} ·{' '}
                      {new Date(s.checkIn!.checkedInAt).toLocaleString('th-TH')}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUndoCheckIn(s.checkIn!.id)}
                      className="text-red-600 font-bold text-xs hover:underline"
                    >
                      ยกเลิกเช็คชื่อ
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EXCEL IMPORT / EXPORT */}
      {tab === 'excel' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="editorial-panel rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-pinkteam-magenta">
              <FileSpreadsheet className="w-6 h-6" />
              <h2 className="font-display font-bold text-lg text-pinkteam-charcoal">
                ส่งออกรายงาน Excel (.xlsx)
              </h2>
            </div>
            <p className="text-sm text-pinkteam-muted">
              ไฟล์เดียวรวม 5 ชีต: สรุปภาพรวม, รายชื่อทั้งหมด, สรุปตามห้อง, สรุปตามฝ่าย และประวัติเช็คชื่อ
            </p>
            <a
              href="/api/admin/export-excel"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-pinkteam-charcoal text-white font-display font-bold text-sm"
            >
              <Download className="w-4 h-4" /> ดาวน์โหลด Excel (.xlsx)
            </a>
          </div>

          <div className="editorial-panel rounded-3xl p-6 space-y-4">
            <h2 className="font-display font-bold text-lg text-pinkteam-charcoal">
              นำเข้าข้อมูลนักเรียนจาก Excel
            </h2>
            <p className="text-xs text-pinkteam-muted">
              รองรับคอลัมน์: เลขประจำตัว, ชื่อ-นามสกุล, ชื่อเล่น, ห้อง, เลขที่, ฝ่ายงาน, ตำแหน่ง
            </p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                setExcelFile(e.target.files?.[0] || null);
                setExcelPreview(null);
              }}
              className="block w-full text-xs text-pinkteam-charcoal"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!excelFile || excelBusy}
                onClick={handleExcelPreview}
                className="px-4 py-2 rounded-xl bg-pinkteam-blush text-pinkteam-magenta text-xs font-bold disabled:opacity-50"
              >
                ตรวจสอบไฟล์ก่อนนำเข้า
              </button>
              {excelPreview && excelPreview.summary.readyCount > 0 && (
                <button
                  type="button"
                  disabled={excelBusy}
                  onClick={handleExcelCommit}
                  className="px-4 py-2 rounded-xl bg-pinkteam-magenta text-white text-xs font-bold"
                >
                  ยืนยันนำเข้า {excelPreview.summary.readyCount} รายการ
                </button>
              )}
            </div>

            {excelPreview && (
              <div className="rounded-2xl bg-pinkteam-blush/60 border border-pinkteam-soft p-3 text-xs space-y-2">
                <div className="font-bold">
                  พร้อมนำเข้า: {excelPreview.summary.readyCount} · ซ้ำ:{' '}
                  {excelPreview.summary.duplicateCount} · ไม่ถูกต้อง:{' '}
                  {excelPreview.summary.invalidCount}
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {excelPreview.rows.slice(0, 30).map((r) => (
                    <div key={r.rowNumber} className="bg-white rounded px-2 py-1 flex justify-between">
                      <span>
                        แถว {r.rowNumber}: {r.fullName} ({r.classRoom} · {r.numberLabel})
                      </span>
                      <span
                        className={
                          r.status === 'READY'
                            ? 'text-emerald-700 font-bold'
                            : 'text-red-600 font-bold'
                        }
                      >
                        {r.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: USERS & AUDIT LOGS */}
      {tab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="editorial-panel rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-pinkteam-magenta" />
              <h2 className="font-display font-bold text-lg text-pinkteam-charcoal">
                จัดการบัญชีผู้ดูแลและเจ้าหน้าที่ (RBAC)
              </h2>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-2.5 bg-pinkteam-blush/60 p-4 rounded-2xl">
              <div className="text-xs font-bold text-pinkteam-magenta">เพิ่มบัญชีใหม่</div>
              <input
                type="text"
                value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                placeholder="ชื่อ-นามสกุลเจ้าหน้าที่"
                required
                className="w-full px-3 py-2 rounded-xl border border-pinkteam-soft bg-white text-sm"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="อีเมล"
                  required
                  className="px-3 py-2 rounded-xl border border-pinkteam-soft bg-white text-sm"
                />
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="รหัสผ่าน (6+ ตัว)"
                  required
                  minLength={6}
                  className="px-3 py-2 rounded-xl border border-pinkteam-soft bg-white text-sm"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value as 'ADMIN' | 'STAFF' })
                  }
                  className="px-3 py-2 rounded-xl border border-pinkteam-soft bg-white text-sm"
                >
                  <option value="STAFF">STAFF (เช็คชื่อได้ทุกฝ่าย)</option>
                  <option value="ADMIN">ADMIN (จัดการระบบทั้งหมด)</option>
                </select>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-pinkteam-magenta text-white text-xs font-bold"
                >
                  สร้างบัญชี
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="rounded-xl border border-pinkteam-soft bg-white p-3 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-sm text-pinkteam-charcoal">{u.fullName}</div>
                    <div className="text-xs text-pinkteam-muted">{u.email}</div>
                  </div>
                  <select
                    value={u.role}
                    onChange={(e) =>
                      handleChangeUserRole(u.id, e.target.value as 'ADMIN' | 'STAFF')
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-pinkteam-soft text-xs font-bold"
                  >
                    <option value="STAFF">STAFF</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="editorial-panel rounded-3xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-pinkteam-magenta" />
              <h2 className="font-display font-bold text-lg text-pinkteam-charcoal">
                ประวัติการทำงาน (Audit Logs)
              </h2>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-pinkteam-soft bg-white p-3 text-xs space-y-0.5"
                >
                  <div className="flex justify-between font-bold text-pinkteam-charcoal">
                    <span>{log.action}</span>
                    <span className="text-pinkteam-muted">
                      {new Date(log.createdAt).toLocaleString('th-TH')}
                    </span>
                  </div>
                  <div className="text-pinkteam-muted">
                    ผู้ดำเนินการ: {log.actorName || '-'} ({log.actorRole || '-'}) · {log.entityType}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <form
            onSubmit={handleAddStudent}
            className="w-full max-w-md rounded-3xl bg-white p-6 space-y-3 shadow-2xl"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-display font-bold text-lg">เพิ่มนักเรียนใหม่ (Admin)</h3>
              <button type="button" onClick={() => setShowAddModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="เลขประจำตัว (ถ้ามี)"
              value={newStudent.studentCode}
              onChange={(e) => setNewStudent({ ...newStudent, studentCode: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-pinkteam-soft text-sm"
            />
            <input
              type="text"
              placeholder="ชื่อ-นามสกุล *"
              required
              value={newStudent.fullName}
              onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-pinkteam-soft text-sm"
            />
            <input
              type="text"
              placeholder="ชื่อเล่น"
              value={newStudent.nickname}
              onChange={(e) => setNewStudent({ ...newStudent, nickname: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-pinkteam-soft text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newStudent.classRoom}
                onChange={(e) => setNewStudent({ ...newStudent, classRoom: e.target.value })}
                className="px-3 py-2 rounded-xl border border-pinkteam-soft text-sm"
              >
                {ALL_ROOMS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <select
                value={newStudent.numberLabel}
                onChange={(e) => setNewStudent({ ...newStudent, numberLabel: e.target.value })}
                className="px-3 py-2 rounded-xl border border-pinkteam-soft text-sm"
              >
                {NUMBERS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={newStudent.departmentName}
              onChange={(e) => setNewStudent({ ...newStudent, departmentName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-pinkteam-soft text-sm"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="ตำแหน่ง *"
              required
              value={newStudent.position}
              onChange={(e) => setNewStudent({ ...newStudent, position: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-pinkteam-soft text-sm"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-pinkteam-magenta text-white font-bold text-sm"
            >
              บันทึกนักเรียน
            </button>
          </form>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <form
            onSubmit={handleSaveEditStudent}
            className="w-full max-w-md rounded-3xl bg-white p-6 space-y-3 shadow-2xl"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-display font-bold text-lg">แก้ไขข้อมูลนักเรียน</h3>
              <button type="button" onClick={() => setEditingStudent(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="เลขประจำตัว"
              value={editingStudent.studentCode || ''}
              onChange={(e) =>
                setEditingStudent({ ...editingStudent, studentCode: e.target.value })
              }
              className="w-full px-3 py-2 rounded-xl border border-pinkteam-soft text-sm"
            />
            <input
              type="text"
              required
              value={editingStudent.fullName}
              onChange={(e) =>
                setEditingStudent({ ...editingStudent, fullName: e.target.value })
              }
              className="w-full px-3 py-2 rounded-xl border border-pinkteam-soft text-sm"
            />
            <input
              type="text"
              value={editingStudent.nickname}
              onChange={(e) =>
                setEditingStudent({ ...editingStudent, nickname: e.target.value })
              }
              className="w-full px-3 py-2 rounded-xl border border-pinkteam-soft text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={editingStudent.classRoom}
                onChange={(e) =>
                  setEditingStudent({ ...editingStudent, classRoom: e.target.value })
                }
                className="px-3 py-2 rounded-xl border border-pinkteam-soft text-sm"
              >
                {ALL_ROOMS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <select
                value={editingStudent.numberLabel}
                onChange={(e) =>
                  setEditingStudent({ ...editingStudent, numberLabel: e.target.value })
                }
                className="px-3 py-2 rounded-xl border border-pinkteam-soft text-sm"
              >
                {NUMBERS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={editingStudent.departmentName || ''}
              onChange={(e) =>
                setEditingStudent({ ...editingStudent, departmentName: e.target.value || null })
              }
              className="w-full px-3 py-2 rounded-xl border border-pinkteam-soft text-sm"
            >
              <option value="">ตำแหน่งส่วนกลาง (ไม่มีฝ่าย)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              value={editingStudent.position}
              onChange={(e) =>
                setEditingStudent({ ...editingStudent, position: e.target.value })
              }
              className="w-full px-3 py-2 rounded-xl border border-pinkteam-soft text-sm"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-pinkteam-magenta text-white font-bold text-sm"
            >
              บันทึกการเปลี่ยนแปลง
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
