'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCheck,
  ListChecks,
  LogIn,
  Printer,
  RotateCcw,
  Search,
  UserCheck,
  X,
} from 'lucide-react';
import { PrintableAttendanceSheet } from '@/components/print/PrintableAttendanceSheet';
import {
  EmptyState,
  ErrorState,
  SourceModeBanner,
  SuccessBanner,
} from '@/components/ui/States';
import { ALL_ROOMS } from '@/lib/constants';
import type {
  CheckInSessionRecord,
  DepartmentRecord,
  StudentWithCheckIn,
  UserProfile,
} from '@/lib/types';

interface CheckInWorkspaceProps {
  initialStudents: StudentWithCheckIn[];
  sessions: CheckInSessionRecord[];
  activeSession: CheckInSessionRecord | null;
  departments: DepartmentRecord[];
  profile: UserProfile | null;
  sourceMode: 'supabase' | 'legacy-readonly';
}

type CheckInTab = 'search' | 'paper';

export function CheckInWorkspace({
  initialStudents,
  sessions,
  activeSession,
  departments,
  profile,
  sourceMode,
}: CheckInWorkspaceProps) {
  const [students, setStudents] = useState<StudentWithCheckIn[]>(initialStudents);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    activeSession?.id || ''
  );
  const [tab, setTab] = useState<CheckInTab>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PRESENT'>('ALL');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Paper-Sync Bulk Tick states
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const canCheckIn = profile?.role === 'ADMIN' || profile?.role === 'STAFF';
  const currentSessionObj = sessions.find((s) => s.id === selectedSessionId) || activeSession;

  async function reloadSessionStudents(sessionId: string) {
    const res = await fetch(
      `/api/students${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ''}`
    );
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.students)) {
      setStudents(data.students);
    }
  }

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      if (roomFilter && s.classRoom !== roomFilter) return false;
      if (deptFilter && s.departmentName !== deptFilter) return false;
      if (statusFilter === 'PENDING' && s.checkedIn) return false;
      if (statusFilter === 'PRESENT' && !s.checkedIn) return false;
      if (!q) return true;
      return (
        (s.studentCode || '').toLowerCase().includes(q) ||
        s.fullName.toLowerCase().includes(q) ||
        s.nickname.toLowerCase().includes(q) ||
        s.classRoom.toLowerCase().includes(q) ||
        s.numberLabel.toLowerCase().includes(q) ||
        (s.departmentName || '').toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery, roomFilter, deptFilter, statusFilter]);

  async function handleUndoCheckIn(student: StudentWithCheckIn) {
    if (!canCheckIn || !student.checkIn || submittingId) return;
    setSubmittingId(student.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/check-in/${student.checkIn.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: json.error || 'ยกเลิกเช็คชื่อไม่สำเร็จ' });
        return;
      }
      setFeedback({ type: 'success', message: `ยกเลิกเช็คชื่อ ${student.fullName} แล้ว` });
      await reloadSessionStudents(selectedSessionId);
    } catch {
      setFeedback({ type: 'error', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleConfirmCheckIn(
    student: StudentWithCheckIn,
    method: 'QR' | 'ID_SEARCH' | 'MANUAL'
  ) {
    if (!canCheckIn) {
      setFeedback({
        type: 'error',
        message: 'กรุณาเข้าสู่ระบบเจ้าหน้าที่หรือผู้ดูแลก่อนบันทึกเช็คชื่อ',
      });
      return;
    }
    if (submittingId) return;

    setSubmittingId(student.id);
    setFeedback(null);
    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          qrToken: method === 'QR' ? student.qrToken : undefined,
          sessionId: selectedSessionId || undefined,
          method,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: json.error || 'เช็คชื่อไม่สำเร็จ' });
        return;
      }

      setFeedback({ type: 'success', message: json.message });
      await reloadSessionStudents(selectedSessionId);
    } catch {
      setFeedback({ type: 'error', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setSubmittingId(null);
    }
  }

  function toggleBulkStudent(id: string) {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllUncheckedFiltered() {
    const next = new Set(bulkSelectedIds);
    filteredStudents.filter((s) => !s.checkedIn).forEach((s) => next.add(s.id));
    setBulkSelectedIds(next);
  }

  async function handleBulkSubmit() {
    if (!canCheckIn || bulkSelectedIds.size === 0 || bulkSubmitting) return;
    setBulkSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/check-in/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: Array.from(bulkSelectedIds),
          sessionId: selectedSessionId || undefined,
          method: 'BULK_PAPER',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'บันทึกจากใบกระดาษไม่สำเร็จ' });
        return;
      }
      setFeedback({ type: 'success', message: data.message });
      setBulkSelectedIds(new Set());
      await reloadSessionStudents(selectedSessionId);
    } catch {
      setFeedback({ type: 'error', message: 'เกิดข้อผิดพลาดระหว่างส่งข้อมูล' });
    } finally {
      setBulkSubmitting(false);
    }
  }

  const presentCount = students.filter((s) => s.checkedIn).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 lg:pt-8 space-y-4">
      <div className="no-print space-y-4">
        <SourceModeBanner sourceMode={sourceMode} />

        {/* Header & Session Picker */}
        <div className="editorial-panel rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-semibold text-2xl text-pinkteam-charcoal">
              เช็คชื่อเข้าร่วมกิจกรรม
            </h1>
            <p className="text-sm text-pinkteam-secondary mt-1 tabular-nums">
              เช็คชื่อแล้ว {presentCount} จาก {students.length} คน · รองรับเลขประจำตัว QR และใบกระดาษ A4
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {sessions.length > 0 && (
              <select
                value={selectedSessionId}
                onChange={async (e) => {
                  const sid = e.target.value;
                  setSelectedSessionId(sid);
                  await reloadSessionStudents(sid);
                }}
                aria-label="เลือกรอบเช็คชื่อ"
                className="min-h-[40px] px-3 py-2 rounded-lg border border-black/10 bg-white text-xs sm:text-sm font-medium text-pinkteam-charcoal cursor-pointer"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.isActive ? 'เปิดอยู่' : s.eventDate})
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-pinkteam-charcoal text-white text-xs sm:text-sm font-medium hover:bg-pinkteam-plum transition-colors duration-150 cursor-pointer"
            >
              <Printer className="w-4 h-4" strokeWidth={1.5} />
              พิมพ์ใบเช็คชื่อ A4
            </button>
          </div>
        </div>

        {!canCheckIn && (
          <div className="rounded-xl editorial-panel px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-pinkteam-secondary">
            <div className="text-xs sm:text-sm font-normal">
              โหมดอ่านรายชื่อและดูบัตร QR — การกดยืนยันเช็คชื่อสงวนสิทธิ์เฉพาะเจ้าหน้าที่หรือผู้ดูแลระบบ
            </div>
            <Link
              href="/login?next=/check-in"
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-pinkteam-magenta text-white text-xs font-medium hover:bg-pinkteam-deep transition-colors duration-150 cursor-pointer"
            >
              <LogIn className="w-4 h-4" strokeWidth={1.5} />
              เข้าสู่ระบบเจ้าหน้าที่
            </Link>
          </div>
        )}

        {feedback &&
          (feedback.type === 'success' ? (
            <SuccessBanner message={feedback.message} />
          ) : (
            <ErrorState message={feedback.message} />
          ))}

        {/* 2 Check-in Method Tabs */}
        <div className="grid grid-cols-2 gap-1.5 editorial-raised p-1.5 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setTab('search');
              setFeedback(null);
            }}
            className={`min-h-[40px] flex items-center justify-center gap-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-150 cursor-pointer ${
              tab === 'search'
                ? 'bg-pinkteam-magenta text-white'
                : 'text-pinkteam-charcoal hover:bg-white/70'
            }`}
          >
            <Search className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>ค้นหา / กดเช็ค</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('paper');
              setFeedback(null);
            }}
            className={`min-h-[40px] flex items-center justify-center gap-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-150 cursor-pointer ${
              tab === 'paper'
                ? 'bg-pinkteam-magenta text-white'
                : 'text-pinkteam-charcoal hover:bg-white/70'
            }`}
          >
            <ListChecks className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>ติ๊กใบกระดาษ</span>
          </button>
        </div>

        {/* TAB 1 & TAB 2 SHARED FILTERS */}
        {(tab === 'search' || tab === 'paper') && (
          <div className="editorial-panel rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="relative">
                <Search
                  className="w-4 h-4 text-pinkteam-muted absolute left-3 top-1/2 -translate-y-1/2"
                  strokeWidth={1.5}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาเลขประจำตัว, ชื่อ หรือห้อง"
                  className="w-full min-h-[40px] pl-9 pr-9 py-2 rounded-lg border border-black/15 text-sm bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="ล้างคำค้นหา"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-pinkteam-muted hover:text-pinkteam-charcoal hover:bg-black/5 cursor-pointer"
                  >
                    <X className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                )}
              </div>
              <select
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                aria-label="กรองตามห้องเรียน"
                className="min-h-[40px] px-3 py-2 rounded-lg border border-black/15 text-sm bg-white cursor-pointer"
              >
                <option value="">ทุกห้องเรียน (21 ห้อง)</option>
                {ALL_ROOMS.map((room) => (
                  <option key={room} value={room}>
                    ห้อง {room}
                  </option>
                ))}
              </select>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                aria-label="กรองตามฝ่ายงาน"
                className="min-h-[40px] px-3 py-2 rounded-lg border border-black/15 text-sm bg-white cursor-pointer"
              >
                <option value="">ทุกฝ่ายงาน (8 ฝ่าย)</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/5">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'ALL', label: `ทั้งหมด (${students.length})` },
                    { id: 'PENDING', label: `ยังไม่มา (${students.length - presentCount})` },
                    { id: 'PRESENT', label: `มาแล้ว (${presentCount})` },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStatusFilter(opt.id)}
                    className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium tabular-nums transition-colors duration-150 cursor-pointer ${
                      statusFilter === opt.id
                        ? 'bg-pinkteam-charcoal text-white'
                        : 'editorial-raised text-pinkteam-charcoal hover:bg-black/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-pinkteam-muted tabular-nums">
                แสดง {filteredStudents.length} รายการ
              </span>
            </div>

            {tab === 'paper' && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-black/5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllUncheckedFiltered}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg editorial-raised text-pinkteam-charcoal text-xs font-medium hover:bg-black/5 cursor-pointer"
                  >
                    เลือกที่ยังไม่มาทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkSelectedIds(new Set())}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg text-pinkteam-secondary text-xs font-medium hover:bg-black/5 tabular-nums cursor-pointer"
                  >
                    ล้างที่เลือก ({bulkSelectedIds.size})
                  </button>
                </div>
                <button
                  type="button"
                  disabled={!canCheckIn || bulkSelectedIds.size === 0 || bulkSubmitting}
                  onClick={handleBulkSubmit}
                  className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pinkteam-magenta text-white text-xs sm:text-sm font-medium disabled:opacity-45 tabular-nums cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" strokeWidth={1.5} />
                  {bulkSubmitting
                    ? 'กำลังบันทึก'
                    : `บันทึกจากใบกระดาษ (${bulkSelectedIds.size} คน)`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* STUDENT LIST FOR TAB 1 & TAB 3 */}
        {(tab === 'search' || tab === 'paper') &&
          (filteredStudents.length === 0 ? (
            <EmptyState
              title="ไม่พบรายชื่อนักเรียน"
              description="ลองเปลี่ยนคำค้นหา ห้องเรียน หรือฝ่ายงาน"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredStudents.map((s) => {
                const isSelectedBulk = bulkSelectedIds.has(s.id);
                return (
                  <div
                    key={s.id}
                    className={`editorial-panel rounded-xl p-4 flex items-center justify-between gap-3 transition-colors duration-150 ${
                      isSelectedBulk ? 'ring-2 ring-pinkteam-magenta bg-pinkteam-blush' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {tab === 'paper' && (
                        <input
                          type="checkbox"
                          disabled={s.checkedIn}
                          checked={s.checkedIn || isSelectedBulk}
                          onChange={() => toggleBulkStudent(s.id)}
                          aria-label={`เลือก ${s.fullName}`}
                          className="mt-1 w-4 h-4 rounded border-black/25 text-pinkteam-magenta cursor-pointer"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="font-display font-medium text-sm sm:text-base text-pinkteam-charcoal truncate">
                          {s.fullName}{' '}
                          {s.nickname && (
                            <span className="font-normal text-pinkteam-secondary">({s.nickname})</span>
                          )}
                        </div>
                        <div className="text-xs text-pinkteam-secondary mt-0.5 tabular-nums">
                          ห้อง {s.classRoom} · เลขที่ {s.numberLabel}
                          {s.studentCode ? ` · รหัส ${s.studentCode}` : ''}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                          <span className="text-pinkteam-magenta font-medium">
                            {s.roleCategory === 'central'
                              ? s.centralPosition
                              : `${s.departmentName || '-'} · ${s.position}`}
                          </span>
                          {s.checkedIn && s.checkIn && (
                            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium tabular-nums">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              มาแล้ว{' '}
                              {new Date(s.checkIn.checkedInAt).toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {tab === 'search' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={s.checkedIn || !canCheckIn || submittingId === s.id}
                            onClick={() =>
                              handleConfirmCheckIn(s, searchQuery.trim() ? 'ID_SEARCH' : 'MANUAL')
                            }
                            className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer ${
                              s.checkedIn
                                ? 'editorial-raised text-emerald-800 cursor-default'
                                : 'bg-pinkteam-magenta text-white hover:bg-pinkteam-deep disabled:opacity-45'
                            }`}
                          >
                            <UserCheck className="w-4 h-4" strokeWidth={1.5} />
                            <span>
                              {s.checkedIn
                                ? 'เช็คแล้ว'
                                : submittingId === s.id
                                  ? 'กำลังบันทึก'
                                  : 'ยืนยันเช็คชื่อ'}
                            </span>
                          </button>
                          {s.checkedIn && canCheckIn && s.checkIn && (
                            <button
                              type="button"
                              disabled={submittingId === s.id}
                              onClick={() => handleUndoCheckIn(s)}
                              aria-label={`ยกเลิกเช็คชื่อ ${s.fullName}`}
                              title="ยกเลิกเช็คชื่อ"
                              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-black/15 bg-white text-pinkteam-secondary hover:text-red-700 hover:border-red-200 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
      </div>

      <PrintableAttendanceSheet
        title={
          roomFilter
            ? `ห้อง ${roomFilter}`
            : deptFilter
              ? `ฝ่าย ${deptFilter}`
              : 'รายชื่อนักเรียนทั้งหมด'
        }
        sessionTitle={currentSessionObj?.title}
        students={filteredStudents}
      />
    </div>
  );
}
