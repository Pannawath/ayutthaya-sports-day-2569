'use client';

import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Building2, Search } from 'lucide-react';
import { useHomeView } from '@/components/home/HomeViewContext';
import { CENTRAL_POSITIONS, GRADES, NO_STAFF_DEPARTMENTS, SPORT_TYPES } from '@/lib/constants';
import type { DepartmentRecord, StudentRecord } from '@/lib/types';

type HomeSubTab = 'overview' | 'structure' | 'stats';

interface HomeLegacyTabsProps {
  students: StudentRecord[];
  departments: DepartmentRecord[];
}

export function HomeLegacyTabs({ students, departments }: HomeLegacyTabsProps) {
  const { openView } = useHomeView();
  const [activeTab, setActiveTab] = useState<HomeSubTab>('overview');

  const tabIndex = activeTab === 'overview' ? 0 : activeTab === 'structure' ? 1 : 2;
  const allRoomsCount = useMemo(() => GRADES.reduce((sum, g) => sum + g.rooms.length, 0), []);

  const deptCounts = useMemo(() => {
    const map = new Map<string, number>();
    departments.forEach((dept) => {
      const seen = new Set(
        students
          .filter((s) => s.departmentName === dept.name)
          .map((s) => `${s.classRoom}|${s.numberLabel}`)
      );
      map.set(dept.name, seen.size);
    });
    return map;
  }, [students, departments]);

  const roomCounts = useMemo(() => {
    const map = new Map<string, number>();
    students.forEach((s) => {
      map.set(s.classRoom, (map.get(s.classRoom) ?? 0) + 1);
    });
    return map;
  }, [students]);

  const centralHolders = useMemo(() => {
    const map = new Map<string, StudentRecord>();
    students
      .filter((s) => s.roleCategory === 'central' && s.centralPosition)
      .forEach((s) => map.set(s.centralPosition!, s));
    return map;
  }, [students]);

  return (
    <div className="space-y-6">
      {/* Intro Heading + Directory Shortcuts + 4 Stat Pills */}
      <section className="editorial-panel rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-semibold text-xl sm:text-2xl text-pinkteam-charcoal">
              ข้อมูลห้องเรียนและรายชื่อฝ่ายงาน คณะสีชมพู 2569
            </h1>
            <p className="text-sm text-pinkteam-secondary mt-1">
              ตรวจสอบรายชื่อสมาชิกแต่ละฝ่ายงานและห้องเรียนในคณะอยุธยา โรงเรียนสารคามพิทยาคม
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => openView('departments', { dept: null })}
              className="btn-animated min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pinkteam-magenta hover:bg-pinkteam-deep text-white font-display font-medium text-sm cursor-pointer"
            >
              <Building2 className="w-4 h-4" strokeWidth={1.5} />
              <span>ดูรายชื่อตามฝ่าย</span>
            </button>
            <button
              type="button"
              onClick={() => openView('classrooms', { grade: 'ALL', room: '' })}
              className="btn-animated min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-lg editorial-raised hover:bg-black/5 text-pinkteam-charcoal font-display font-medium text-sm cursor-pointer"
            >
              <Search className="w-4 h-4 text-pinkteam-muted" strokeWidth={1.5} />
              <span>ดูรายชื่อตามห้อง</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl editorial-raised p-4">
            <div className="text-xs text-pinkteam-muted">ระดับชั้น</div>
            <div className="mt-0.5 font-display font-semibold text-2xl sm:text-3xl text-pinkteam-charcoal tabular-nums">
              {GRADES.length}
            </div>
            <div className="text-xs text-pinkteam-secondary mt-0.5">ม.1 – ม.6</div>
          </div>
          <div className="rounded-xl editorial-raised p-4">
            <div className="text-xs text-pinkteam-muted">ห้องเรียนในสีชมพู</div>
            <div className="mt-0.5 font-display font-semibold text-2xl sm:text-3xl text-pinkteam-charcoal tabular-nums">
              {allRoomsCount}
            </div>
            <div className="text-xs text-pinkteam-secondary mt-0.5">ห้องในคณะสี</div>
          </div>
          <div className="rounded-xl editorial-raised p-4">
            <div className="text-xs text-pinkteam-muted">ฝ่ายงาน</div>
            <div className="mt-0.5 font-display font-semibold text-2xl sm:text-3xl text-pinkteam-charcoal tabular-nums">
              {departments.length}
            </div>
            <div className="text-xs text-pinkteam-secondary mt-0.5">ฝ่ายหลักทั้งหมด</div>
          </div>
          <div className="rounded-xl editorial-raised p-4">
            <div className="text-xs text-pinkteam-muted">สมาชิกในรายชื่อ</div>
            <div className="mt-0.5 font-display font-semibold text-2xl sm:text-3xl text-pinkteam-magenta tabular-nums">
              {students.length}
            </div>
            <div className="text-xs text-pinkteam-secondary mt-0.5">สมาชิกคณะสีชมพูทั้งหมด</div>
          </div>
        </div>
      </section>

      {/* Sliding 3-Slot Segmented Control */}
      <div className="editorial-panel rounded-xl p-1.5">
        <div className="relative grid grid-cols-3 items-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 rounded-lg bg-pinkteam-magenta shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translate3d(${tabIndex * 100}%, 0, 0)` }}
          />
          {(
            [
              { id: 'overview', label: 'ห้องเรียนในสี' },
              { id: 'structure', label: 'รายชื่อฝ่ายงาน' },
              { id: 'stats', label: 'สรุปภาพรวม' },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative z-10 min-h-[40px] px-2 py-2 rounded-lg text-xs sm:text-sm font-display font-medium transition-colors duration-200 cursor-pointer ${
                  active ? 'text-white' : 'text-pinkteam-charcoal hover:text-pinkteam-magenta'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Tab 1: ห้องเรียนในสี */}
      {activeTab === 'overview' && (
        <section key="tab-overview" className="space-y-4 motion-enter">
          <div>
            <h2 className="font-display font-semibold text-lg text-pinkteam-charcoal">
              ห้องเรียนที่สังกัดคณะสีชมพู (ม.1 – ม.6 ทั้งหมด {allRoomsCount} ห้อง)
            </h2>
            <p className="text-xs sm:text-sm text-pinkteam-secondary">
              แตะที่ระดับชั้นหรือห้องเรียนเพื่อเปิดดูรายชื่อสมาชิกและฝ่ายที่สังกัดของแต่ละห้อง
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {GRADES.map((g) => (
              <div
                key={g.grade}
                className="editorial-panel rounded-xl p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => openView('classrooms', { grade: g.grade, room: '' })}
                      className="font-display font-semibold text-base text-pinkteam-charcoal hover:text-pinkteam-magenta inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>ระดับชั้น {g.grade}</span>
                      <ArrowUpRight className="w-4 h-4 text-pinkteam-muted" strokeWidth={1.5} />
                    </button>
                    <span className="text-xs text-pinkteam-secondary tabular-nums">
                      {g.rooms.length} ห้อง
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.rooms.map((room) => {
                      const count = roomCounts.get(room) ?? 0;
                      return (
                        <button
                          key={room}
                          type="button"
                          onClick={() => openView('classrooms', { grade: g.grade, room })}
                          className="btn-animated px-2.5 py-1.5 rounded-md editorial-raised hover:border-pinkteam-magenta/40 text-xs font-medium text-pinkteam-charcoal tabular-nums inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{room}</span>
                          <span className="text-pinkteam-magenta font-semibold">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {g.locked && (
                  <div className="rounded-lg bg-pinkteam-blush/70 px-3 py-2 text-xs text-pinkteam-magenta font-medium">
                    น้อง ม.1 ประจำฝ่ายสแตนเชียร์
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sub-Tab 2: รายชื่อฝ่ายงาน */}
      {activeTab === 'structure' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display font-semibold text-lg text-pinkteam-charcoal">
                โครงสร้างและรายชื่อฝ่ายงานคณะสีชมพู
              </h2>
              <p className="text-xs sm:text-sm text-pinkteam-secondary">
                แตะที่การ์ดฝ่ายงานเพื่อเปิดดูรายชื่อประธาน สตาฟ และสมาชิกทั้งหมดในฝ่ายนั้น
              </p>
            </div>
            <button
              type="button"
              onClick={() => openView('departments', { dept: null })}
              className="text-xs font-semibold text-pinkteam-magenta hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>ดูรายชื่อครบทุกฝ่าย</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="editorial-panel rounded-xl p-4 sm:p-5 space-y-2.5">
            <h3 className="font-display font-medium text-sm text-pinkteam-magenta">
              คณะกรรมการบริหารส่วนกลาง
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {CENTRAL_POSITIONS.map((pos) => {
                const holder = centralHolders.get(pos);
                return (
                  <div
                    key={pos}
                    className="px-3 py-2 rounded-lg editorial-raised flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-medium text-pinkteam-magenta shrink-0">{pos}</span>
                    <span className="text-pinkteam-charcoal font-medium truncate">
                      {holder
                        ? `${holder.fullName}${holder.nickname ? ` (${holder.nickname})` : ''}`
                        : 'ว่าง'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {departments.map((dept, idx) => {
              const currentCount = deptCounts.get(dept.name) ?? 0;
              const noStaff = NO_STAFF_DEPARTMENTS.includes(dept.name) || dept.noStaff;
              const president = students.find(
                (s) => s.departmentName === dept.name && s.position === 'ประธานฝ่าย'
              );
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => openView('departments', { dept: dept.name })}
                  className="btn-animated editorial-panel rounded-xl p-4 hover:border-pinkteam-magenta/35 space-y-2 cursor-pointer flex flex-col justify-between text-left"
                >
                  <div className="space-y-1.5 w-full">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-pinkteam-muted tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-pinkteam-blush text-pinkteam-magenta text-xs font-semibold tabular-nums">
                        {currentCount} คน
                      </span>
                    </div>
                    <h4 className="font-display font-semibold text-sm sm:text-base text-pinkteam-charcoal">
                      {dept.name}
                    </h4>
                    <div className="text-xs text-pinkteam-secondary">
                      {noStaff ? 'ประธานฝ่าย · สมาชิกฝ่าย' : 'ประธานฝ่าย · สตาฟ · สมาชิก'}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-black/5 text-xs text-pinkteam-secondary truncate w-full">
                    ประธาน:{' '}
                    <strong className="text-pinkteam-charcoal">
                      {president
                        ? `${president.fullName}${president.nickname ? ` (${president.nickname})` : ''}`
                        : 'ดูรายชื่อในฝ่าย'}
                    </strong>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="editorial-panel rounded-xl p-4 sm:p-5 space-y-2.5">
            <div>
              <h3 className="font-display font-medium text-sm text-pinkteam-magenta">
                ประเภทกีฬา (10 ชนิดกีฬา)
              </h3>
              <p className="text-xs text-pinkteam-secondary mt-0.5">
                แต่ละประเภทมีหัวหน้ากีฬา 1 คน พร้อมสตาฟและนักกีฬาประจำชนิดกีฬา
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SPORT_TYPES.map((sport) => (
                <button
                  key={sport}
                  type="button"
                  onClick={() => openView('departments', { dept: 'ฝ่ายกีฬา' })}
                  className="px-3 py-1.5 rounded-lg editorial-raised hover:border-pinkteam-magenta/35 text-xs font-medium text-pinkteam-charcoal cursor-pointer"
                >
                  {sport}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sub-Tab 3: สรุปภาพรวม */}
      {activeTab === 'stats' && (
        <section className="space-y-4">
          <div>
            <h2 className="font-display font-semibold text-lg text-pinkteam-charcoal">
              สรุปจำนวนสมาชิกแต่ละฝ่ายงานและคณะกรรมการ
            </h2>
            <p className="text-xs sm:text-sm text-pinkteam-secondary">
              อัปเดตแบบเรียลไทม์จากฐานข้อมูลคณะสีชมพู
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="editorial-panel rounded-xl p-5 space-y-2.5">
              <h3 className="font-display font-semibold text-base text-pinkteam-charcoal pb-2 border-b border-black/10">
                จำนวนสมาชิกแยกตามฝ่ายงาน
              </h3>
              <div className="divide-y divide-black/5">
                {departments.map((dept) => {
                  const count = deptCounts.get(dept.name) ?? 0;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => openView('departments', { dept: dept.name })}
                      className="w-full py-2 flex items-center justify-between text-sm tabular-nums hover:text-pinkteam-magenta cursor-pointer text-left"
                    >
                      <span className="text-pinkteam-charcoal">{dept.name}</span>
                      <span className="font-semibold text-pinkteam-magenta">
                        {count} คน
                        {typeof dept.maxCapacity === 'number' ? ` / ${dept.maxCapacity}` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="editorial-panel rounded-xl p-5 space-y-2.5">
              <h3 className="font-display font-semibold text-base text-pinkteam-charcoal pb-2 border-b border-black/10">
                รายชื่อคณะกรรมการส่วนกลาง
              </h3>
              <div className="divide-y divide-black/5">
                {CENTRAL_POSITIONS.map((pos) => {
                  const holder = centralHolders.get(pos);
                  return (
                    <div
                      key={pos}
                      className="py-2 flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-pinkteam-secondary font-medium shrink-0">{pos}</span>
                      <span
                        className={`truncate ${
                          holder ? 'font-medium text-pinkteam-charcoal' : 'text-pinkteam-muted'
                        }`}
                      >
                        {holder
                          ? `${holder.fullName}${holder.nickname ? ` (${holder.nickname})` : ''}`
                          : 'ว่าง'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
