'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ClipboardCheck,
  CopyCheck,
  Download,
  Edit3,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Shield,
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
  | 'checkin'
  | 'directory'
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

  // Change PIN modal/input
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

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return students.filter((s) => {
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
  }, [students, studentSearch, roomFilter, deptFilter]);

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
    setFeedback({ type: 'success', message: 'เพิ่มนักเรียนเรียบร้อยแล้ว' });
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

  // ===================== STANDALONE PIN GATE SCREEN =====================
  if (!initialAuthenticated) {
    return (
      <div className="min-h-dvh bg-[#F8FAFC] text-[#0F172A] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white border border-[#CBD5E1] rounded-xl p-7 text-center shadow-sm space-y-5">
          <div className="w-12 h-12 rounded-xl bg-[#BE185D] text-white font-display font-bold text-lg flex items-center justify-center mx-auto">
            PK
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-[#0F172A]">
              เข้าสู่ระบบ Admin อยุธยาสีชมพู
            </h1>
            <p className="text-xs text-[#64748B] mt-1">
              ใส่รหัส PIN 4 หลักเพื่อเข้าสู่ศูนย์ควบคุมผู้ดูแลระบบ
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
                className="w-12 h-14 text-center text-xl font-bold border-2 border-[#CBD5E1] focus:border-[#BE185D] rounded-lg bg-white text-[#0F172A] outline-none"
              />
            ))}
          </div>

          <button
            type="button"
            disabled={pinBusy}
            onClick={() => submitPin('2569')}
            className="w-full min-h-[38px] rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-medium text-[#334155] cursor-pointer"
          >
            กรอก PIN ทดสอบ (2569)
          </button>

          <Link
            href="/"
            className="block w-full min-h-[40px] leading-[40px] rounded-lg border border-[#CBD5E1] text-xs font-medium text-[#334155] hover:bg-[#F8FAFC] cursor-pointer"
          >
            กลับสู่หน้านักเรียนทั่วไป
          </Link>
        </div>
      </div>
    );
  }

  // ===================== STANDALONE ADMIN DASHBOARD SHELL =====================
  const navItems: Array<{
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    badge?: number;
  }> = [
    { id: 'overview', label: 'ภาพรวมสรุปผล', icon: LayoutGrid },
    { id: 'checkin', label: 'เช็คชื่อวันงาน', icon: ClipboardCheck },
    { id: 'directory', label: 'รายชื่อนักเรียนทั้งหมด', icon: Users },
    {
      id: 'duplicates',
      label: 'คัดกรองคนลงซ้ำ',
      icon: CopyCheck,
      badge: dupeEntries.length > 0 ? dupeEntries.length : undefined,
    },
    { id: 'quotas', label: 'เปิด/ปิดรับ & โควตา', icon: Sliders },
    { id: 'policies', label: 'นโยบาย, PIN & Excel', icon: Shield },
  ];

  const activeSession = sessions.find((s) => s.isActive) || sessions[0] || null;
  const checkedInCount = students.filter((s) => s.checkedIn).length;

  return (
    <div className="min-h-dvh bg-[#F8FAFC] text-[#0F172A]">
      {/* Standalone Admin Sticky Header */}
      <header className="no-print sticky top-0 z-40 bg-white border-b-2 border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="เปิดเมนู Admin"
              className="lg:hidden w-9 h-9 rounded-lg border border-[#CBD5E1] flex items-center justify-center text-[#334155] hover:bg-[#F1F5F9] cursor-pointer"
            >
              <Menu className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <div className="w-8 h-8 rounded-lg bg-[#BE185D] text-white font-display font-bold text-xs flex items-center justify-center shrink-0">
              PK
            </div>
            <div className="min-w-0">
              <div className="font-display font-bold text-sm text-[#0F172A] truncate">
                อยุธยาสีชมพู 2569 · ศูนย์ควบคุม Admin
              </div>
              <div className="text-[11px] text-[#64748B] truncate tabular-nums">
                สมาชิก {students.length} คน · เช็คชื่อ {checkedInCount} คน
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/"
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-medium text-[#334155] hover:bg-[#F1F5F9] cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">หน้านักเรียน</span>
            </Link>
            <button
              type="button"
              onClick={() => reloadAll(true)}
              disabled={refreshing}
              aria-label="รีเฟรชข้อมูล"
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-medium text-[#334155] hover:bg-[#F1F5F9] cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
                strokeWidth={1.5}
              />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs font-medium text-[#B91C1C] hover:bg-[#FEE2E2] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">ออก</span>
            </button>
          </div>
        </div>

        {/* Desktop Admin Sub-navigation */}
        <div className="hidden lg:block bg-[#F1F5F9] border-t border-[#E2E8F0]">
          <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 overflow-x-auto py-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                    active
                      ? 'bg-[#BE185D] text-white'
                      : 'text-[#334155] hover:bg-white'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[10px] font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Mobile Slide-Out Drawer (matching admin.html) */}
      {drawerOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/45"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white border-r border-[#CBD5E1] flex flex-col justify-between p-4 shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#BE185D] text-white font-bold text-xs flex items-center justify-center">
                    PK
                  </div>
                  <div>
                    <div className="font-bold text-sm">อยุธยาสีชมพู</div>
                    <div className="text-[11px] text-[#64748B]">Admin Menu</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="ปิดเมนู Admin"
                  className="p-1.5 rounded-lg border border-[#CBD5E1] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="mt-3 space-y-1">
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
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        active
                          ? 'bg-[#FDF2F8] text-[#BE185D] border-l-4 border-[#BE185D]'
                          : 'text-[#334155] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" strokeWidth={1.5} />
                        {item.label}
                      </span>
                      {item.badge !== undefined && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[10px]">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full min-h-[40px] rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs font-semibold cursor-pointer"
            >
              ออกจากระบบ Admin
            </button>
          </aside>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-4">
        {feedback &&
          (feedback.type === 'success' ? (
            <SuccessBanner message={feedback.message} />
          ) : (
            <ErrorState message={feedback.message} />
          ))}

        {/* TAB 1: OVERVIEW (matching PinkAdmin.renderDashboard) */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
                <div className="text-xs font-semibold text-[#64748B]">ผู้ลงทะเบียนทั้งหมด</div>
                <div className="mt-1 text-2xl font-extrabold text-[#0F172A] tabular-nums">
                  {students.length} <span className="text-sm font-medium text-[#64748B]">คน</span>
                </div>
                <div className="text-[11px] text-[#64748B] mt-1">
                  {stats?.sourceMode === 'supabase' ? 'ฐานข้อมูล Supabase' : 'ซิงก์สดจาก Google Sheets'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTab('duplicates')}
                className="text-left bg-white border border-[#E2E8F0] rounded-xl p-4 hover:border-[#BE185D] cursor-pointer"
              >
                <div className="text-xs font-semibold text-[#64748B]">พบลงทะเบียนซ้ำ</div>
                <div
                  className={`mt-1 text-2xl font-extrabold tabular-nums ${
                    dupeEntries.length > 0 ? 'text-amber-600' : 'text-[#047857]'
                  }`}
                >
                  {dupeEntries.length}{' '}
                  <span className="text-sm font-medium text-[#64748B]">คน</span>
                </div>
                <div className="text-[11px] text-[#64748B] mt-1">
                  {dupeEntries.length > 0 ? 'กดเพื่อไปจัดการคนลงซ้ำ' : 'ข้อมูลสมบูรณ์'}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setTab('checkin')}
                className="col-span-2 lg:col-span-1 text-left bg-white border border-[#E2E8F0] rounded-xl p-4 hover:border-[#BE185D] cursor-pointer"
              >
                <div className="text-xs font-semibold text-[#64748B]">เช็คชื่อรอบปัจจุบัน</div>
                <div className="mt-1 text-2xl font-extrabold text-[#BE185D] tabular-nums">
                  {checkedInCount}{' '}
                  <span className="text-sm font-medium text-[#64748B]">/ {students.length} คน</span>
                </div>
                <div className="text-[11px] text-[#64748B] mt-1 truncate">
                  {activeSession?.title || 'รอบหลัก'}
                </div>
              </button>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-2.5">
              <div className="text-xs font-bold text-[#64748B]">สัดส่วนจำนวนนักเรียนรายชั้น</div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {Object.entries(gradeCounts).map(([grade, count]) => (
                  <div
                    key={grade}
                    className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg p-2.5 text-center"
                  >
                    <div className="text-xs text-[#64748B]">{grade}</div>
                    <div className="text-lg font-extrabold text-[#0F172A] tabular-nums">
                      {count}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-[#0F172A]">สถานะโควตารายฝ่ายงาน</h2>
              <button
                type="button"
                onClick={() => setTab('quotas')}
                className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-[#334155] cursor-pointer"
              >
                ปรับแต่งโควตา
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {departments.map((d) => {
                const count = students.filter((s) => s.departmentName === d.name).length;
                const max = d.maxCapacity;
                const isFull = typeof max === 'number' && count >= max;
                const pct =
                  typeof max === 'number' && max > 0
                    ? Math.min(100, Math.round((count / max) * 100))
                    : 100;
                const badgeText = d.isClosed
                  ? 'ปิดรับชั่วคราว'
                  : isFull
                    ? 'เต็มโควตา'
                    : 'เปิดรับ';
                const badgeCls =
                  d.isClosed || isFull
                    ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                    : 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]';
                const barColor =
                  d.isClosed || isFull
                    ? '#EF4444'
                    : typeof max === 'number' && pct > 80
                      ? '#F59E0B'
                      : '#10B981';

                return (
                  <div key={d.id} className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-[#0F172A]">{d.name}</div>
                        <div className="text-xs text-[#64748B]">
                          {typeof max === 'number' ? `โควตา: ${max} คน` : 'ไม่จำกัดโควตา'}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${badgeCls}`}>
                        {badgeText}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded bg-[#F1F5F9] overflow-hidden">
                      <div className="h-full" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#64748B] tabular-nums">
                      <span>ลงทะเบียนแล้ว {count} คน</span>
                      <span>
                        {typeof max === 'number'
                          ? `เหลือ ${Math.max(0, max - count)} ที่ (${pct}%)`
                          : 'ไม่จำกัด'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: EVENT CHECK-IN WORKSPACE */}
        {tab === 'checkin' && (
          <div className="space-y-4">
            <form
              onSubmit={handleCreateSession}
              className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-wrap items-end gap-3"
            >
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  เปิดรอบเช็คชื่อใหม่ (เช่น ซ้อมวันจริงช่วงเช้า)
                </label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="ชื่อรอบเช็คชื่อ"
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">วันที่</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                className="min-h-[38px] px-4 py-1.5 rounded-lg bg-[#BE185D] text-white text-xs font-semibold cursor-pointer"
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

        {/* TAB 3: STUDENT DIRECTORY & CRUD */}
        {tab === 'directory' && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-base text-[#0F172A]">
                  จัดการรายชื่อสมาชิกคณะสีชมพู ({filteredStudents.length} / {students.length} คน)
                </h2>
                <p className="text-xs text-[#64748B]">
                  เพิ่ม ลบ แก้ไขชื่อ-นามสกุล ย้ายห้องเรียน หรือย้ายฝ่ายงาน/ตำแหน่ง/ชนิดกีฬาของนักเรียนได้ทุกส่วน
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="ค้นหาชื่อ, ห้อง, เลขที่ หรือฝ่าย"
                    className="min-h-[38px] pl-9 pr-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm w-52"
                  />
                </div>
                <select
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-medium bg-white"
                >
                  <option value="ALL">ทุกห้องเรียน ({ALL_ROOMS.length} ห้อง)</option>
                  {ALL_ROOMS.map((r) => (
                    <option key={r} value={r}>
                      ห้อง {r}
                    </option>
                  ))}
                </select>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-medium bg-white"
                >
                  <option value="ALL">ทุกฝ่ายงาน</option>
                  <option value="CENTRAL">คณะกรรมการบริหารส่วนกลาง</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#BE185D] text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มนักเรียน
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F1F5F9] text-[#0F172A] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="py-2.5 px-3">ชื่อ-นามสกุล</th>
                    <th className="py-2.5 px-3">ห้อง</th>
                    <th className="py-2.5 px-3">เลขที่</th>
                    <th className="py-2.5 px-3">ฝ่ายงาน / ตำแหน่ง</th>
                    <th className="py-2.5 px-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-3 font-medium text-[#0F172A]">
                        {s.fullName}{' '}
                        {s.nickname && <span className="text-[#64748B]">({s.nickname})</span>}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums">{s.classRoom}</td>
                      <td className="py-2.5 px-3 tabular-nums">{s.numberLabel}</td>
                      <td className="py-2.5 px-3">
                        {s.roleCategory === 'central' ? (
                          <span className="font-semibold text-[#BE185D]">
                            คณะกรรมการกลาง · {s.centralPosition || s.position}
                          </span>
                        ) : (
                          <span>
                            <strong>{s.departmentName || '-'}</strong>
                            {s.sportType ? ` (${s.sportType})` : ''} · {s.position}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingStudent(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F1F5F9] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(s.id, s.fullName)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] cursor-pointer"
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

        {/* TAB 4: DUPLICATES RESOLUTION (matching PinkAdmin.renderDuplicates) */}
        {tab === 'duplicates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-[#0F172A]">
                  ศูนย์จัดการนักเรียนลงทะเบียนซ้ำซ้อน
                </h2>
                <p className="text-xs text-[#64748B]">
                  พบรายการซ้ำ {dupeEntries.length} คน สามารถกด &quot;คงฝ่ายนี้&quot; เพื่อเลือกสิทธิ์ที่ถูกต้อง
                </p>
              </div>
              <button
                type="button"
                onClick={() => reloadAll(true)}
                className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold cursor-pointer"
              >
                รีเฟรชข้อมูล
              </button>
            </div>

            {dupeEntries.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-10 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#047857] mx-auto" />
                <div className="font-bold text-base text-[#0F172A]">ไม่พบรายการลงทะเบียนซ้ำซ้อน</div>
                <p className="text-xs text-[#64748B]">
                  นักเรียนทุกคนในระบบลงทะเบียนเพียง 1 สิทธิ์ 1 ฝ่ายงานอย่างถูกต้อง
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dupeEntries.map(([key, records]) => {
                  const first = records[0];
                  return (
                    <div
                      key={key}
                      className="bg-white border border-[#E2E8F0] border-l-4 border-l-amber-500 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-[#0F172A]">
                            {first.fullName} {first.nickname ? `(${first.nickname})` : ''}
                          </div>
                          <div className="text-xs text-[#64748B] tabular-nums">
                            ห้อง {first.classRoom} · เลขที่ {first.numberLabel}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-800 text-xs font-bold">
                          ลงซ้ำ {records.length} รายการ
                        </span>
                      </div>
                      <div className="space-y-2">
                        {records.map((rec) => (
                          <div
                            key={rec.id}
                            className="flex items-center justify-between gap-3 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs"
                          >
                            <div>
                              <div className="font-semibold text-[#0F172A]">
                                {rec.roleCategory === 'central'
                                  ? rec.centralPosition || rec.position
                                  : `${rec.department || '-'}${rec.sportType ? ` (${rec.sportType})` : ''} · ${rec.position}`}
                              </div>
                              <div className="text-[11px] text-[#64748B] tabular-nums">
                                {rec.timestamp
                                  ? new Date(rec.timestamp).toLocaleString('th-TH')
                                  : 'ไม่ระบุเวลา'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleResolveDuplicate(key, rec)}
                              className="px-3 py-1.5 rounded-lg bg-[#BE185D] text-white text-xs font-semibold cursor-pointer shrink-0"
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

        {/* TAB 5: QUOTAS CONTROL */}
        {tab === 'quotas' && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 space-y-3">
            <div>
              <h2 className="font-bold text-base text-[#0F172A]">
                ตั้งค่าโควตาและการเปิด/ปิดรับสมัครรายฝ่าย
              </h2>
              <p className="text-xs text-[#64748B]">
                การเปลี่ยนแปลงมีผลทันทีกับหน้าลงทะเบียนของนักเรียนทุกคน
              </p>
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {departments.map((d) => {
                const count = students.filter((s) => s.departmentName === d.name).length;
                return (
                  <div
                    key={d.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-sm text-[#0F172A]">{d.name}</div>
                      <div className="text-xs text-[#64748B] tabular-nums">
                        ลงทะเบียนแล้ว {count} คน
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="text-xs text-[#64748B] flex items-center gap-2">
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
                          className="w-24 min-h-[36px] px-2.5 py-1 rounded-lg border border-[#CBD5E1] text-center text-sm tabular-nums"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleUpdateDepartment(d.id, { isClosed: !d.isClosed })}
                        className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                          d.isClosed
                            ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                            : 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                        }`}
                      >
                        {d.isClosed ? 'ปิดรับอยู่ (คลิกเปิด)' : 'เปิดรับอยู่ (คลิกปิด)'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 6: POLICIES, PIN, EXCEL & AUDIT LOG */}
        {tab === 'policies' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 space-y-3">
              <h2 className="font-bold text-base text-[#0F172A]">
                นโยบายและกฎการลงทะเบียน
              </h2>
              <div className="divide-y divide-[#E2E8F0]">
                {(
                  [
                    {
                      key: 'strictOnePerson',
                      title: 'ล็อกสิทธิ์ 1 คนต่อ 1 ฝ่ายงาน (Strict 1-Person Policy)',
                      desc: 'ป้องกันไม่ให้นักเรียนที่มีห้องและเลขที่เดียวกันลงทะเบียนซ้ำข้ามฝ่าย',
                    },
                    {
                      key: 'lockM1Registration',
                      title: 'ล็อก ม.1 เข้าฝ่ายสแตนเชียร์อัตโนมัติ',
                      desc: 'เมื่อน้อง ม.1/2, ม.1/9, ม.1/12 เลือกลงทะเบียนจะถูกจัดเข้าฝ่ายสแตนเชียร์ทันที',
                    },
                    {
                      key: 'm1StandOnly',
                      title: 'ฝ่ายสแตนเชียร์สงวนสิทธิ์เฉพาะ ม.1 เท่านั้น',
                      desc: 'ซ่อนตัวเลือกฝ่ายสแตนเชียร์สำหรับพี่ ม.2 – ม.6',
                    },
                  ] as const
                ).map((item) => {
                  const enabled = policies[item.key];
                  return (
                    <div
                      key={item.key}
                      className="py-3 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="font-semibold text-sm text-[#0F172A]">{item.title}</div>
                        <div className="text-xs text-[#64748B]">{item.desc}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePolicy(item.key, !enabled)}
                        className={`min-h-[36px] px-3.5 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                          enabled
                            ? 'bg-[#047857] text-white'
                            : 'bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1]'
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
                className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 space-y-3"
              >
                <div className="font-bold text-sm text-[#0F172A]">เปลี่ยนรหัส PIN Admin</div>
                <p className="text-xs text-[#64748B]">
                  รหัส PIN ปัจจุบัน: <strong className="text-[#BE185D]">{pinDisplay}</strong>
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="กรอก PIN 4 หลักใหม่"
                    className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
                    required
                  />
                  <button
                    type="submit"
                    className="min-h-[38px] px-4 py-1.5 rounded-lg bg-[#0F172A] text-white text-xs font-semibold cursor-pointer"
                  >
                    บันทึก PIN
                  </button>
                </div>
              </form>

              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-3">
                <div>
                  <div className="font-bold text-sm text-[#0F172A]">ส่งออกรายงาน Excel (.xlsx)</div>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    รวมสรุปภาพรวม รายชื่อทั้งหมด สรุปตามห้อง ฝ่าย และประวัติเช็คชื่อ 5 ชีต
                  </p>
                </div>
                <a
                  href="/api/admin/export-excel"
                  className="min-h-[40px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#047857] text-white text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  ดาวน์โหลดไฟล์ Excel (.xlsx)
                </a>
              </div>
            </div>

            {auditLogs.length > 0 && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-2">
                <div className="font-bold text-sm text-[#0F172A]">ประวัติการทำงานล่าสุด (Audit Log)</div>
                <div className="max-h-56 overflow-y-auto divide-y divide-[#E2E8F0] text-xs">
                  {auditLogs.slice(0, 20).map((log) => (
                    <div key={log.id} className="py-2 flex items-center justify-between gap-2">
                      <span className="font-medium text-[#0F172A]">
                        {log.action} · {log.actorName || 'System'}
                      </span>
                      <span className="text-[#64748B] tabular-nums shrink-0">
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

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddStudent}
            className="w-full max-w-lg bg-white rounded-xl border border-[#CBD5E1] p-5 space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h3 className="font-bold text-base">เพิ่มรายชื่อนักเรียนใหม่ (Admin)</h3>
              <button
                type="button"
                aria-label="ปิดหน้าต่างเพิ่มนักเรียน"
                onClick={() => setShowAddModal(false)}
                className="cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="ชื่อ-นามสกุล *"
                value={newStudent.fullName}
                onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                className="sm:col-span-2 min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
                required
              />
              <input
                type="text"
                placeholder="ชื่อเล่น"
                value={newStudent.nickname}
                onChange={(e) => setNewStudent({ ...newStudent, nickname: e.target.value })}
                className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">ห้องเรียน</label>
                <select
                  value={newStudent.classRoom}
                  onChange={(e) => setNewStudent({ ...newStudent, classRoom: e.target.value })}
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
                >
                  {ALL_ROOMS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">เลขที่</label>
                <select
                  value={newStudent.numberLabel}
                  onChange={(e) => setNewStudent({ ...newStudent, numberLabel: e.target.value })}
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
                >
                  {NUMBERS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">รหัสนักเรียน (ถ้ามี)</label>
                <input
                  type="text"
                  placeholder="เช่น 69001"
                  value={newStudent.studentCode}
                  onChange={(e) => setNewStudent({ ...newStudent, studentCode: e.target.value })}
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">หมวดบทบาท</label>
                <select
                  value={newStudent.roleCategory}
                  onChange={(e) =>
                    setNewStudent({
                      ...newStudent,
                      roleCategory: e.target.value as 'department' | 'central',
                    })
                  }
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
                >
                  <option value="department">คณะทำงานฝ่าย (8 ฝ่าย)</option>
                  <option value="central">คณะกรรมการบริหารส่วนกลาง</option>
                </select>
              </div>

              {newStudent.roleCategory === 'central' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">ตำแหน่งส่วนกลาง</label>
                  <select
                    value={newStudent.centralPosition}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, centralPosition: e.target.value })
                    }
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
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
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">ฝ่ายงาน</label>
                  <select
                    value={newStudent.departmentName}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, departmentName: e.target.value })
                    }
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">ตำแหน่งในฝ่าย</label>
                  <select
                    value={newStudent.position}
                    onChange={(e) => setNewStudent({ ...newStudent, position: e.target.value })}
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
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
                    <label className="block text-[11px] font-semibold text-[#64748B] mb-1">ประเภทกีฬา</label>
                    <select
                      value={newStudent.sportType}
                      onChange={(e) => setNewStudent({ ...newStudent, sportType: e.target.value })}
                      className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
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
              className="w-full min-h-[40px] rounded-lg bg-[#BE185D] text-white text-sm font-semibold cursor-pointer"
            >
              บันทึกนักเรียน
            </button>
          </form>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditStudent}
            className="w-full max-w-lg bg-white rounded-xl border border-[#CBD5E1] p-5 space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h3 className="font-bold text-base">แก้ไขข้อมูลและฝ่ายงานนักเรียน</h3>
              <button
                type="button"
                aria-label="ปิดหน้าต่างแก้ไขนักเรียน"
                onClick={() => setEditingStudent(null)}
                className="cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={editingStudent.fullName}
                onChange={(e) => setEditingStudent({ ...editingStudent, fullName: e.target.value })}
                placeholder="ชื่อ-นามสกุล *"
                className="sm:col-span-2 min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
                required
              />
              <input
                type="text"
                value={editingStudent.nickname}
                onChange={(e) => setEditingStudent({ ...editingStudent, nickname: e.target.value })}
                placeholder="ชื่อเล่น"
                className="min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">ห้องเรียน</label>
                <select
                  value={editingStudent.classRoom}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, classRoom: e.target.value })
                  }
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
                >
                  {ALL_ROOMS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">เลขที่</label>
                <select
                  value={editingStudent.numberLabel}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, numberLabel: e.target.value })
                  }
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
                >
                  {NUMBERS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">รหัสนักเรียน</label>
                <input
                  type="text"
                  value={editingStudent.studentCode || ''}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, studentCode: e.target.value })
                  }
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">ฝ่ายงาน / ส่วนกลาง</label>
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
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
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
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">ตำแหน่งส่วนกลาง</label>
                  <select
                    value={editingStudent.centralPosition || editingStudent.position}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        centralPosition: e.target.value,
                        position: e.target.value,
                      })
                    }
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
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
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">ตำแหน่งในฝ่าย</label>
                  <input
                    type="text"
                    list="admin-role-suggestions"
                    value={editingStudent.position}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, position: e.target.value })
                    }
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
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
                  <label className="block text-[11px] font-semibold text-[#64748B] mb-1">ประเภทกีฬา</label>
                  <select
                    value={editingStudent.sportType || SPORT_TYPES[0]}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, sportType: e.target.value })
                    }
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-sm"
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
              className="w-full min-h-[40px] rounded-lg bg-[#BE185D] text-white text-sm font-semibold cursor-pointer"
            >
              บันทึกการแก้ไข
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
