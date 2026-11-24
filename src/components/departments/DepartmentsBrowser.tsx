'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, QrCode, Search } from 'lucide-react';
import { QrPassModal } from '@/components/qr/QrPassModal';
import { EmptyState, SourceModeBanner } from '@/components/ui/States';
import { CENTRAL_POSITIONS, SPORT_TYPES } from '@/lib/constants';
import type { DepartmentRecord, StudentRecord, StudentWithCheckIn } from '@/lib/types';

interface DepartmentsBrowserProps {
  students: StudentWithCheckIn[];
  departments: DepartmentRecord[];
  sourceMode: 'supabase' | 'legacy-readonly';
}

export function DepartmentsBrowser({
  students,
  departments,
  sourceMode,
}: DepartmentsBrowserProps) {
  const [selectedDeptName, setSelectedDeptName] = useState<string>(
    departments[0]?.name || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [qrStudent, setQrStudent] = useState<StudentRecord | null>(null);

  const selectedDept = departments.find((d) => d.name === selectedDeptName);

  const centralMembers = useMemo(
    () => students.filter((s) => s.roleCategory === 'central'),
    [students]
  );

  const deptMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students
      .filter((s) => s.departmentName === selectedDeptName)
      .filter((s) => {
        if (!q) return true;
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.nickname.toLowerCase().includes(q) ||
          s.classRoom.toLowerCase().includes(q) ||
          s.position.toLowerCase().includes(q)
        );
      });
  }, [students, selectedDeptName, searchQuery]);

  const presentCount = deptMembers.filter((s) => s.checkedIn).length;
  const pendingCount = deptMembers.length - presentCount;
  const rate =
    deptMembers.length > 0
      ? Math.round((presentCount / deptMembers.length) * 1000) / 10
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 lg:pt-8 space-y-5">
      <SourceModeBanner sourceMode={sourceMode} />

      <div className="editorial-panel rounded-3xl p-5 sm:p-6">
        <span className="inline-flex px-2.5 py-0.5 rounded-full bg-pinkteam-blush text-pinkteam-magenta text-xs font-bold">
          05 · DEPARTMENTS (8 ฝ่ายงาน + ส่วนกลาง)
        </span>
        <h1 className="mt-1.5 font-display font-extrabold text-2xl text-pinkteam-charcoal">
          รายชื่อสมาชิกและสถิติแยกตามฝ่ายงาน
        </h1>
        <p className="text-sm text-pinkteam-muted">
          เลือกฝ่ายเพื่อตรวจสอบจำนวนสมาชิก ประธาน สตาฟ สถานะเช็คชื่อ และรายบุคคล
        </p>
      </div>

      {/* Central Committee Overview */}
      <div className="editorial-panel rounded-3xl p-5">
        <h2 className="font-display font-bold text-base text-pinkteam-charcoal mb-3">
          คณะกรรมการบริหารคณะสีส่วนกลาง ({centralMembers.length} / {CENTRAL_POSITIONS.length} ตำแหน่ง)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {CENTRAL_POSITIONS.map((pos) => {
            const holder = centralMembers.find((m) => m.centralPosition === pos);
            return (
              <div
                key={pos}
                className="rounded-2xl bg-pinkteam-blush/60 border border-pinkteam-soft p-3 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="text-[11px] font-bold text-pinkteam-magenta">{pos}</div>
                  <div className="text-sm font-semibold text-pinkteam-charcoal">
                    {holder ? `${holder.fullName} (${holder.nickname})` : 'ว่าง'}
                  </div>
                </div>
                {holder && (
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      holder.checkedIn
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-white text-pinkteam-muted border border-pinkteam-soft'
                    }`}
                  >
                    {holder.checkedIn ? 'มาแล้ว' : 'ยังไม่มา'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 8 Department Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {departments.map((dept, index) => {
          const allInDept = students.filter((s) => s.departmentName === dept.name);
          const pres = allInDept.filter((s) => s.checkedIn).length;
          const active = dept.name === selectedDeptName;
          return (
            <button
              key={dept.id}
              type="button"
              onClick={() => setSelectedDeptName(dept.name)}
              className={`text-left rounded-2xl p-4 transition border ${
                active
                  ? 'figma-charcoal-surface text-white border-pinkteam-light shadow-lg'
                  : 'editorial-panel hover:border-pinkteam-magenta'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold ${
                    active ? 'text-pinkteam-light' : 'text-pinkteam-magenta'
                  }`}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                {dept.isClosed && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                    ปิดรับ
                  </span>
                )}
              </div>
              <div
                className={`mt-1 font-display font-bold text-sm sm:text-base ${
                  active ? 'text-white' : 'text-pinkteam-charcoal'
                }`}
              >
                {dept.name}
              </div>
              <div
                className={`mt-2 text-xs ${active ? 'text-white/80' : 'text-pinkteam-muted'}`}
              >
                ทั้งหมด {allInDept.length} คน · มา {pres}
                {typeof dept.maxCapacity === 'number' ? ` · โควตา ${dept.maxCapacity}` : ''}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Department Detail */}
      {selectedDept && (
        <div className="editorial-panel rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-extrabold text-xl text-pinkteam-charcoal">
                {selectedDept.name}
              </h2>
              <p className="text-xs sm:text-sm text-pinkteam-muted">
                ทั้งหมด {deptMembers.length} คน · มาแล้ว {presentCount} · ยังไม่มา {pendingCount} ·{' '}
                <strong>{rate}%</strong>
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-pinkteam-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาสมาชิกในฝ่าย..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-pinkteam-soft bg-white text-sm"
              />
            </div>
          </div>

          {selectedDept.hasSports ? (
            <div className="space-y-3">
              {SPORT_TYPES.map((sport) => {
                const inSport = deptMembers.filter((m) => m.sportType === sport);
                if (inSport.length === 0 && searchQuery.trim()) return null;
                return (
                  <div
                    key={sport}
                    className="rounded-2xl bg-pinkteam-blush/50 border border-pinkteam-soft p-4"
                  >
                    <div className="font-display font-bold text-sm text-pinkteam-magenta mb-2">
                      {sport} ({inSport.length} คน)
                    </div>
                    {inSport.length === 0 ? (
                      <div className="text-xs text-pinkteam-muted">ยังไม่มีสมาชิก</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {inSport.map((m) => (
                          <MemberRow key={m.id} member={m} onOpenQr={setQrStudent} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : deptMembers.length === 0 ? (
            <EmptyState
              title="ไม่พบสมาชิกในฝ่ายนี้"
              description="ยังไม่มีผู้ลงทะเบียนหรือตรงกับคำค้นหา"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {deptMembers.map((m) => (
                <MemberRow key={m.id} member={m} onOpenQr={setQrStudent} />
              ))}
            </div>
          )}
        </div>
      )}

      <QrPassModal student={qrStudent} onClose={() => setQrStudent(null)} />
    </div>
  );
}

function MemberRow({
  member,
  onOpenQr,
}: {
  member: StudentWithCheckIn;
  onOpenQr: (s: StudentRecord) => void;
}) {
  return (
    <div className="rounded-2xl border border-pinkteam-soft bg-white p-3.5 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="font-display font-bold text-sm text-pinkteam-charcoal truncate">
          {member.fullName} {member.nickname ? `(${member.nickname})` : ''}
        </div>
        <div className="text-xs text-pinkteam-muted">
          ห้อง {member.classRoom} · เลขที่ {member.numberLabel} · {member.position}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {member.checkedIn ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold">
            <CheckCircle2 className="w-3 h-3" /> มาแล้ว
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-[11px] font-medium">
            <Clock3 className="w-3 h-3" /> ยังไม่มา
          </span>
        )}
        <button
          type="button"
          onClick={() => onOpenQr(member)}
          aria-label={`ดู QR ${member.fullName}`}
          className="p-2 rounded-lg border border-pinkteam-soft hover:bg-pinkteam-blush"
        >
          <QrCode className="w-3.5 h-3.5 text-pinkteam-magenta" />
        </button>
      </div>
    </div>
  );
}
