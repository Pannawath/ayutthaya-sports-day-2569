'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CopyCheck,
  Download,
  Edit3,
  ExternalLink,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Shirt,
  Sliders,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { CheckInWorkspace } from '@/components/checkin/CheckInWorkspace';
import { ErrorState, SuccessBanner } from '@/components/ui/States';
import { ALL_ROOMS, CENTRAL_POSITIONS, GRADES, NUMBERS, SPORT_TYPES } from '@/lib/constants';
import type { LiveDuplicateEntry } from '@/lib/live-store';
import type {
  AttendanceSummaryStats,
  AuditLogRecord,
  CheckInSessionRecord,
  DepartmentRecord,
  RegistrationPolicies,
  StudentWithCheckIn,
  UserProfile,
} from '@/lib/types';

type AdminTab =
  | 'overview'
  | 'directory'
  | 'checkin'
  | 'duplicates'
  | 'quotas'
  | 'policies';

interface StandaloneAdminAppProps {
  initialAuthenticated: boolean;
  profile: UserProfile | null;
  initialStudents?: StudentWithCheckIn[];
  initialDepartments?: DepartmentRecord[];
  initialPolicies?: RegistrationPolicies;
  initialSessions?: CheckInSessionRecord[];
  initialStats?: AttendanceSummaryStats | null;
  initialDuplicateGroups?: Record<string, LiveDuplicateEntry[]>;
  initialAuditLogs?: AuditLogRecord[];
  currentPin?: string;
}

const TAB_TITLES: Record<AdminTab, string> = {
  overview: 'ภาพรวมสรุปผล',
  directory: 'จัดการรายชื่อ',
  checkin: 'เช็คชื่อวันงาน',
  duplicates: 'คัดกรองซ้ำ',
  quotas: 'โควตาฝ่ายงาน',
  policies: 'ตั้งค่า & Excel',
};

function getInitialChar(name: string): string {
  const clean = name.replace(/^(นาย|นางสาว|น\.ส\.|นาง|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.)\s*/u, '').trim();
  return (clean.charAt(0) || name.charAt(0) || 'ส').toUpperCase();
}

export function StandaloneAdminApp({
  initialAuthenticated,
  profile,
  initialStudents = [],
  initialDepartments = [],
  initialPolicies = { strictOnePerson: true, lockM1Registration: true, m1StandOnly: false },
  initialSessions = [],
  initialStats = null,
  initialDuplicateGroups = {},
  initialAuditLogs = [],
  currentPin = '2569',
}: StandaloneAdminAppProps) {
  // PIN Gate state
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const pinInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Dashboard state
  const [tab, setTab] = useState<AdminTab>('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [students, setStudents] = useState<StudentWithCheckIn[]>(initialStudents);
  const [departments, setDepartments] = useState<DepartmentRecord[]>(initialDepartments);
  const [policies, setPolicies] = useState<RegistrationPolicies>(initialPolicies);
  const [sessions, setSessions] = useState<CheckInSessionRecord[]>(initialSessions);
  const [stats, setStats] = useState<AttendanceSummaryStats | null>(initialStats);
  const [duplicateGroups, setDuplicateGroups] =
    useState<Record<string, LiveDuplicateEntry[]>>(initialDuplicateGroups);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>(initialAuditLogs);
  const [pinDisplay, setPinDisplay] = useState(currentPin);
  const [refreshing, setRefreshing] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Directory filters & modals
  const [studentSearch, setStudentSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [roomFilter, setRoomFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [editingStudent, setEditingStudent] = useState<StudentWithCheckIn | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    studentCode: '',
    fullName: '',
    nickname: '',
    classRoom: ALL_ROOMS[0],
    numberLabel: NUMBERS[0],
    roleCategory: 'department' as 'department' | 'central',
    centralPosition: CENTRAL_POSITIONS[0],
    departmentName: initialDepartments[0]?.name || 'ฝ่ายอุปกรณ์',
    position: 'สมาชิกฝ่าย',
    sportType: SPORT_TYPES[0],
  });

  // Session creation state
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));

  // Change PIN input
  const [newPinInput, setNewPinInput] = useState('');

  async function submitPin(pinStr: string) {
    if (pinBusy || pinStr.length !== 4) return;
    setPinBusy(true);
    setPinError(null);
    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinStr }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPinError(json.error || 'รหัส PIN ไม่ถูกต้อง');
        setPinDigits(['', '', '', '']);
        pinInputRefs[0].current?.focus();
        return;
      }
      window.location.reload();
    } catch {
      setPinError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setPinBusy(false);
    }
  }

  function handlePinChange(idx: number, val: string) {
    const clean = val.replace(/\D/g, '').slice(-1);
    const next = [...pinDigits];
    next[idx] = clean;
    setPinDigits(next);
    if (clean && idx < 3) {
      pinInputRefs[idx + 1].current?.focus();
    }
    const joined = next.join('');
    if (joined.length === 4) {
      submitPin(joined);
    }
  }

  function handlePinKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !pinDigits[idx] && idx > 0) {
      pinInputRefs[idx - 1].current?.focus();
    }
  }

  async function reloadAll(forceUpstreamSync = false) {
    setRefreshing(true);
    try {
      if (forceUpstreamSync) {
        await fetch('/api/sync', { method: 'POST' });
      }
      const [studRes, deptRes, polRes, statRes, sesRes, dupeRes, logRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/departments'),
        fetch('/api/settings'),
        fetch('/api/statistics'),
        fetch('/api/admin/sessions'),
        fetch('/api/admin/duplicates'),
        fetch('/api/admin/audit-logs?limit=50'),
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
      if (dupeRes.ok) {
        const d = await dupeRes.json();
        setDuplicateGroups(d.duplicateGroups || {});
      }
      if (logRes.ok) {
        const d = await logRes.json();
        setAuditLogs(d.logs || []);
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
  }

  const dupeEntries = useMemo(() => Object.entries(duplicateGroups), [duplicateGroups]);

  const availableRooms = useMemo(() => {
    if (gradeFilter === 'ALL') return ALL_ROOMS;
    const found = GRADES.find((g) => g.grade === gradeFilter);
    return found ? found.rooms : ALL_ROOMS;
  }, [gradeFilter]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return students.filter((s) => {
      if (gradeFilter !== 'ALL' && s.grade !== gradeFilter) return false;
      if (roomFilter !== 'ALL' && s.classRoom !== roomFilter) return false;
      if (deptFilter === 'CENTRAL' && s.roleCategory !== 'central') return false;
      if (deptFilter !== 'ALL' && deptFilter !== 'CENTRAL' && s.departmentName !== deptFilter) {
        return false;
      }
      if (!q) return true;
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.nickname.toLowerCase().includes(q) ||
        (s.studentCode || '').toLowerCase().includes(q) ||
        s.classRoom.toLowerCase().includes(q) ||
        s.numberLabel.toLowerCase().includes(q) ||
        (s.departmentName || '').toLowerCase().includes(q) ||
        (s.position || '').toLowerCase().includes(q) ||
        (s.sportType || '').toLowerCase().includes(q)
      );
    });
  }, [students, studentSearch, gradeFilter, roomFilter, deptFilter]);

  const gradeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    GRADES.forEach((g) => {
      map[g.grade] = 0;
    });
    students.forEach((s) => {
      if (map[s.grade] !== undefined) map[s.grade] += 1;
    });
    return map;
  }, [students]);

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const isCentral = newStudent.roleCategory === 'central';
    const isSports = !isCentral && newStudent.departmentName === 'ฝ่ายกีฬา';
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentCode: newStudent.studentCode.trim() || undefined,
        fullName: newStudent.fullName.trim(),
        nickname: newStudent.nickname.trim(),
        classRoom: newStudent.classRoom,
        numberLabel: newStudent.numberLabel,
        roleCategory: isCentral ? 'central' : 'department',
        centralPosition: isCentral ? newStudent.centralPosition : null,
        departmentName: isCentral ? null : newStudent.departmentName,
        position: isCentral ? newStudent.centralPosition : newStudent.position,
        sportType: isSports ? newStudent.sportType : null,
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
    setFeedback({ type: 'success', message: 'เพิ่มรายชื่อนักเรียนเรียบร้อยแล้ว' });
    await reloadAll();
  }

  async function handleSaveEditStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStudent) return;
    setFeedback(null);
    const isCentral = editingStudent.roleCategory === 'central';
    const isSports = !isCentral && editingStudent.departmentName === 'ฝ่ายกีฬา';
    const res = await fetch(`/api/students/${editingStudent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentCode: editingStudent.studentCode || null,
        fullName: editingStudent.fullName.trim(),
        nickname: editingStudent.nickname.trim(),
        classRoom: editingStudent.classRoom,
        numberLabel: editingStudent.numberLabel,
        roleCategory: editingStudent.roleCategory,
        centralPosition: isCentral
          ? editingStudent.centralPosition || editingStudent.position
          : null,
        departmentName: isCentral ? null : editingStudent.departmentName,
        position: isCentral
          ? editingStudent.centralPosition || editingStudent.position
          : editingStudent.position,
        sportType: isSports ? editingStudent.sportType || SPORT_TYPES[0] : null,
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

  async function handleResolveDuplicate(studentKey: string, keepRecord: LiveDuplicateEntry) {
    setFeedback(null);
    const res = await fetch('/api/admin/duplicates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentKey, keepRecord }),
    });
    const json = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'error', message: json.error || 'จัดการรายการซ้ำไม่สำเร็จ' });
      return;
    }
    setDuplicateGroups(json.duplicateGroups || {});
    setFeedback({
      type: 'success',
      message: `คงฝ่าย "${keepRecord.department || keepRecord.position}" สำหรับ ${keepRecord.fullName} เรียบร้อยแล้ว`,
    });
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
      setFeedback({ type: 'success', message: 'อัปเดตฝ่ายงานลงฐานข้อมูลแล้ว' });
      await reloadAll();
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
      setFeedback({ type: 'success', message: 'บันทึกนโยบายลงฐานข้อมูลแล้ว' });
      await reloadAll();
    }
  }

  async function handleUpdatePin(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const res = await fetch('/api/auth/pin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPin: newPinInput.trim() }),
    });
    const d = await res.json();
    if (!res.ok) {
      setFeedback({ type: 'error', message: d.error || 'เปลี่ยน PIN ไม่สำเร็จ' });
      return;
    }
    setPinDisplay(d.pin);
    setNewPinInput('');
    setFeedback({ type: 'success', message: `เปลี่ยนรหัส PIN เป็น ${d.pin} เรียบร้อยแล้ว` });
  }

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
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
    setFeedback({ type: 'success', message: 'สร้างและเปิดใช้งานรอบเช็คชื่อใหม่แล้ว' });
    await reloadAll();
  }

  function jumpToDirectory(opts: { grade?: string; dept?: string }) {
    setGradeFilter(opts.grade ?? 'ALL');
    setRoomFilter('ALL');
    setDeptFilter(opts.dept ?? 'ALL');
    setTab('directory');
  }

  // ===================== STANDALONE MINIMAL PIN GATE =====================
  if (!initialAuthenticated) {
    return (
      <div className="min-h-dvh bg-[#FAFAFB] text-zinc-900 flex items-center justify-center p-5">
        <div className="w-full max-w-sm bg-white border border-zinc-200/80 rounded-2xl p-8 text-center shadow-[0_12px_36px_rgba(0,0,0,0.05)] space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 font-display font-bold text-base flex items-center justify-center mx-auto">
            PK
          </div>
          <div className="space-y-1">
            <h1 className="font-display font-semibold text-lg text-zinc-900">
              Admin Studio · อยุธยาสีชมพู
            </h1>
            <p className="text-xs text-zinc-500">
              กรอกรหัส PIN 4 หลักเพื่อเข้าสู่ศูนย์จัดการคณะสี
            </p>
          </div>

          {pinError && <ErrorState message={pinError} />}

          <div className="flex justify-center gap-2.5">
            {pinDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={pinInputRefs[idx]}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                disabled={pinBusy}
                onChange={(e) => handlePinChange(idx, e.target.value)}
                onKeyDown={(e) => handlePinKeyDown(idx, e)}
                aria-label={`รหัส PIN หลักที่ ${idx + 1}`}
                className="w-12 h-14 text-center text-xl font-semibold border border-zinc-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 rounded-xl bg-white text-zinc-900 outline-none transition-[border-color,box-shadow] duration-150"
              />
            ))}
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={pinBusy}
              onClick={() => submitPin('2569')}
              className="w-full min-h-[42px] rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-60"
            >
              เข้าสู่ระบบด้วย PIN (2569)
            </button>

            <Link
              href="/"
              className="block w-full min-h-[40px] leading-[40px] rounded-xl border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              กลับหน้าหลักคณะสี
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ===================== NAVIGATION ITEMS =====================
  const navItems: Array<{
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    badge?: number;
  }> = [
    { id: 'overview', label: 'ภาพรวม', icon: LayoutGrid },
    { id: 'directory', label: 'จัดการรายชื่อ', icon: Users },
    { id: 'checkin', label: 'เช็คชื่อวันงาน', icon: ClipboardCheck },
    {
      id: 'duplicates',
      label: 'คัดกรองซ้ำ',
      icon: CopyCheck,
      badge: dupeEntries.length > 0 ? dupeEntries.length : undefined,
    },
    { id: 'quotas', label: 'โควตาฝ่ายงาน', icon: Sliders },
    { id: 'policies', label: 'ตั้งค่า & Excel', icon: Shield },
  ];

  const mobileBottomItems: Array<{
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  }> = [
    { id: 'overview', label: 'ภาพรวม', icon: LayoutGrid },
    { id: 'directory', label: 'รายชื่อ', icon: Users },
    { id: 'checkin', label: 'เช็คชื่อ', icon: ClipboardCheck },
    { id: 'policies', label: 'ตั้งค่า', icon: Shield },
  ];

  const activeSession = sessions.find((s) => s.isActive) || sessions[0] || null;
  const checkedInCount = students.filter((s) => s.checkedIn).length;

  return (
    <div className="min-h-dvh bg-[#FAFAFB] text-zinc-900 flex">
      {/* ================= DESKTOP PERSISTENT SIDEBAR ================= */}
      <aside className="no-print hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-zinc-200/80 sticky top-0 h-dvh">
        <div className="p-5 border-b border-zinc-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-600 text-white font-display font-bold text-xs flex items-center justify-center shrink-0">
            PK
          </div>
          <div className="min-w-0">
            <div className="font-display font-semibold text-sm text-zinc-900 truncate">
              อยุธยาสีชมพู 2569
            </div>
            <div className="text-[11px] text-zinc-500">Admin Studio</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="เมนูผู้ดูแลระบบ">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-rose-50 text-rose-700 font-semibold'
                    : 'text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${active ? 'text-rose-600' : 'text-zinc-400'}`}
                    strokeWidth={1.75}
                  />
                  <span>{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-semibold tabular-nums">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-zinc-100 space-y-1">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              หน้าสาธารณะ
            </div>
            <Link
              href="/"
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Home className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                <span>หน้าหลักคณะสี</span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-300" />
            </Link>
            <a
              href="/shop"
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Shirt className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                <span>เว็บสั่งจองเสื้อ</span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-300" />
            </a>
          </div>
        </nav>

        <div className="p-3 border-t border-zinc-100 space-y-2">
          <button
            type="button"
            onClick={() => reloadAll(true)}
            disabled={refreshing}
            className="w-full min-h-[38px] flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            <span>{refreshing ? 'กำลังซิงก์...' : 'ซิงก์ Google Sheets'}</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full min-h-[38px] flex items-center justify-center gap-2 rounded-xl text-xs font-medium text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>ออกจากระบบ Admin</span>
          </button>
        </div>
      </aside>

      {/* ================= MAIN WORKSPACE ================= */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Sticky Top Header */}
        <header className="no-print lg:hidden sticky top-0 z-40 h-14 bg-white/90 backdrop-blur-md border-b border-zinc-200/80 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="เปิดเมนู Admin"
              className="w-9 h-9 rounded-xl border border-zinc-200 bg-white flex items-center justify-center text-zinc-700 hover:bg-zinc-50 cursor-pointer shrink-0"
            >
              <Menu className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <div className="min-w-0">
              <div className="font-display font-semibold text-sm text-zinc-900 truncate">
                {TAB_TITLES[tab]}
              </div>
              <div className="text-[11px] text-zinc-500 truncate tabular-nums">
                สมาชิก {students.length} คน · เช็คชื่อ {checkedInCount} คน
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => reloadAll(true)}
              disabled={refreshing}
              aria-label="รีเฟรชข้อมูล"
              className="w-9 h-9 rounded-xl border border-zinc-200 bg-white flex items-center justify-center text-zinc-600 hover:bg-zinc-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="h-9 inline-flex items-center gap-1 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่ม</span>
            </button>
          </div>
        </header>

        {/* Desktop Minimal Top Header */}
        <header className="no-print hidden lg:flex sticky top-0 z-30 h-16 bg-[#FAFAFB]/90 backdrop-blur-md border-b border-zinc-200/70 px-8 items-center justify-between">
          <div>
            <h1 className="font-display font-semibold text-lg text-zinc-900">{TAB_TITLES[tab]}</h1>
            <p className="text-xs text-zinc-500 tabular-nums">
              สมาชิกทั้งหมด {students.length} คน · เช็คชื่อแล้ว {checkedInCount} คน
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="h-9 inline-flex items-center gap-1.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มรายชื่อนักเรียน</span>
            </button>
          </div>
        </header>

        {/* Mobile Slide-Over Drawer */}
        {drawerOpen && (
          <div className="no-print fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[2px]"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white border-r border-zinc-200 flex flex-col justify-between p-4 shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center justify-center">
                      PK
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-zinc-900">อยุธยาสีชมพู</div>
                      <div className="text-[11px] text-zinc-500">Admin Studio</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="ปิดเมนู Admin"
                    className="p-2 rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = tab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setTab(item.id);
                          setDrawerOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer ${
                          active
                            ? 'bg-rose-50 text-rose-700 font-semibold'
                            : 'text-zinc-600 hover:bg-zinc-100/70'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${active ? 'text-rose-600' : 'text-zinc-400'}`} />
                          <span>{item.label}</span>
                        </span>
                        {item.badge !== undefined && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-semibold">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>

                <div className="pt-3 border-t border-zinc-100 space-y-1">
                  <Link
                    href="/"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100/70"
                  >
                    <Home className="w-4 h-4 text-zinc-400" />
                    <span>หน้าหลักคณะสี</span>
                  </Link>
                  <a
                    href="/shop"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100/70"
                  >
                    <Shirt className="w-4 h-4 text-zinc-400" />
                    <span>เว็บสั่งจองเสื้อ (/shop)</span>
                  </a>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full min-h-[42px] rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold cursor-pointer"
              >
                ออกจากระบบ Admin
              </button>
            </aside>
          </div>
        )}

        {/* Main Content Container */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-12 space-y-5">
          {feedback &&
            (feedback.type === 'success' ? (
              <SuccessBanner message={feedback.message} />
            ) : (
              <ErrorState message={feedback.message} />
            ))}

          {/* ================= TAB 1: OVERVIEW ================= */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* 4 KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                  <div className="text-xs font-medium text-zinc-500">สมาชิกทั้งหมด</div>
                  <div className="mt-1.5 font-display font-semibold text-2xl sm:text-3xl text-zinc-900 tabular-nums">
                    {students.length}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    {stats?.sourceMode === 'supabase' ? 'Supabase DB' : 'ซิงก์ Google Sheets'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTab('checkin')}
                  className="text-left bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-rose-300 transition-colors cursor-pointer"
                >
                  <div className="text-xs font-medium text-zinc-500">เช็คชื่อแล้ว</div>
                  <div className="mt-1.5 font-display font-semibold text-2xl sm:text-3xl text-emerald-600 tabular-nums">
                    {checkedInCount}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">แตะเพื่อเปิดเช็คชื่อ</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTab('quotas')}
                  className="text-left bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-rose-300 transition-colors cursor-pointer"
                >
                  <div className="text-xs font-medium text-zinc-500">ฝ่ายงานหลัก</div>
                  <div className="mt-1.5 font-display font-semibold text-2xl sm:text-3xl text-rose-600 tabular-nums">
                    {departments.length}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">คลิกตั้งค่าโควตา</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTab('duplicates')}
                  className="text-left bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-rose-300 transition-colors cursor-pointer"
                >
                  <div className="text-xs font-medium text-zinc-500">รายการซ้ำซ้อน</div>
                  <div
                    className={`mt-1.5 font-display font-semibold text-2xl sm:text-3xl tabular-nums ${
                      dupeEntries.length > 0 ? 'text-amber-600' : 'text-zinc-900'
                    }`}
                  >
                    {dupeEntries.length}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">คลิกตรวจสอบรายชื่อ</div>
                </button>
              </div>

              {/* Grade Breakdown */}
              <section className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3.5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-semibold text-sm text-zinc-900">
                    สัดส่วนสมาชิกตามระดับชั้น (แตะเพื่อดูรายชื่อ)
                  </h2>
                  <button
                    type="button"
                    onClick={() => jumpToDirectory({})}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>ดูทั้งหมด</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                  {Object.entries(gradeCounts).map(([grade, count]) => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => jumpToDirectory({ grade })}
                      className="rounded-xl border border-zinc-200/80 bg-[#FAFAFB] hover:bg-rose-50 hover:border-rose-200 p-3 text-center transition-colors cursor-pointer"
                    >
                      <div className="text-xs font-medium text-zinc-500">{grade}</div>
                      <div className="mt-0.5 text-lg font-semibold text-zinc-900 tabular-nums">
                        {count}
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Department Roster & Quotas Summary */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-semibold text-sm text-zinc-900">
                    จำนวนสมาชิกและสถานะแต่ละฝ่ายงาน
                  </h2>
                  <button
                    type="button"
                    onClick={() => setTab('quotas')}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                  >
                    จัดการโควตา
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {departments.map((d) => {
                    const count = students.filter((s) => s.departmentName === d.name).length;
                    const max = d.maxCapacity;
                    const isFull = typeof max === 'number' && count >= max;
                    const pct =
                      typeof max === 'number' && max > 0
                        ? Math.min(100, Math.round((count / max) * 100))
                        : 100;

                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => jumpToDirectory({ dept: d.name })}
                        className="text-left bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-rose-300 transition-colors space-y-3 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold text-sm text-zinc-900">{d.name}</div>
                            <div className="text-xs text-zinc-500 mt-0.5 tabular-nums">
                              สมาชิก {count} คน{typeof max === 'number' ? ` / โควตา ${max}` : ''}
                            </div>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              d.isClosed || isFull
                                ? 'bg-red-50 text-red-700 border border-red-200/70'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                            }`}
                          >
                            {d.isClosed ? 'ปิดรับ' : isFull ? 'เต็ม' : 'เปิดรับ'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              d.isClosed || isFull ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* ================= TAB 2: DIRECTORY (MOBILE CARDS + DESKTOP TABLE) ================= */}
          {tab === 'directory' && (
            <div className="space-y-4">
              {/* Minimal Search & Filters Card */}
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display font-semibold text-base text-zinc-900">
                      รายชื่อสมาชิกคณะสีชมพู
                    </h2>
                    <p className="text-xs text-zinc-500 tabular-nums">
                      แสดง {filteredStudents.length} จากทั้งหมด {students.length} คน
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>เพิ่มนักเรียน</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="ค้นหาชื่อ, ชื่อเล่น, รหัส..."
                      className="w-full h-10 pl-9 pr-3 rounded-xl border border-zinc-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 outline-none text-sm bg-white"
                    />
                  </div>

                  <select
                    value={gradeFilter}
                    onChange={(e) => {
                      setGradeFilter(e.target.value);
                      setRoomFilter('ALL');
                    }}
                    className="h-10 px-3 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-xs font-medium bg-white text-zinc-700"
                  >
                    <option value="ALL">ทุกระดับชั้น (ม.1 – ม.6)</option>
                    {GRADES.map((g) => (
                      <option key={g.grade} value={g.grade}>
                        ระดับชั้น {g.grade}
                      </option>
                    ))}
                  </select>

                  <select
                    value={roomFilter}
                    onChange={(e) => setRoomFilter(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-xs font-medium bg-white text-zinc-700"
                  >
                    <option value="ALL">ทุกห้องเรียน ({availableRooms.length} ห้อง)</option>
                    {availableRooms.map((r) => (
                      <option key={r} value={r}>
                        ห้อง {r}
                      </option>
                    ))}
                  </select>

                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-xs font-medium bg-white text-zinc-700"
                  >
                    <option value="ALL">ทุกฝ่ายงาน</option>
                    <option value="CENTRAL">คณะกรรมการบริหารส่วนกลาง</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Empty State */}
              {filteredStudents.length === 0 ? (
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-10 text-center space-y-2">
                  <Users className="w-8 h-8 text-zinc-300 mx-auto" />
                  <div className="font-medium text-sm text-zinc-900">ไม่พบรายชื่อที่ตรงกับตัวกรอง</div>
                  <p className="text-xs text-zinc-500">
                    ลองล้างคำค้นหา หรือเปลี่ยนระดับชั้น/ห้องเรียน/ฝ่ายงาน
                  </p>
                </div>
              ) : (
                <>
                  {/* MOBILE-FIRST CARD LIST (< 768px) */}
                  <div className="md:hidden space-y-3" data-testid="admin-mobile-cards">
                    {filteredStudents.map((s) => {
                      const isCentral = s.roleCategory === 'central';
                      const roleText = isCentral
                        ? `คณะกรรมการกลาง · ${s.centralPosition || s.position}`
                        : `${s.departmentName || '-'}${s.sportType ? ` (${s.sportType})` : ''} · ${s.position}`;

                      return (
                        <div
                          key={s.id}
                          className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 text-rose-700 font-semibold text-sm flex items-center justify-center shrink-0">
                                {getInitialChar(s.fullName)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-sm text-zinc-900 truncate">
                                  {s.fullName}
                                </div>
                                <div className="text-xs text-zinc-500 truncate">
                                  {s.nickname ? `ชื่อเล่น ${s.nickname}` : 'ไม่ระบุชื่อเล่น'}
                                  {s.studentCode ? ` · รหัส ${s.studentCode}` : ''}
                                </div>
                              </div>
                            </div>
                            <span className="shrink-0 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 text-[11px] font-semibold tabular-nums whitespace-nowrap">
                              {s.classRoom} · {s.numberLabel}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                                isCentral
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200/70'
                                  : 'bg-zinc-50 text-zinc-700 border border-zinc-200/70'
                              }`}
                            >
                              <Building2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span>{roleText}</span>
                            </span>
                          </div>

                          <div className="pt-2.5 border-t border-zinc-100 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingStudent(s)}
                              className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>แก้ไข / ย้ายฝ่าย</span>
                            </button>
                            <button
                              type="button"
                              aria-label={`ลบ ${s.fullName}`}
                              onClick={() => handleDeleteStudent(s.id, s.fullName)}
                              className="min-h-[38px] px-3 inline-flex items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* DESKTOP NOTION-STYLE TABLE (>= 768px) */}
                  <div
                    className="hidden md:block bg-white border border-zinc-200/80 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden"
                    data-testid="admin-desktop-table"
                  >
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50/80 text-zinc-500 border-b border-zinc-200/80">
                        <tr>
                          <th className="py-3 px-4 font-semibold">ชื่อ-นามสกุล</th>
                          <th className="py-3 px-4 font-semibold">ห้อง · เลขที่</th>
                          <th className="py-3 px-4 font-semibold">ฝ่ายงาน / ตำแหน่ง</th>
                          <th className="py-3 px-4 font-semibold text-right">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {filteredStudents.map((s) => {
                          const isCentral = s.roleCategory === 'central';
                          return (
                            <tr key={s.id} className="hover:bg-rose-50/30 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-700 font-semibold text-xs flex items-center justify-center shrink-0">
                                    {getInitialChar(s.fullName)}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-sm text-zinc-900">
                                      {s.fullName}{' '}
                                      {s.nickname && (
                                        <span className="font-normal text-zinc-500">
                                          ({s.nickname})
                                        </span>
                                      )}
                                    </div>
                                    {s.studentCode && (
                                      <div className="text-[11px] text-zinc-400 tabular-nums">
                                        รหัส {s.studentCode}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 font-medium tabular-nums">
                                  {s.classRoom} · {s.numberLabel}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {isCentral ? (
                                  <span className="inline-flex px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/70 font-semibold">
                                    คณะกรรมการกลาง · {s.centralPosition || s.position}
                                  </span>
                                ) : (
                                  <span className="text-zinc-700">
                                    <strong className="text-zinc-900">{s.departmentName || '-'}</strong>
                                    {s.sportType ? ` (${s.sportType})` : ''} · {s.position}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingStudent(s)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:border-rose-300 hover:text-rose-700 font-medium transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>แก้ไข</span>
                                </button>
                                <button
                                  type="button"
                                  aria-label={`ลบ ${s.fullName}`}
                                  onClick={() => handleDeleteStudent(s.id, s.fullName)}
                                  className="inline-flex items-center justify-center p-1.5 rounded-lg border border-zinc-200 text-zinc-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ================= TAB 3: EVENT CHECK-IN ================= */}
          {tab === 'checkin' && (
            <div className="space-y-4">
              <form
                onSubmit={handleCreateSession}
                className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-wrap items-end gap-3"
              >
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    เปิดรอบเช็คชื่อใหม่
                  </label>
                  <input
                    type="text"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    placeholder="เช่น ซ้อมสแตนเชียร์วันจริงช่วงเช้า"
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">วันที่</label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
                >
                  สร้างรอบใหม่
                </button>
              </form>

              <CheckInWorkspace
                initialStudents={students}
                sessions={sessions}
                activeSession={activeSession}
                departments={departments}
                profile={profile}
                sourceMode={stats?.sourceMode || 'legacy-readonly'}
              />
            </div>
          )}

          {/* ================= TAB 4: DUPLICATES ================= */}
          {tab === 'duplicates' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-semibold text-base text-zinc-900">
                    ศูนย์ตรวจสอบรายชื่อซ้ำซ้อน
                  </h2>
                  <p className="text-xs text-zinc-500">
                    พบรายการซ้ำ {dupeEntries.length} คน สามารถกด &quot;คงฝ่ายนี้&quot; เพื่อเก็บสิทธิ์ที่ถูกต้อง
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => reloadAll(true)}
                  className="h-9 px-3.5 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  รีเฟรชข้อมูล
                </button>
              </div>

              {dupeEntries.length === 0 ? (
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-10 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="font-semibold text-sm text-zinc-900">ไม่พบรายการซ้ำซ้อน</div>
                  <p className="text-xs text-zinc-500">
                    สมาชิกทุกคนมีรายชื่ออยู่เพียงฝ่ายเดียวอย่างถูกต้อง
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dupeEntries.map(([key, records]) => {
                    const first = records[0];
                    return (
                      <div
                        key={key}
                        className="bg-white border border-zinc-200/80 border-l-4 border-l-amber-500 rounded-2xl p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-sm text-zinc-900">
                              {first.fullName} {first.nickname ? `(${first.nickname})` : ''}
                            </div>
                            <div className="text-xs text-zinc-500 tabular-nums">
                              ห้อง {first.classRoom} · เลขที่ {first.numberLabel}
                            </div>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                            ซ้ำ {records.length} รายการ
                          </span>
                        </div>
                        <div className="space-y-2">
                          {records.map((rec) => (
                            <div
                              key={rec.id}
                              className="flex items-center justify-between gap-3 bg-[#FAFAFB] border border-zinc-200/70 rounded-xl px-3.5 py-2.5 text-xs"
                            >
                              <div>
                                <div className="font-semibold text-zinc-900">
                                  {rec.roleCategory === 'central'
                                    ? rec.centralPosition || rec.position
                                    : `${rec.department || '-'}${rec.sportType ? ` (${rec.sportType})` : ''} · ${rec.position}`}
                                </div>
                                <div className="text-[11px] text-zinc-500 tabular-nums">
                                  {rec.timestamp
                                    ? new Date(rec.timestamp).toLocaleString('th-TH')
                                    : 'ไม่ระบุเวลา'}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleResolveDuplicate(key, rec)}
                                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shrink-0"
                              >
                                คงฝ่ายนี้
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 5: QUOTAS ================= */}
          {tab === 'quotas' && (
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
              <div>
                <h2 className="font-display font-semibold text-base text-zinc-900">
                  ตั้งค่าโควตาและสถานะรายฝ่ายงาน
                </h2>
                <p className="text-xs text-zinc-500">
                  กำหนดจำนวนคนสูงสุดหรือสลับสถานะเปิด/ปิดของแต่ละฝ่ายงาน
                </p>
              </div>
              <div className="divide-y divide-zinc-100">
                {departments.map((d) => {
                  const count = students.filter((s) => s.departmentName === d.name).length;
                  return (
                    <div
                      key={d.id}
                      className="py-3.5 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-sm text-zinc-900">{d.name}</div>
                        <div className="text-xs text-zinc-500 tabular-nums">
                          สมาชิกปัจจุบัน {count} คน
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-zinc-500 flex items-center gap-2">
                          โควตา:
                          <input
                            type="number"
                            min={1}
                            placeholder="ไม่จำกัด"
                            defaultValue={d.maxCapacity ?? ''}
                            onBlur={(e) => {
                              const raw = e.target.value.trim();
                              const nextVal = raw === '' ? null : parseInt(raw, 10);
                              if (nextVal !== d.maxCapacity) {
                                handleUpdateDepartment(d.id, {
                                  maxCapacity: Number.isNaN(nextVal) ? null : nextVal,
                                });
                              }
                            }}
                            className="w-24 h-9 px-2.5 rounded-xl border border-zinc-200 text-center text-sm tabular-nums outline-none focus:border-rose-500"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleUpdateDepartment(d.id, { isClosed: !d.isClosed })}
                          className={`h-9 px-3.5 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                            d.isClosed
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {d.isClosed ? 'ปิดอยู่ (แตะเปิด)' : 'เปิดอยู่ (แตะปิด)'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= TAB 6: POLICIES, PIN & EXCEL ================= */}
          {tab === 'policies' && (
            <div className="space-y-4">
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3">
                <h2 className="font-display font-semibold text-base text-zinc-900">
                  กฎการจัดการข้อมูลคณะสี
                </h2>
                <div className="divide-y divide-zinc-100">
                  {(
                    [
                      {
                        key: 'strictOnePerson',
                        title: 'ล็อกสิทธิ์ 1 คนต่อ 1 ฝ่ายงาน (Strict 1-Person Policy)',
                        desc: 'ป้องกันไม่ให้มีรายชื่อห้องและเลขที่เดียวกันอยู่ข้ามฝ่าย',
                      },
                      {
                        key: 'lockM1Registration',
                        title: 'จัดน้อง ม.1 ประจำฝ่ายสแตนเชียร์อัตโนมัติ',
                        desc: 'ระบุฝ่ายสแตนเชียร์เป็นค่าตั้งต้นสำหรับนักเรียนชั้น ม.1',
                      },
                      {
                        key: 'm1StandOnly',
                        title: 'สงวนสิทธิ์ฝ่ายสแตนเชียร์เฉพาะ ม.1',
                        desc: 'แสดงสถานะฝ่ายสแตนเชียร์สำหรับน้อง ม.1 เป็นหลัก',
                      },
                    ] as const
                  ).map((item) => {
                    const enabled = policies[item.key];
                    return (
                      <div
                        key={item.key}
                        className="py-3.5 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="font-semibold text-sm text-zinc-900">{item.title}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">{item.desc}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTogglePolicy(item.key, !enabled)}
                          className={`h-9 px-3.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                            enabled
                              ? 'bg-emerald-600 text-white'
                              : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                          }`}
                        >
                          {enabled ? 'เปิดใช้งาน' : 'ปิดอยู่'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form
                  onSubmit={handleUpdatePin}
                  className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3"
                >
                  <div className="font-semibold text-sm text-zinc-900">เปลี่ยนรหัส PIN Admin</div>
                  <p className="text-xs text-zinc-500">
                    รหัส PIN ปัจจุบัน: <strong className="text-rose-600">{pinDisplay}</strong>
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="กรอก PIN 4 หลักใหม่"
                      className="flex-1 h-10 px-3 rounded-xl border border-zinc-200 text-sm outline-none focus:border-rose-500"
                      required
                    />
                    <button
                      type="submit"
                      className="h-10 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      บันทึก PIN
                    </button>
                  </div>
                </form>

                <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm text-zinc-900">ส่งออกรายงาน Excel (.xlsx)</div>
                    <p className="text-xs text-zinc-500 mt-1">
                      ดาวน์โหลดรายชื่อทั้งหมด สรุปตามห้อง ฝ่าย และประวัติเช็คชื่อ 5 ชีต
                    </p>
                  </div>
                  <a
                    href="/api/admin/export-excel"
                    className="h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลดไฟล์ Excel (.xlsx)</span>
                  </a>
                </div>
              </div>

              {auditLogs.length > 0 && (
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-2.5">
                  <div className="font-semibold text-sm text-zinc-900">ประวัติการแก้ไขล่าสุด</div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-zinc-100 text-xs">
                    {auditLogs.slice(0, 20).map((log) => (
                      <div key={log.id} className="py-2.5 flex items-center justify-between gap-2">
                        <span className="font-medium text-zinc-800">
                          {log.action} · {log.actorName || 'System'}
                        </span>
                        <span className="text-zinc-400 tabular-nums shrink-0">
                          {new Date(log.createdAt).toLocaleString('th-TH')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ================= MOBILE FIXED BOTTOM TAB BAR ================= */}
      <nav
        aria-label="แถบนำทาง Admin มือถือ"
        className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200/80 grid grid-cols-4 h-16"
      >
        {mobileBottomItems.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
                active ? 'text-rose-600 font-semibold' : 'text-zinc-500'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={active ? 2 : 1.75} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ================= ADD STUDENT MODAL ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center sm:p-4">
          <form
            onSubmit={handleAddStudent}
            className="motion-enter w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-zinc-200 p-5 sm:p-6 space-y-3.5 shadow-2xl max-h-[90dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-display font-semibold text-base text-zinc-900">
                เพิ่มรายชื่อนักเรียนใหม่
              </h3>
              <button
                type="button"
                aria-label="ปิดหน้าต่างเพิ่มนักเรียน"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                  ชื่อ-นามสกุล *
                </label>
                <input
                  type="text"
                  placeholder="ระบุชื่อ-นามสกุล"
                  value={newStudent.fullName}
                  onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">ชื่อเล่น</label>
                <input
                  type="text"
                  placeholder="ชื่อเล่น"
                  value={newStudent.nickname}
                  onChange={(e) => setNewStudent({ ...newStudent, nickname: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">ห้องเรียน</label>
                <select
                  value={newStudent.classRoom}
                  onChange={(e) => setNewStudent({ ...newStudent, classRoom: e.target.value })}
                  className="w-full h-10 px-2.5 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm bg-white"
                >
                  {ALL_ROOMS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">เลขที่</label>
                <select
                  value={newStudent.numberLabel}
                  onChange={(e) => setNewStudent({ ...newStudent, numberLabel: e.target.value })}
                  className="w-full h-10 px-2.5 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm bg-white"
                >
                  {NUMBERS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">รหัส (ถ้ามี)</label>
                <input
                  type="text"
                  placeholder="69001"
                  value={newStudent.studentCode}
                  onChange={(e) => setNewStudent({ ...newStudent, studentCode: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">หมวดบทบาท</label>
                <select
                  value={newStudent.roleCategory}
                  onChange={(e) =>
                    setNewStudent({
                      ...newStudent,
                      roleCategory: e.target.value as 'department' | 'central',
                    })
                  }
                  className="w-full h-10 px-2.5 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm bg-white"
                >
                  <option value="department">คณะทำงานฝ่าย (8 ฝ่าย)</option>
                  <option value="central">คณะกรรมการส่วนกลาง</option>
                </select>
              </div>

              {newStudent.roleCategory === 'central' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                    ตำแหน่งส่วนกลาง
                  </label>
                  <select
                    value={newStudent.centralPosition}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, centralPosition: e.target.value })
                    }
                    className="w-full h-10 px-2.5 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm bg-white"
                  >
                    {CENTRAL_POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 mb-1">ฝ่ายงาน</label>
                  <select
                    value={newStudent.departmentName}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, departmentName: e.target.value })
                    }
                    className="w-full h-10 px-2.5 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {newStudent.roleCategory === 'department' && (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                    ตำแหน่งในฝ่าย
                  </label>
                  <select
                    value={newStudent.position}
                    onChange={(e) => setNewStudent({ ...newStudent, position: e.target.value })}
                    className="w-full h-10 px-2.5 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm bg-white"
                  >
                    <option value="ประธานฝ่าย">ประธานฝ่าย</option>
                    <option value="รองประธานฝ่ายสวัสดิการ">รองประธานฝ่ายสวัสดิการ</option>
                    <option value="สตาฟฝ่าย">สตาฟฝ่าย</option>
                    <option value="สมาชิกฝ่าย">สมาชิกฝ่าย</option>
                    <option value="หัวหน้ากีฬา">หัวหน้ากีฬา</option>
                    <option value="สตาฟกีฬา">สตาฟกีฬา</option>
                    <option value="นักกีฬา">นักกีฬา</option>
                  </select>
                </div>
                {newStudent.departmentName === 'ฝ่ายกีฬา' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                      ประเภทกีฬา
                    </label>
                    <select
                      value={newStudent.sportType}
                      onChange={(e) => setNewStudent({ ...newStudent, sportType: e.target.value })}
                      className="w-full h-10 px-2.5 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm bg-white"
                    >
                      {SPORT_TYPES.map((sp) => (
                        <option key={sp} value={sp}>
                          {sp}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              บันทึกนักเรียนใหม่
            </button>
          </form>
        </div>
      )}

      {/* ================= EDIT STUDENT MODAL ================= */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center sm:p-4">
          <form
            onSubmit={handleSaveEditStudent}
            className="motion-enter w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-zinc-200 p-5 sm:p-6 space-y-3.5 shadow-2xl max-h-[90dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-display font-semibold text-base text-zinc-900">
                แก้ไขข้อมูลและฝ่ายงานนักเรียน
              </h3>
              <button
                type="button"
                aria-label="ปิดหน้าต่างแก้ไขนักเรียน"
                onClick={() => setEditingStudent(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                  ชื่อ-นามสกุล *
                </label>
                <input
                  type="text"
                  value={editingStudent.fullName}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, fullName: e.target.value })
                  }
                  placeholder="ชื่อ-นามสกุล *"
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">ชื่อเล่น</label>
                <input
                  type="text"
                  value={editingStudent.nickname}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, nickname: e.target.value })
                  }
                  placeholder="ชื่อเล่น"
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">ห้องเรียน</label>
                <select
                  value={editingStudent.classRoom}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, classRoom: e.target.value })
                  }
                  className="w-full h-10 px-2.5 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm bg-white"
                >
                  {ALL_ROOMS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">เลขที่</label>
                <select
                  value={editingStudent.numberLabel}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, numberLabel: e.target.value })
                  }
                  className="w-full h-10 px-2.5 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm bg-white"
                >
                  {NUMBERS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">รหัส</label>
                <input
                  type="text"
                  value={editingStudent.studentCode || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, studentCode: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                  ฝ่ายงาน / ส่วนกลาง
                </label>
                <select
                  value={
                    editingStudent.roleCategory === 'central'
                      ? '__CENTRAL__'
                      : editingStudent.departmentName || departments[0]?.name || ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__CENTRAL__') {
                      setEditingStudent({
                        ...editingStudent,
                        roleCategory: 'central',
                        departmentName: null,
                        centralPosition: editingStudent.centralPosition || CENTRAL_POSITIONS[0],
                        position: editingStudent.centralPosition || CENTRAL_POSITIONS[0],
                      });
                    } else {
                      setEditingStudent({
                        ...editingStudent,
                        roleCategory: 'department',
                        departmentName: val,
                        centralPosition: null,
                      });
                    }
                  }}
                  className="w-full h-10 px-2.5 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm bg-white"
                >
                  <option value="__CENTRAL__">คณะกรรมการบริหารส่วนกลาง</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {editingStudent.roleCategory === 'central' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                    ตำแหน่งส่วนกลาง
                  </label>
                  <select
                    value={editingStudent.centralPosition || editingStudent.position}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        centralPosition: e.target.value,
                        position: e.target.value,
                      })
                    }
                    className="w-full h-10 px-2.5 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm bg-white"
                  >
                    {CENTRAL_POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                    ตำแหน่งในฝ่าย
                  </label>
                  <input
                    type="text"
                    list="admin-role-suggestions"
                    value={editingStudent.position}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, position: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm"
                    required
                  />
                  <datalist id="admin-role-suggestions">
                    <option value="ประธานฝ่าย" />
                    <option value="รองประธานฝ่ายสวัสดิการ" />
                    <option value="สตาฟฝ่าย" />
                    <option value="สมาชิกฝ่าย" />
                    <option value="หัวหน้ากีฬา" />
                    <option value="สตาฟกีฬา" />
                    <option value="นักกีฬา" />
                  </datalist>
                </div>
              )}
            </div>

            {editingStudent.roleCategory === 'department' &&
              editingStudent.departmentName === 'ฝ่ายกีฬา' && (
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                    ประเภทกีฬา
                  </label>
                  <select
                    value={editingStudent.sportType || SPORT_TYPES[0]}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, sportType: e.target.value })
                    }
                    className="w-full h-10 px-2.5 rounded-xl border border-zinc-200 focus:border-rose-500 outline-none text-sm bg-white"
                  >
                    {SPORT_TYPES.map((sp) => (
                      <option key={sp} value={sp}>
                        {sp}
                      </option>
                    ))}
                  </select>
                </div>
              )}

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              บันทึกการแก้ไข
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
