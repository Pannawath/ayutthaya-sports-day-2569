'use client';

import React, { useMemo, useState } from 'react';
import { Printer, QrCode, Search } from 'lucide-react';
import { PrintableAttendanceSheet } from '@/components/print/PrintableAttendanceSheet';
import { QrPassModal } from '@/components/qr/QrPassModal';
import { EmptyState, SourceModeBanner } from '@/components/ui/States';
import { GRADES } from '@/lib/constants';
import type { CheckInSessionRecord, StudentRecord, StudentWithCheckIn } from '@/lib/types';

interface ClassroomsBrowserProps {
  students: StudentWithCheckIn[];
  activeSession: CheckInSessionRecord | null;
  sourceMode: 'supabase' | 'legacy-readonly';
  initialGrade?: string;
  initialRoom?: string;
}

export function ClassroomsBrowser({
  students,
  activeSession,
  sourceMode,
  initialGrade = 'ALL',
  initialRoom = '',
}: ClassroomsBrowserProps) {
  const [gradeFilter, setGradeFilter] = useState<string>(initialGrade);
  const [roomFilter, setRoomFilter] = useState<string>(initialRoom);
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
          (s.studentCode || '').toLowerCase().includes(q) ||
          s.fullName.toLowerCase().includes(q) ||
          s.nickname.toLowerCase().includes(q) ||
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 lg:pt-8 space-y-4">
      <div className="no-print space-y-4">
        <SourceModeBanner sourceMode={sourceMode} />

        {/* Header matching legacy renderClasses() */}
        <div className="editorial-panel rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-semibold text-2xl text-pinkteam-charcoal">
              ค้นหาและดูข้อมูลตามห้อง
            </h1>
            <p className="text-sm text-pinkteam-secondary mt-1 tabular-nums">
              พบรายชื่อนักเรียน {filtered.length} รายการ (ระดับชั้น ม.1 – ม.6 ทั้งหมด 21 ห้องเรียน)
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pinkteam-charcoal text-white text-xs sm:text-sm font-medium hover:bg-pinkteam-plum transition-colors duration-150 cursor-pointer"
          >
            <Printer className="w-4 h-4" strokeWidth={1.5} />
            พิมพ์ใบรายชื่อห้องนี้
          </button>
        </div>

        {/* Grade & Room Filters + Search */}
        <div className="editorial-panel rounded-2xl p-4 space-y-3">
          <div className="relative">
            <Search
              className="w-4 h-4 text-pinkteam-muted absolute left-3 top-1/2 -translate-y-1/2"
              strokeWidth={1.5}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="พิมพ์ชื่อ, ชื่อเล่น, ห้อง หรือเลขที่เพื่อค้นหา..."
              className="w-full min-h-[40px] pl-9 pr-3 py-2 rounded-lg border border-black/15 bg-white text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setGradeFilter('ALL');
                setRoomFilter('');
              }}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer ${
                gradeFilter === 'ALL'
                  ? 'bg-pinkteam-magenta text-white'
                  : 'editorial-raised text-pinkteam-charcoal hover:bg-black/5'
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
                className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer ${
                  gradeFilter === g.grade
                    ? 'bg-pinkteam-magenta text-white'
                    : 'editorial-raised text-pinkteam-charcoal hover:bg-black/5'
                }`}
              >
                {g.grade}
              </button>
            ))}
          </div>

          {selectedGradeObj && (
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-black/5">
              <button
                type="button"
                onClick={() => setRoomFilter('')}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                  roomFilter === ''
                    ? 'bg-pinkteam-charcoal text-white'
                    : 'editorial-raised text-pinkteam-charcoal hover:bg-black/5'
                }`}
              >
                ทุกห้องใน {selectedGradeObj.grade}
              </button>
              {selectedGradeObj.rooms.map((room) => (
                <button
                  key={room}
                  type="button"
                  onClick={() => setRoomFilter(room)}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                    roomFilter === room
                      ? 'bg-pinkteam-charcoal text-white'
                      : 'editorial-raised text-pinkteam-charcoal hover:bg-black/5'
                  }`}
                >
                  {room}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clean Legacy-Style Student Cards */}
        {filtered.length === 0 ? (
          <EmptyState
            title="ไม่พบข้อมูลนักเรียนที่ตรงกับเงื่อนไข"
            description="ลองเปลี่ยนระดับชั้น ห้องเรียน หรือคำค้นหาใหม่อีกครั้ง"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((s) => {
              const roleText =
                s.roleCategory === 'central'
                  ? s.centralPosition || s.position
                  : `${s.departmentName || '-'}${s.sportType ? ` · ${s.sportType}` : ''} · ${s.position}`;
              const isLeader =
                s.roleCategory === 'central' ||
                s.position === 'ประธานฝ่าย' ||
                s.position === 'หัวหน้ากีฬา';

              return (
                <div
                  key={s.id}
                  className="editorial-panel rounded-xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-display font-medium text-sm sm:text-base text-pinkteam-charcoal truncate">
                      {s.fullName}{' '}
                      {s.nickname && (
                        <span className="font-normal text-pinkteam-secondary">({s.nickname})</span>
                      )}
                    </div>
                    <div className="text-xs text-pinkteam-secondary mt-0.5 tabular-nums">
                      ห้อง {s.classRoom} · เลขที่ {s.numberLabel}
                    </div>
                    <div className="mt-2">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-medium ${
                          isLeader
                            ? 'bg-pinkteam-blush text-pinkteam-magenta'
                            : 'editorial-raised text-pinkteam-charcoal'
                        }`}
                      >
                        {roleText}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setQrStudent(s)}
                    className="shrink-0 min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg editorial-raised hover:bg-black/5 text-xs font-medium text-pinkteam-charcoal cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-pinkteam-muted" strokeWidth={1.5} />
                    บัตร QR
                  </button>
                </div>
              );
            })}
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
