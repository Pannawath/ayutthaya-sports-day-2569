'use client';

import React, { useMemo, useState } from 'react';
import { QrCode, Search } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'PENDING'>('ALL');
  const [qrStudent, setQrStudent] = useState<StudentRecord | null>(null);

  const selectedDept = departments.find((d) => d.name === selectedDeptName);

  const centralMembers = useMemo(
    () => students.filter((s) => s.roleCategory === 'central'),
    [students]
  );

  const scopeDeptMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students
      .filter((s) => s.departmentName === selectedDeptName)
      .filter((s) => {
        if (!q) return true;
        return (
          (s.studentCode || '').toLowerCase().includes(q) ||
          s.fullName.toLowerCase().includes(q) ||
          s.nickname.toLowerCase().includes(q) ||
          s.classRoom.toLowerCase().includes(q) ||
          s.position.toLowerCase().includes(q)
        );
      });
  }, [students, selectedDeptName, searchQuery]);

  const deptMembers = useMemo(() => {
    if (statusFilter === 'ALL') return scopeDeptMembers;
    return scopeDeptMembers.filter((s) =>
      statusFilter === 'PRESENT' ? s.checkedIn : !s.checkedIn
    );
  }, [scopeDeptMembers, statusFilter]);

  const presentCount = scopeDeptMembers.filter((s) => s.checkedIn).length;
  const pendingCount = scopeDeptMembers.length - presentCount;
  const rate =
    scopeDeptMembers.length > 0
      ? Math.round((presentCount / scopeDeptMembers.length) * 1000) / 10
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 lg:pt-8 space-y-4">
      <SourceModeBanner sourceMode={sourceMode} />

      <div className="editorial-panel rounded-2xl p-5 sm:p-6">
        <h1 className="font-display font-semibold text-2xl text-pinkteam-charcoal">
          รายชื่อสมาชิกและสถิติตามฝ่ายงาน
        </h1>
        <p className="text-sm text-pinkteam-secondary mt-1">
          8 ฝ่ายงานหลักและคณะกรรมการบริหารส่วนกลาง 6 ตำแหน่ง
        </p>
      </div>

      {/* Central Committee Overview */}
      <div className="editorial-panel rounded-2xl p-5">
        <h2 className="font-display font-medium text-base text-pinkteam-charcoal mb-3 tabular-nums">
          คณะกรรมการบริหารคณะสีส่วนกลาง ({centralMembers.length} / {CENTRAL_POSITIONS.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {CENTRAL_POSITIONS.map((pos) => {
            const holder = centralMembers.find((m) => m.centralPosition === pos);
            return (
              <div
                key={pos}
                className="rounded-xl editorial-raised p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-pinkteam-magenta">{pos}</div>
                  <div className="text-sm font-medium text-pinkteam-charcoal truncate mt-0.5">
                    {holder ? `${holder.fullName} (${holder.nickname})` : 'ว่าง'}
                  </div>
                </div>
                {holder && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-pinkteam-secondary shrink-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        holder.checkedIn ? 'bg-emerald-600' : 'bg-pinkteam-muted/50'
                      }`}
                    />
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
        {departments.map((dept) => {
          const allInDept = students.filter((s) => s.departmentName === dept.name);
          const pres = allInDept.filter((s) => s.checkedIn).length;
          const active = dept.name === selectedDeptName;
          return (
            <button
              key={dept.id}
              type="button"
              onClick={() => setSelectedDeptName(dept.name)}
              className={`text-left rounded-xl p-4 transition-colors duration-150 border cursor-pointer ${
                active
                  ? 'bg-pinkteam-charcoal text-white border-pinkteam-charcoal'
                  : 'editorial-panel hover:bg-pinkteam-blush/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`font-display font-medium text-sm sm:text-base ${
                    active ? 'text-white' : 'text-pinkteam-charcoal'
                  }`}
                >
                  {dept.name}
                </span>
                {dept.isClosed && (
                  <span
                    className={`text-xs font-medium ${
                      active ? 'text-pinkteam-light' : 'text-pinkteam-muted'
                    }`}
                  >
                    ปิดรับ
                  </span>
                )}
              </div>
              <div
                className={`mt-2 text-xs tabular-nums ${
                  active ? 'text-white/80' : 'text-pinkteam-secondary'
                }`}
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
        <div className="editorial-panel rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-semibold text-xl text-pinkteam-charcoal">
                {selectedDept.name}
              </h2>
              <p className="text-xs sm:text-sm text-pinkteam-secondary tabular-nums mt-0.5">
                ทั้งหมด {scopeDeptMembers.length} คน · มาแล้ว {presentCount} · ยังไม่มา {pendingCount} ·{' '}
                <strong className="font-semibold text-pinkteam-magenta">{rate}%</strong>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="flex gap-1">
                {(
                  [
                    { id: 'ALL', label: 'ทั้งหมด' },
                    { id: 'PRESENT', label: 'มาแล้ว' },
                    { id: 'PENDING', label: 'ยังไม่มา' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStatusFilter(opt.id)}
                    className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                      statusFilter === opt.id
                        ? 'bg-pinkteam-charcoal text-white'
                        : 'editorial-raised text-pinkteam-charcoal hover:bg-black/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 sm:w-56">
                <Search
                  className="w-4 h-4 text-pinkteam-muted absolute left-3 top-1/2 -translate-y-1/2"
                  strokeWidth={1.5}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อ, รหัส หรือห้อง"
                  className="w-full min-h-[40px] pl-9 pr-3 py-2 rounded-lg border border-black/15 bg-white text-sm"
                />
              </div>
            </div>
          </div>

          {selectedDept.hasSports ? (
            <div className="space-y-3">
              {SPORT_TYPES.map((sport) => {
                const inSport = deptMembers.filter((m) => m.sportType === sport);
                if (inSport.length === 0 && searchQuery.trim()) return null;
                return (
                  <div key={sport} className="rounded-xl editorial-raised p-4">
                    <div className="font-display font-medium text-sm text-pinkteam-charcoal mb-2 tabular-nums">
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
    <div className="rounded-xl border border-black/10 bg-white p-3.5 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="font-display font-medium text-sm text-pinkteam-charcoal truncate">
          {member.fullName} {member.nickname ? `(${member.nickname})` : ''}
        </div>
        <div className="text-xs text-pinkteam-secondary tabular-nums mt-0.5">
          ห้อง {member.classRoom} · เลขที่ {member.numberLabel}
          {member.studentCode ? ` · รหัส ${member.studentCode}` : ''} · {member.position}
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="inline-flex items-center gap-1.5 text-xs text-pinkteam-secondary">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              member.checkedIn ? 'bg-emerald-600' : 'bg-pinkteam-muted/50'
            }`}
          />
          {member.checkedIn ? 'มาแล้ว' : 'ยังไม่มา'}
        </span>
        <button
          type="button"
          onClick={() => onOpenQr(member)}
          aria-label={`ดู QR ${member.fullName}`}
          className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg editorial-raised hover:bg-black/5 cursor-pointer"
        >
          <QrCode className="w-4 h-4 text-pinkteam-muted" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
