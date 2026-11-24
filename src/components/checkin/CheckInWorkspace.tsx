'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Camera,
  CheckCheck,
  CheckCircle2,
  ListChecks,
  LogIn,
  Printer,
  QrCode,
  Search,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { PrintableAttendanceSheet } from '@/components/print/PrintableAttendanceSheet';
import { QrPassModal } from '@/components/qr/QrPassModal';
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
  StudentRecord,
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

type CheckInTab = 'search' | 'qr' | 'paper';

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
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [qrModalStudent, setQrModalStudent] = useState<StudentRecord | null>(null);

  // QR Scanner states
  const [scannerActive, setScannerActive] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [scannedStudent, setScannedStudent] = useState<StudentWithCheckIn | null>(null);
  const [autoCheckInOnScan, setAutoCheckInOnScan] = useState(false);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

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

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => undefined);
      }
    };
  }, []);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      if (roomFilter && s.classRoom !== roomFilter) return false;
      if (deptFilter && s.departmentName !== deptFilter) return false;
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
  }, [students, searchQuery, roomFilter, deptFilter]);

  async function handleConfirmCheckIn(
    student: StudentWithCheckIn,
    method: 'QR' | 'ID_SEARCH' | 'MANUAL'
  ) {
    if (!canCheckIn) {
      setFeedback({
        type: 'error',
        message: 'กรุณาเข้าสู่ระบบเจ้าหน้าที่หรือ Admin ก่อนบันทึกเช็คชื่อ',
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
      if (scannedStudent?.id === student.id) {
        setScannedStudent({
          ...student,
          checkedIn: true,
          checkIn: json.checkIn,
        });
      }
    } catch {
      setFeedback({ type: 'error', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setSubmittingId(null);
    }
  }

  async function verifyAndHandleToken(token: string) {
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/qr/verify?token=${encodeURIComponent(token)}${
          selectedSessionId ? `&sessionId=${encodeURIComponent(selectedSessionId)}` : ''
        }`
      );
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setScannedStudent(null);
        setFeedback({ type: 'error', message: data.error || 'QR Code ไม่ถูกต้อง' });
        return;
      }

      setScannedStudent(data.student);
      if (autoCheckInOnScan && canCheckIn && !data.student.checkedIn) {
        await handleConfirmCheckIn(data.student, 'QR');
      }
    } catch {
      setFeedback({ type: 'error', message: 'ไม่สามารถตรวจสอบ QR Code ได้' });
    }
  }

  async function startCameraScanner() {
    setFeedback(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const qr = new Html5Qrcode('qr-reader-region');
      scannerRef.current = qr;
      setScannerActive(true);
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          await qr.stop().catch(() => undefined);
          setScannerActive(false);
          setManualToken(decodedText);
          await verifyAndHandleToken(decodedText);
        },
        () => undefined
      );
    } catch {
      setScannerActive(false);
      setFeedback({
        type: 'error',
        message: 'ไม่สามารถเปิดกล้องได้ (ตรวจสอบสิทธิ์กล้องของเบราว์เซอร์ หรือวาง Token QR ด้านล่าง)',
      });
    }
  }

  async function stopCameraScanner() {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => undefined);
      setScannerActive(false);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 lg:pt-8 space-y-5">
      <div className="no-print space-y-4">
        <SourceModeBanner sourceMode={sourceMode} />

        {/* Header & Session Picker */}
        <div className="editorial-panel rounded-3xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="inline-flex px-2.5 py-0.5 rounded-full bg-pinkteam-blush text-pinkteam-magenta text-xs font-bold">
              02 · STUDENT CHECK-IN
            </span>
            <h1 className="mt-1.5 font-display font-extrabold text-2xl text-pinkteam-charcoal">
              ระบบเช็คชื่อเข้าร่วมกิจกรรม
            </h1>
            <p className="text-sm text-pinkteam-muted">
              เช็คชื่อแล้ว {presentCount} / {students.length} คน (รองรับเลขประจำตัว · QR · ใบกระดาษ A4)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {sessions.length > 0 && (
              <select
                value={selectedSessionId}
                onChange={async (e) => {
                  const sid = e.target.value;
                  setSelectedSessionId(sid);
                  await reloadSessionStudents(sid);
                }}
                aria-label="เลือกรอบเช็คชื่อ"
                className="px-3 py-2 rounded-xl border border-pinkteam-soft bg-white text-xs sm:text-sm font-semibold text-pinkteam-charcoal"
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-pinkteam-charcoal text-white text-xs sm:text-sm font-semibold hover:bg-pinkteam-plum transition"
            >
              <Printer className="w-4 h-4" />
              พิมพ์ใบเช็คชื่อ A4
            </button>
          </div>
        </div>

        {!canCheckIn && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-amber-900">
            <div className="text-xs sm:text-sm font-medium">
              คุณกำลังดูในโหมดนักเรียนทั่วไป (ค้นหาและดูบัตร QR ได้) — การกดยืนยันเช็คชื่อสงวนสิทธิ์เฉพาะเจ้าหน้าที่ (Staff) หรือ Admin
            </div>
            <Link
              href="/login?next=/check-in"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-pinkteam-magenta text-white text-xs font-bold"
            >
              <LogIn className="w-3.5 h-3.5" /> เข้าสู่ระบบเจ้าหน้าที่
            </Link>
          </div>
        )}

        {feedback &&
          (feedback.type === 'success' ? (
            <SuccessBanner message={feedback.message} />
          ) : (
            <ErrorState message={feedback.message} />
          ))}

        {/* 3 Check-in Method Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-white/80 p-1.5 rounded-2xl border border-pinkteam-soft">
          <button
            type="button"
            onClick={() => setTab('search')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              tab === 'search'
                ? 'bg-pinkteam-magenta text-white shadow'
                : 'text-pinkteam-charcoal hover:bg-pinkteam-blush'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>ค้นหา / กดเช็ค</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('qr')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              tab === 'qr'
                ? 'bg-pinkteam-magenta text-white shadow'
                : 'text-pinkteam-charcoal hover:bg-pinkteam-blush'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>สแกน QR</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('paper')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              tab === 'paper'
                ? 'bg-pinkteam-magenta text-white shadow'
                : 'text-pinkteam-charcoal hover:bg-pinkteam-blush'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span>ติ๊กใบกระดาษ</span>
          </button>
        </div>

        {/* TAB 2: QR SCANNER */}
        {tab === 'qr' && (
          <div className="editorial-panel rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-bold text-lg text-pinkteam-charcoal">
                  สแกน QR Code ประจำตัวนักเรียน
                </h2>
                <p className="text-xs text-pinkteam-muted">
                  ตรวจสอบลายเซ็น HMAC Token ก่อนเช็คชื่อทุกครั้ง ป้องกัน QR ปลอมและเช็คชื่อซ้ำ
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-pinkteam-charcoal">
                <input
                  type="checkbox"
                  checked={autoCheckInOnScan}
                  onChange={(e) => setAutoCheckInOnScan(e.target.checked)}
                  className="rounded border-pinkteam-soft text-pinkteam-magenta"
                />
                บันทึกเช็คชื่ออัตโนมัติหลังสแกนผ่าน
              </label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div
                  id="qr-reader-region"
                  className="w-full min-h-[240px] rounded-2xl bg-pinkteam-charcoal/5 border-2 border-dashed border-pinkteam-soft flex items-center justify-center overflow-hidden"
                >
                  {!scannerActive && (
                    <div className="text-center p-6">
                      <Camera className="w-8 h-8 text-pinkteam-magenta mx-auto mb-2" />
                      <p className="text-xs text-pinkteam-muted">กดปุ่มด้านล่างเพื่อเปิดกล้องสแกน</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {!scannerActive ? (
                    <button
                      type="button"
                      onClick={startCameraScanner}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-pinkteam-magenta text-white font-bold text-sm"
                    >
                      <Camera className="w-4 h-4" /> เปิดกล้องสแกน QR
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopCameraScanner}
                      className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-pinkteam-charcoal text-white font-bold text-sm"
                    >
                      <XCircle className="w-4 h-4" /> หยุดกล้อง
                    </button>
                  )}
                </div>

                <div className="pt-2 border-t border-pinkteam-blush">
                  <label className="text-xs font-semibold text-pinkteam-muted block mb-1">
                    หรือวางรหัส Token จาก QR เพื่อตรวจสอบ
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="ASTD2569...."
                      className="flex-1 px-3 py-2 rounded-xl border border-pinkteam-soft text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => verifyAndHandleToken(manualToken)}
                      className="px-4 py-2 rounded-xl bg-pinkteam-charcoal text-white text-xs font-bold"
                    >
                      ตรวจสอบ
                    </button>
                  </div>
                </div>
              </div>

              <div>
                {scannedStudent ? (
                  <div className="rounded-2xl border border-pinkteam-magenta/30 bg-pinkteam-blush/50 p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-pinkteam-magenta uppercase">
                          ยืนยันตัวตน QR สำเร็จ
                        </span>
                        <h3 className="font-display font-bold text-xl text-pinkteam-charcoal mt-0.5">
                          {scannedStudent.fullName}
                        </h3>
                        <p className="text-sm text-pinkteam-muted">
                          {scannedStudent.nickname ? `(${scannedStudent.nickname}) · ` : ''}
                          ห้อง {scannedStudent.classRoom} · เลขที่ {scannedStudent.numberLabel}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          scannedStudent.checkedIn
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {scannedStudent.checkedIn ? 'เช็คชื่อแล้ว' : 'ยังไม่เช็คชื่อ'}
                      </span>
                    </div>
                    <div className="text-xs text-pinkteam-charcoal bg-white rounded-xl p-3 border border-pinkteam-soft">
                      ฝ่ายสังกัด:{' '}
                      <strong>
                        {scannedStudent.roleCategory === 'central'
                          ? scannedStudent.centralPosition
                          : `${scannedStudent.departmentName || '-'} · ${scannedStudent.position}`}
                      </strong>
                    </div>

                    {!scannedStudent.checkedIn ? (
                      <button
                        type="button"
                        disabled={!canCheckIn || submittingId === scannedStudent.id}
                        onClick={() => handleConfirmCheckIn(scannedStudent, 'QR')}
                        className="w-full py-3 rounded-xl bg-pinkteam-magenta text-white font-display font-bold text-sm hover:bg-pinkteam-deep disabled:opacity-50"
                      >
                        {submittingId === scannedStudent.id
                          ? 'กำลังบันทึก...'
                          : 'ยืนยันเช็คชื่อด้วย QR'}
                      </button>
                    ) : (
                      <div className="text-xs text-emerald-800 font-semibold">
                        เช็คชื่อแล้วเมื่อ{' '}
                        {scannedStudent.checkIn
                          ? new Date(scannedStudent.checkIn.checkedInAt).toLocaleTimeString('th-TH')
                          : ''}
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState
                    title="รอสแกน QR Code"
                    description="ส่องกล้องไปที่บัตร QR ประจำตัวนักเรียน หรือวาง Token เพื่อตรวจสอบความถูกต้อง"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1 & TAB 3 SHARED FILTERS */}
        {(tab === 'search' || tab === 'paper') && (
          <div className="editorial-panel rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-pinkteam-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาเลขประจำตัว, ชื่อ, ชื่อเล่น, เลขที่..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-pinkteam-soft text-sm bg-white"
                />
              </div>
              <select
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                aria-label="กรองตามห้องเรียน"
                className="px-3 py-2.5 rounded-xl border border-pinkteam-soft text-sm bg-white"
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
                className="px-3 py-2.5 rounded-xl border border-pinkteam-soft text-sm bg-white"
              >
                <option value="">ทุกฝ่ายงาน (8 ฝ่าย)</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {tab === 'paper' && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-pinkteam-blush">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllUncheckedFiltered}
                    className="px-3 py-1.5 rounded-lg bg-pinkteam-blush text-pinkteam-magenta text-xs font-bold hover:bg-pinkteam-soft"
                  >
                    เลือกทั้งหมดที่ยังไม่มาในรายการนี้
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkSelectedIds(new Set())}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 text-pinkteam-charcoal text-xs font-semibold"
                  >
                    ล้างที่เลือก ({bulkSelectedIds.size})
                  </button>
                </div>
                <button
                  type="button"
                  disabled={!canCheckIn || bulkSelectedIds.size === 0 || bulkSubmitting}
                  onClick={handleBulkSubmit}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pinkteam-magenta text-white text-xs sm:text-sm font-bold disabled:opacity-50"
                >
                  <CheckCheck className="w-4 h-4" />
                  {bulkSubmitting
                    ? 'กำลังบันทึก...'
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
                    className={`editorial-panel rounded-2xl p-4 flex items-center justify-between gap-3 transition ${
                      isSelectedBulk ? 'ring-2 ring-pinkteam-magenta bg-pinkteam-blush/50' : ''
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
                          className="mt-1 w-4 h-4 rounded border-pinkteam-soft text-pinkteam-magenta"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="font-display font-bold text-sm sm:text-base text-pinkteam-charcoal truncate">
                          {s.fullName}{' '}
                          {s.nickname && (
                            <span className="font-normal text-pinkteam-muted">({s.nickname})</span>
                          )}
                        </div>
                        <div className="text-xs text-pinkteam-muted mt-0.5">
                          ห้อง {s.classRoom} · เลขที่ {s.numberLabel}
                          {s.studentCode ? ` · รหัส ${s.studentCode}` : ''}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-pinkteam-blush text-pinkteam-magenta text-[11px] font-semibold">
                            {s.roleCategory === 'central'
                              ? s.centralPosition
                              : `${s.departmentName || '-'} · ${s.position}`}
                          </span>
                          {s.checkedIn && s.checkIn && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
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
                        <button
                          type="button"
                          disabled={s.checkedIn || !canCheckIn || submittingId === s.id}
                          onClick={() =>
                            handleConfirmCheckIn(s, searchQuery.trim() ? 'ID_SEARCH' : 'MANUAL')
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                            s.checkedIn
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                              : 'bg-pinkteam-magenta text-white hover:bg-pinkteam-deep disabled:opacity-45'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>
                            {s.checkedIn
                              ? 'เช็คแล้ว'
                              : submittingId === s.id
                                ? 'กำลังบันทึก...'
                                : 'ยืนยันเช็คชื่อ'}
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setQrModalStudent(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-pinkteam-soft text-[11px] font-semibold text-pinkteam-charcoal hover:bg-pinkteam-blush"
                      >
                        <QrCode className="w-3 h-3" />
                        บัตร QR
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
      </div>

      {/* Printable A4 Sheet */}
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

      <QrPassModal student={qrModalStudent} onClose={() => setQrModalStudent(null)} />
    </div>
  );
}
