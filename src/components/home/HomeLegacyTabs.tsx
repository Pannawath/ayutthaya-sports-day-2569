'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Search, UserPlus } from 'lucide-react';
import { CENTRAL_POSITIONS, GRADES, NO_STAFF_DEPARTMENTS, SPORT_TYPES } from '@/lib/constants';
import type { DepartmentRecord, StudentRecord } from '@/lib/types';

type HomeSubTab = 'overview' | 'structure' | 'stats';

interface HomeLegacyTabsProps {
  students: StudentRecord[];
  departments: DepartmentRecord[];
}

export function HomeLegacyTabs({ students, departments }: HomeLegacyTabsProps) {
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

  const centralHolders = useMemo(() => {
    const map = new Map<string, StudentRecord>();
    students
      .filter((s) => s.roleCategory === 'central' && s.centralPosition)
      .forEach((s) => map.set(s.centralPosition!, s));
    return map;
  }, [students]);

  return (
    <div className="space-y-6">
      {/* Intro Heading + 2 Primary Legacy CTAs + 4 Stat Pills */}
      <section className="editorial-panel rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-semibold text-xl sm:text-2xl text-pinkteam-charcoal">
              ระบบลงทะเบียนและตรวจสอบรายชื่อ คณะสีชมพู 2569
            </h1>
            <p className="text-sm text-pinkteam-secondary mt-1">
              จัดสรรบทบาทหน้าที่และตรวจสอบฝ่ายงาน คณะอยุธยา โรงเรียนสารคามพิทยาคม
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/register"
              className="btn-animated min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pinkteam-magenta hover:bg-pinkteam-deep text-white font-display font-medium text-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" strokeWidth={1.5} />
              <span>ลงทะเบียนบทบาท</span>
            </Link>
            <Link
              href="/classrooms"
              className="btn-animated min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-lg editorial-raised hover:bg-black/5 text-pinkteam-charcoal font-display font-medium text-sm cursor-pointer"
            >
              <Search className="w-4 h-4 text-pinkteam-muted" strokeWidth={1.5} />
              <span>ค้นหารายชื่อ</span>
            </Link>
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
            <div className="text-xs text-pinkteam-muted">ห้องเรียน</div>
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
            <div className="text-xs text-pinkteam-muted">ผู้ลงทะเบียน</div>
            <div className="mt-0.5 font-display font-semibold text-2xl sm:text-3xl text-pinkteam-magenta tabular-nums">
              {students.length}
            </div>
            <div className="text-xs text-pinkteam-secondary mt-0.5">ข้อมูลสดจากฐานข้อมูลจริง</div>
          </div>
        </div>
      </section>

      {/* Sliding 3-Slot Segmented Control (matching legacy app.js renderHomeSegmentedTabs) */}
      <div className="editorial-panel rounded-xl p-1.5">
        <div className="relative grid grid-cols-3 items-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 rounded-lg bg-pinkteam-magenta shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translate3d(${tabIndex * 100}%, 0, 0)` }}
          />
          {(
            [
              { id: 'overview', label: 'ภาพรวมระดับชั้น' },
              { id: 'structure', label: 'โครงสร้างฝ่ายงาน' },
              { id: 'stats', label: 'สถิติล่าสุด' },
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

      {/* Sub-Tab 1: ภาพรวมระดับชั้น */}
      {activeTab === 'overview' && (
        <section className="space-y-4">
          <div>
            <h2 className="font-display font-semibold text-lg text-pinkteam-charcoal">
              กลุ่มห้องเรียนที่เข้าร่วม
            </h2>
            <p className="text-xs sm:text-sm text-pinkteam-secondary">
              เลือกดูห้องเรียนและสิทธิ์การลงทะเบียนของแต่ละระดับชั้น
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {GRADES.map((g) => (
              <Link
                key={g.grade}
                href={`/classrooms?grade=${encodeURIComponent(g.grade)}`}
                className="btn-animated group editorial-panel rounded-xl p-4 hover:border-pinkteam-magenta/35 flex flex-col justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-base text-pinkteam-charcoal">
                      {g.grade}
                    </h3>
                    <ArrowUpRight className="w-4 h-4 text-pinkteam-muted group-hover:text-pinkteam-magenta" strokeWidth={1.5} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.rooms.map((room) => (
                      <span
                        key={room}
                        className="px-2.5 py-1 rounded-md editorial-raised text-xs font-medium text-pinkteam-charcoal tabular-nums"
                      >
                        {room}
                      </span>
                    ))}
                  </div>
                </div>
                {g.locked && g.note && (
                  <div className="rounded-lg bg-pinkteam-blush/70 px-3 py-2 text-xs text-pinkteam-magenta font-medium">
                    {g.note}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Sub-Tab 2: โครงสร้างฝ่ายงาน */}
      {activeTab === 'structure' && (
        <section className="space-y-4">
          <div>
            <h2 className="font-display font-semibold text-lg text-pinkteam-charcoal">
              โครงสร้างตำแหน่งคณะสี
            </h2>
            <p className="text-xs sm:text-sm text-pinkteam-secondary">
              การจัดสรรและอัตรากำลังคนของแต่ละฝ่าย
            </p>
          </div>

          <div className="editorial-panel rounded-xl p-4 sm:p-5 space-y-2.5">
            <h3 className="font-display font-medium text-sm text-pinkteam-magenta">
              ตำแหน่งบริหารคณะสี (ตำแหน่งละ 1 คน)
            </h3>
            <div className="flex flex-wrap gap-2">
              {CENTRAL_POSITIONS.map((pos) => (
                <span
                  key={pos}
                  className="px-3 py-1.5 rounded-lg editorial-raised text-xs font-medium text-pinkteam-charcoal"
                >
                  {pos}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {departments.map((dept, idx) => {
              const currentCount = deptCounts.get(dept.name) ?? 0;
              const noStaff = NO_STAFF_DEPARTMENTS.includes(dept.name) || dept.noStaff;
              return (
                <Link
                  key={dept.id}
                  href={`/departments?dept=${encodeURIComponent(dept.name)}`}
                  className="btn-animated editorial-panel rounded-xl p-4 hover:border-pinkteam-magenta/35 space-y-2 cursor-pointer"
                >
                  <div className="text-xs font-mono text-pinkteam-muted tabular-nums">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <h4 className="font-display font-semibold text-sm sm:text-base text-pinkteam-charcoal">
                    {dept.name}
                  </h4>
                  <div className="text-xs text-pinkteam-secondary">
                    {noStaff ? 'ประธานฝ่าย · สมาชิกฝ่าย' : 'ประธานฝ่าย · สตาฟ · สมาชิก'}
                  </div>
                  {dept.deputyLabel && (
                    <div className="text-xs font-medium text-pinkteam-magenta">
                      {dept.deputyLabel} 1 คน
                    </div>
                  )}
                  {dept.isStand && (
                    <div className="text-xs font-medium text-pinkteam-magenta">
                      ม.1 เข้าเป็นสมาชิกฝ่าย
                    </div>
                  )}
                  {typeof dept.maxCapacity === 'number' && (
                    <div className="text-xs font-semibold text-pinkteam-magenta tabular-nums">
                      รับจำกัด {dept.maxCapacity} คน (ลงทะเบียนแล้ว {currentCount} คน)
                    </div>
                  )}
                  {dept.isClosed && (
                    <div className="text-xs text-amber-700 font-medium">
                      ปิดรับชั่วคราว ({dept.closedNote || 'รอคัดตัว'})
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="editorial-panel rounded-xl p-4 sm:p-5 space-y-2.5">
            <div>
              <h3 className="font-display font-medium text-sm text-pinkteam-magenta">
                ประเภทกีฬา (10 ชนิดกีฬา)
              </h3>
              <p className="text-xs text-pinkteam-secondary mt-0.5">
                แต่ละประเภทมีหัวหน้ากีฬา 1 คน พร้อมสตาฟและนักกีฬา
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SPORT_TYPES.map((sport) => (
                <span
                  key={sport}
                  className="px-3 py-1.5 rounded-lg editorial-raised text-xs font-medium text-pinkteam-charcoal"
                >
                  {sport}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sub-Tab 3: สถิติล่าสุด */}
      {activeTab === 'stats' && (
        <section className="space-y-4">
          <div>
            <h2 className="font-display font-semibold text-lg text-pinkteam-charcoal">
              รายงานจำนวนสมาชิกล่าสุด
            </h2>
            <p className="text-xs sm:text-sm text-pinkteam-secondary">
              อัปเดตแบบเรียลไทม์จากข้อมูลจริง
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="editorial-panel rounded-xl p-5 space-y-2.5">
              <h3 className="font-display font-semibold text-base text-pinkteam-charcoal pb-2 border-b border-black/10">
                สรุปจำนวนคนตามฝ่ายงาน
              </h3>
              <div className="divide-y divide-black/5">
                {departments.map((dept) => {
                  const count = deptCounts.get(dept.name) ?? 0;
                  return (
                    <div
                      key={dept.id}
                      className="py-2 flex items-center justify-between text-sm tabular-nums"
                    >
                      <span className="text-pinkteam-charcoal">{dept.name}</span>
                      <span className="font-semibold text-pinkteam-magenta">
                        {count} คน
                        {typeof dept.maxCapacity === 'number' ? ` / ${dept.maxCapacity}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="editorial-panel rounded-xl p-5 space-y-2.5">
              <h3 className="font-display font-semibold text-base text-pinkteam-charcoal pb-2 border-b border-black/10">
                คณะกรรมการส่วนกลาง
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
