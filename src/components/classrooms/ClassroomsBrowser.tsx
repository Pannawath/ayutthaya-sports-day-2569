'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Printer, QrCode, Search } from 'lucide-react';
import { PrintableAttendanceSheet } from '@/components/print/PrintableAttendanceSheet';
import { QrPassModal } from '@/components/qr/QrPassModal';
import { EmptyState, SourceModeBanner } from '@/components/ui/States';
import { GRADES } from '@/lib/constants';
import type { CheckInSessionRecord, StudentRecord, StudentWithCheckIn } from '@/lib/types';

interface ClassroomsBrowserProps {
  students: StudentWithCheckIn[];
  activeSession: CheckInSessionRecord | null;
  sourceMode: 'supabase' | 'legacy-readonly';
}

export function ClassroomsBrowser({
  students,
  activeSession,
  sourceMode,
}: ClassroomsBrowserProps) {
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [roomFilter, setRoomFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [qrStudent, setQrStudent] = useState<StudentRecord | null>(null);

  const selectedGradeObj = GRADES.find((g) => g.grade === gradeFilter);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students
      .filter((s) => {
        if (gradeFilter !== 'ALL' && s.grade !== gradeFilter) return false;
        if (roomFilter && s.classRoom !== roomFilter) return false;
        if (!q) return true;
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.nickname.toLowerCase().includes(q) ||
          (s.studentCode || '').toLowerCase().includes(q) ||
          s.classRoom.toLowerCase().includes(q) ||
          s.numberLabel.toLowerCase().includes(q) ||
          (s.departmentName || '').toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          a.classRoom.localeCompare(b.classRoom, 'th') ||
          a.numberLabel.localeCompare(b.numberLabel, 'th')
      );
  }, [students, gradeFilter, roomFilter, searchQuery]);

  const presentCount = filtered.filter((s) => s.checkedIn).length;
  const pendingCount = filtered.length - presentCount;
  const rate =
    filtered.length > 0 ? Math.round((presentCount / filtered.length) * 1000) / 10 : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 lg:pt-8 space-y-5">
      <div className="no-print space-y-4">
        <SourceModeBanner sourceMode={sourceMode} />

        {/* Header */}
        <div className="editorial-panel rounded-3xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex px-2.5 py-0.5 rounded-full bg-pinkteam-blush text-pinkteam-magenta text-xs font-bold">
              04 · CLASSROOM DIRECTORY
            </span>
            <h1 className="mt-1.5 font-display font-extrabold text-2xl text-pinkteam-charcoal">
              ข้อมูลและสถานะการเข้าร่วมตามห้องเรียน
            </h1>
            <p className="text-sm text-pinkteam-muted">
              ครอบคลุมระดับชั้น ม.1 – ม.6 ทั้งหมด 21 ห้องเรียน
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pinkteam-charcoal text-white text-xs sm:text-sm font-semibold"
          >
            <Printer className="w-4 h-4" /> พิมพ์ใบเช็คชื่อห้องนี้
          </button>
        </div>

        {/* Grade & Room Filters + Search */}
        <div className="editorial-panel rounded-2xl p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-pinkteam-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อนักเรียน, ชื่อเล่น, เลขประจำตัว, ห้อง หรือเลขที่..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-pinkteam-soft bg-white text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setGradeFilter('ALL');
                setRoomFilter('');
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                gradeFilter === 'ALL'
                  ? 'bg-pinkteam-magenta text-white'
                  : 'bg-pinkteam-blush text-pinkteam-charcoal hover:bg-pinkteam-soft'
              }`}
            >
              ทั้งหมด
            </button>
            {GRADES.map((g) => (
              <button
                key={g.grade}
                type="button"
                onClick={() => {
                  setGradeFilter(g.grade);
                  setRoomFilter('');
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                  gradeFilter === g.grade
                    ? 'bg-pinkteam-magenta text-white'
                    : 'bg-pinkteam-blush text-pinkteam-charcoal hover:bg-pinkteam-soft'
                }`}
              >
                {g.grade}
              </button>
            ))}
          </div>

          {selectedGradeObj && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-pinkteam-blush">
              <button
                type="button"
                onClick={() => setRoomFilter('')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  roomFilter === ''
                    ? 'bg-pinkteam-charcoal text-white'
                    : 'bg-gray-100 text-pinkteam-charcoal'
                }`}
              >
                ทุกห้องใน {selectedGradeObj.grade}
              </button>
              {selectedGradeObj.rooms.map((room) => (
                <button
                  key={room}
                  type="button"
                  onClick={() => setRoomFilter(room)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    roomFilter === room
                      ? 'bg-pinkteam-charcoal text-white'
                      : 'bg-gray-100 text-pinkteam-charcoal'
                  }`}
                >
                  {room}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="editorial-panel rounded-2xl p-3.5">
            <div className="text-[11px] font-semibold text-pinkteam-muted">สมาชิกที่พบ</div>
            <div className="font-display font-extrabold text-2xl text-pinkteam-charcoal">
              {filtered.length}
            </div>
          </div>
          <div className="editorial-panel rounded-2xl p-3.5">
            <div className="text-[11px] font-semibold text-emerald-700">มาแล้ว</div>
            <div className="font-display font-extrabold text-2xl text-emerald-600">
              {presentCount}
            </div>
          </div>
          <div className="editorial-panel rounded-2xl p-3.5">
            <div className="text-[11px] font-semibold text-amber-700">ยังไม่มา</div>
            <div className="font-display font-extrabold text-2xl text-amber-600">
              {pendingCount}
            </div>
          </div>
          <div className="figma-charcoal-surface text-white rounded-2xl p-3.5">
            <div className="text-[11px] font-semibold text-pinkteam-light">เข้าร่วม (%)</div>
            <div className="font-display font-extrabold text-2xl">{rate}%</div>
          </div>
        </div>

        {/* Student Cards */}
        {filtered.length === 0 ? (
          <EmptyState
            title="ไม่พบรายชื่อในห้องหรือคำค้นหานี้"
            description="ลองเปลี่ยนระดับชั้นหรือคำค้นหาใหม่อีกครั้ง"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="editorial-panel rounded-2xl p-4 flex items-center justify-between gap-3"
              >
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
                    {s.checkedIn ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> มาแล้ว
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[11px] font-medium">
                        <Clock3 className="w-3 h-3" /> ยังไม่มา
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setQrStudent(s)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-pinkteam-soft bg-white hover:bg-pinkteam-blush text-xs font-semibold text-pinkteam-charcoal"
                >
                  <QrCode className="w-4 h-4 text-pinkteam-magenta" />
                  QR
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <PrintableAttendanceSheet
        title={
          roomFilter
            ? `รายชื่อห้อง ${roomFilter}`
            : gradeFilter !== 'ALL'
              ? `รายชื่อระดับชั้น ${gradeFilter}`
              : 'รายชื่อนักเรียนทั้งหมด'
        }
        sessionTitle={activeSession?.title}
        students={filtered}
      />

      <QrPassModal student={qrStudent} onClose={() => setQrStudent(null)} />
    </div>
  );
}
