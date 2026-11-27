'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { EmptyState, SourceModeBanner } from '@/components/ui/States';
import { CENTRAL_POSITIONS, NO_STAFF_DEPARTMENTS, SPORT_TYPES } from '@/lib/constants';
import type { DepartmentRecord, StudentWithCheckIn } from '@/lib/types';

interface DepartmentsBrowserProps {
  students: StudentWithCheckIn[];
  departments: DepartmentRecord[];
  sourceMode: 'supabase' | 'legacy-readonly';
  initialDeptName?: string | null;
}

export function DepartmentsBrowser({
  students,
  departments,
  sourceMode,
  initialDeptName = null,
}: DepartmentsBrowserProps) {
  const [openDeptName, setOpenDeptName] = useState<string | null>(
    () => initialDeptName || departments[0]?.name || 'ฝ่ายอุปกรณ์'
  );
  const [searchQuery, setSearchQuery] = useState('');

  const centralMembers = useMemo(
    () => students.filter((s) => s.roleCategory === 'central'),
    [students]
  );

  const query = searchQuery.trim().toLowerCase();

  const matchesQuery = (m: StudentWithCheckIn, extra = '') => {
    if (!query) return true;
    return (
      m.fullName.toLowerCase().includes(query) ||
      m.nickname.toLowerCase().includes(query) ||
      m.classRoom.toLowerCase().includes(query) ||
      m.numberLabel.toLowerCase().includes(query) ||
      m.position.toLowerCase().includes(query) ||
      (m.departmentName || '').toLowerCase().includes(query) ||
      (m.sportType || '').toLowerCase().includes(query) ||
      extra.toLowerCase().includes(query)
    );
  };

  const visibleCentralPositions = useMemo(() => {
    if (!query) return CENTRAL_POSITIONS;
    return CENTRAL_POSITIONS.filter((pos) => {
      const holder = centralMembers.find((m) => m.centralPosition === pos);
      if (pos.toLowerCase().includes(query)) return true;
      return holder ? matchesQuery(holder, pos) : false;
    });
  }, [centralMembers, query]);

  const deptSearchCounts = useMemo(() => {
    return departments.map((dept) => {
      const allMembers = students.filter((s) => s.departmentName === dept.name);
      const filteredMembers = query
        ? allMembers.filter((m) => matchesQuery(m, dept.name))
        : allMembers;
      return { dept, allMembers, filteredMembers };
    });
  }, [departments, students, query]);

  const visibleDepartments = query
    ? deptSearchCounts.filter((d) => d.filteredMembers.length > 0)
    : deptSearchCounts;

  const totalMatches =
    (query ? visibleCentralPositions.length : centralMembers.length) +
    visibleDepartments.reduce((sum, d) => sum + d.filteredMembers.length, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 lg:pt-8 space-y-4">
      <SourceModeBanner sourceMode={sourceMode} />

      {/* Header matching legacy renderDepartments() */}
      <div className="editorial-panel rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl text-pinkteam-charcoal">
            รายชื่อสมาชิกแยกตามฝ่ายงาน
          </h1>
          <p className="text-sm text-pinkteam-secondary mt-1">
            {query
              ? `พบผลการค้นหา "${searchQuery.trim()}" ทั้งหมด ${totalMatches} รายการ`
              : 'แตะเพื่อเปิดดูรายชื่อประธาน สตาฟ และสมาชิกในแต่ละฝ่าย'}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search
            className="w-4 h-4 text-pinkteam-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ, ชื่อเล่น, ห้อง หรือฝ่าย..."
            className="w-full min-h-[40px] pl-9 pr-8 py-2 rounded-lg border border-black/15 bg-white text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="ล้างคำค้นหา"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-pinkteam-muted hover:text-pinkteam-charcoal cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      {/* Central Committee Overview */}
      {(!query || visibleCentralPositions.length > 0) && (
        <div className="editorial-panel rounded-2xl p-5">
          <h2 className="font-display font-medium text-base text-pinkteam-charcoal mb-3 tabular-nums">
            คณะกรรมการบริหารส่วนกลาง ({centralMembers.length} / {CENTRAL_POSITIONS.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {visibleCentralPositions.map((pos) => {
              const holder = centralMembers.find((m) => m.centralPosition === pos);
              return (
                <div
                  key={pos}
                  className="rounded-xl editorial-raised p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-pinkteam-magenta">{pos}</div>
                    <div className="text-sm font-medium text-pinkteam-charcoal truncate mt-0.5">
                      {holder
                        ? `${holder.fullName}${holder.nickname ? ` (${holder.nickname})` : ''}${holder.classRoom ? ` · ${holder.classRoom}` : ''}`
                        : 'ว่าง'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {query && visibleCentralPositions.length === 0 && visibleDepartments.length === 0 && (
        <EmptyState
          title="ไม่พบรายชื่อที่ตรงกับคำค้นหา"
          description={`ไม่พบ "${searchQuery.trim()}" ลองค้นหาด้วยชื่อจริง ชื่อเล่น หรือห้อง เช่น ม.5/1`}
        />
      )}

      {/* 8 Legacy Expandable Department Accordions */}
      <div className="space-y-3">
        {visibleDepartments.map(({ dept, allMembers, filteredMembers }, deptIndex) => {
          const isOpen = query ? filteredMembers.length > 0 : openDeptName === dept.name;
          const noStaff = NO_STAFF_DEPARTMENTS.includes(dept.name) || dept.noStaff;

          return (
            <div key={dept.id} className="editorial-panel rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenDeptName(isOpen ? null : dept.name)}
                aria-expanded={isOpen}
                className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-pinkteam-blush/35 transition-colors duration-150 cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="w-8 h-8 rounded-lg editorial-raised flex items-center justify-center font-mono text-xs font-semibold text-pinkteam-magenta shrink-0 tabular-nums">
                    {String(deptIndex + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <div className="font-display font-semibold text-base text-pinkteam-charcoal truncate">
                      {dept.name}
                    </div>
                    <div className="text-xs text-pinkteam-secondary mt-0.5">
                      {dept.hasSports ? (
                        <>
                          ประธานฝ่าย · สตาฟ · นักกีฬา{' '}
                          <span className="text-amber-700 font-medium">
                            ({dept.closedNote || 'รอผลคัดตัว'})
                          </span>
                        </>
                      ) : noStaff ? (
                        'ประธานฝ่าย · สมาชิก'
                      ) : (
                        'ประธานฝ่าย · สตาฟ · สมาชิก'
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="px-2.5 py-1 rounded-full bg-pinkteam-blush text-pinkteam-magenta text-xs font-semibold tabular-nums">
                    {query ? `${filteredMembers.length} / ${allMembers.length} คน` : `${allMembers.length} คน`}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-pinkteam-muted transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    strokeWidth={1.5}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-2 border-t border-black/5 space-y-4 motion-enter">
                  {dept.hasSports ? (
                    <SportsDeptDetail members={filteredMembers} />
                  ) : dept.isStand ? (
                    <StandDeptDetail members={filteredMembers} />
                  ) : (
                    <GeneralDeptDetail
                      dept={dept}
                      members={filteredMembers}
                      noStaff={noStaff}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StudentNameChip({
  member,
  suffix,
  highlight = false,
}: {
  member: StudentWithCheckIn;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
        highlight
          ? 'bg-pinkteam-blush/80 border-pinkteam-magenta/25 text-pinkteam-magenta'
          : 'bg-white border-black/10 text-pinkteam-charcoal'
      }`}
    >
      <span>
        {member.fullName}
        {member.nickname ? ` (${member.nickname})` : ''}
        {suffix ? ` · ${suffix}` : ''}
      </span>
    </span>
  );
}

function GeneralDeptDetail({
  dept,
  members,
  noStaff,
}: {
  dept: DepartmentRecord;
  members: StudentWithCheckIn[];
  noStaff: boolean;
}) {
  const president = members.find((m) => m.position === 'ประธานฝ่าย');
  const deputy = dept.deputyLabel ? members.find((m) => m.position === dept.deputyLabel) : null;
  const staff = members.filter((m) => m.position === 'สตาฟฝ่าย');
  const regular = members.filter(
    (m) =>
      m.position !== 'ประธานฝ่าย' &&
      m.position !== dept.deputyLabel &&
      m.position !== 'สตาฟฝ่าย'
  );

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-xs font-semibold text-pinkteam-secondary mb-1.5">ประธานฝ่าย</h3>
        <div className="flex flex-wrap gap-2">
          {president ? (
            <StudentNameChip member={president} highlight />
          ) : (
            <span className="px-3 py-1.5 rounded-lg editorial-raised text-xs text-pinkteam-muted">
              ยังไม่มีผู้ดำรงตำแหน่ง
            </span>
          )}
        </div>
      </div>

      {dept.deputyLabel && (
        <div>
          <h3 className="text-xs font-semibold text-pinkteam-secondary mb-1.5">
            {dept.deputyLabel}
          </h3>
          <div className="flex flex-wrap gap-2">
            {deputy ? (
              <StudentNameChip member={deputy} highlight />
            ) : (
              <span className="px-3 py-1.5 rounded-lg editorial-raised text-xs text-pinkteam-muted">
                ยังไม่มีผู้ดำรงตำแหน่ง
              </span>
            )}
          </div>
        </div>
      )}

      {!noStaff && (
        <div>
          <h3 className="text-xs font-semibold text-pinkteam-secondary mb-1.5 tabular-nums">
            สตาฟฝ่าย ({staff.length} คน)
          </h3>
          <div className="flex flex-wrap gap-2">
            {staff.length > 0 ? (
              staff.map((m) => (
                <StudentNameChip key={m.id} member={m} suffix={m.classRoom} />
              ))
            ) : (
              <span className="px-3 py-1.5 rounded-lg editorial-raised text-xs text-pinkteam-muted">
                ยังไม่มีข้อมูล
              </span>
            )}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold text-pinkteam-secondary mb-1.5 tabular-nums">
          สมาชิกฝ่าย ({regular.length} คน)
        </h3>
        <div className="flex flex-wrap gap-2">
          {regular.length > 0 ? (
            regular.map((m) => (
              <StudentNameChip key={m.id} member={m} suffix={m.classRoom} />
            ))
          ) : (
            <span className="px-3 py-1.5 rounded-lg editorial-raised text-xs text-pinkteam-muted">
              ยังไม่มีข้อมูล
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StandDeptDetail({
  members,
}: {
  members: StudentWithCheckIn[];
}) {
  const mentors = members.filter((m) => !m.autoAssigned && !m.classRoom.startsWith('ม.1'));
  const m1Students = members.filter((m) => m.autoAssigned || m.classRoom.startsWith('ม.1'));

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-xs font-semibold text-pinkteam-secondary mb-1.5 tabular-nums">
          สตาฟพี่เลี้ยง (ประธาน / สตาฟฝ่าย) ({mentors.length} คน)
        </h3>
        <div className="flex flex-wrap gap-2">
          {mentors.length > 0 ? (
            mentors.map((m) => (
              <StudentNameChip
                key={m.id}
                member={m}
                suffix={`${m.classRoom} · ${m.position}`}
                highlight={m.position === 'ประธานฝ่าย'}
              />
            ))
          ) : (
            <span className="px-3 py-1.5 rounded-lg editorial-raised text-xs text-pinkteam-muted">
              ยังไม่มีข้อมูล
            </span>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-pinkteam-secondary mb-1.5 tabular-nums">
          น้อง ม.1 ({m1Students.length} คน)
        </h3>
        <div className="flex flex-wrap gap-2">
          {m1Students.length > 0 ? (
            m1Students.map((m) => (
              <StudentNameChip key={m.id} member={m} suffix={m.classRoom} />
            ))
          ) : (
            <span className="px-3 py-1.5 rounded-lg editorial-raised text-xs text-pinkteam-muted">
              ยังไม่มีข้อมูล
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SportsDeptDetail({
  members,
}: {
  members: StudentWithCheckIn[];
}) {
  const president = members.find((m) => m.position === 'ประธานฝ่าย');

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-xs font-semibold text-pinkteam-secondary mb-1.5">
          ประธานฝ่ายกีฬา (ภาพรวม)
        </h3>
        <div className="flex flex-wrap gap-2">
          {president ? (
            <StudentNameChip member={president} highlight />
          ) : (
            <span className="px-3 py-1.5 rounded-lg editorial-raised text-xs text-pinkteam-muted">
              ยังไม่มีผู้ดำรงตำแหน่ง
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {SPORT_TYPES.map((sport) => {
          const captain = members.find(
            (m) => m.sportType === sport && m.position === 'หัวหน้ากีฬา'
          );
          const staff = members.filter((m) => m.sportType === sport && m.position === 'สตาฟกีฬา');
          const athletes = members.filter(
            (m) =>
              m.sportType === sport &&
              m.position !== 'หัวหน้ากีฬา' &&
              m.position !== 'สตาฟกีฬา'
          );
          return (
            <div key={sport} className="rounded-xl editorial-raised p-3.5 space-y-2">
              <div className="font-display font-medium text-sm text-pinkteam-charcoal">{sport}</div>
              <div className="flex flex-wrap gap-1.5">
                {captain ? (
                  <StudentNameChip
                    member={captain}
                    suffix="หัวหน้า"
                    highlight
                  />
                ) : (
                  <span className="px-2.5 py-1 rounded-md bg-white border border-black/10 text-xs text-pinkteam-muted">
                    หัวหน้า: ว่าง
                  </span>
                )}
                {staff.map((m) => (
                  <StudentNameChip key={m.id} member={m} suffix="สตาฟ" />
                ))}
                {athletes.map((m) => (
                  <StudentNameChip
                    key={m.id}
                    member={m}
                    suffix="นักกีฬา"
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
