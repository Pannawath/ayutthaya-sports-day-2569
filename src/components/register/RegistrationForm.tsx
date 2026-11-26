'use client';

import React, { useMemo, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { ErrorState, SourceModeBanner, SuccessBanner } from '@/components/ui/States';
import {
  CENTRAL_POSITIONS,
  GRADES,
  LOCKED_ROOMS,
  NO_STAFF_DEPARTMENTS,
  NUMBERS,
  SPORT_TYPES,
} from '@/lib/constants';
import type {
  DepartmentRecord,
  RegistrationPolicies,
  StudentRecord,
} from '@/lib/types';

interface RegistrationFormProps {
  initialStudents: StudentRecord[];
  departments: DepartmentRecord[];
  policies: RegistrationPolicies;
  sourceMode: 'supabase' | 'legacy-readonly';
}

export function RegistrationForm({
  initialStudents,
  departments,
  policies,
  sourceMode,
}: RegistrationFormProps) {
  const [students, setStudents] = useState<StudentRecord[]>(initialStudents);
  const [studentCode, setStudentCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [classRoom, setClassRoom] = useState('');
  const [numberLabel, setNumberLabel] = useState('');
  const [roleCategory, setRoleCategory] = useState<'department' | 'central'>('department');
  const [centralPosition, setCentralPosition] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [position, setPosition] = useState('');
  const [sportType, setSportType] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    student: StudentRecord;
  } | null>(null);
  const [qrStudent, setQrStudent] = useState<StudentRecord | null>(null);
  const [lookupQuery, setLookupQuery] = useState('');

  const lookupMatches = useMemo(() => {
    const q = lookupQuery.trim().toLowerCase();
    if (!q) return [];
    return students
      .filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.nickname.toLowerCase().includes(q) ||
          s.classRoom.toLowerCase().includes(q) ||
          s.numberLabel.toLowerCase().includes(q) ||
          (s.studentCode || '').toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [students, lookupQuery]);

  const isM1Locked = policies.lockM1Registration && LOCKED_ROOMS.includes(classRoom);
  const selectedDeptMeta = departments.find((d) => d.name === departmentName) || null;

  const deptMemberCounts = useMemo(() => {
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

  const takenCentral = useMemo(
    () =>
      new Set(
        students
          .filter((s) => s.roleCategory === 'central' && s.centralPosition)
          .map((s) => s.centralPosition!)
      ),
    [students]
  );

  const availableDeptPositions = useMemo(() => {
    if (!selectedDeptMeta) return [];
    if (selectedDeptMeta.hasSports) return [];
    const base = ['ประธานฝ่าย', 'สตาฟฝ่าย', 'สมาชิกฝ่าย'];
    if (NO_STAFF_DEPARTMENTS.includes(selectedDeptMeta.name) || selectedDeptMeta.noStaff) {
      const idx = base.indexOf('สตาฟฝ่าย');
      if (idx > -1) base.splice(idx, 1);
    }
    if (selectedDeptMeta.deputyLabel) {
      base.splice(1, 0, selectedDeptMeta.deputyLabel);
    }
    return base;
  }, [selectedDeptMeta]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg(null);
    setSuccessInfo(null);

    if (!fullName.trim() || !nickname.trim() || !classRoom || !numberLabel) {
      setErrorMsg('กรุณากรอกชื่อ-นามสกุล, ชื่อเล่น, ชั้น/ห้อง และเลขที่ให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentCode: studentCode.trim() || null,
          fullName: fullName.trim(),
          nickname: nickname.trim(),
          classRoom,
          numberLabel,
          roleCategory: isM1Locked ? 'department' : roleCategory,
          centralPosition: roleCategory === 'central' ? centralPosition : null,
          departmentName: isM1Locked ? 'ฝ่ายสแตนเชียร์' : departmentName,
          position: isM1Locked
            ? 'สมาชิกฝ่าย'
            : roleCategory === 'central'
              ? centralPosition
              : position,
          sportType: selectedDeptMeta?.hasSports && position !== 'ประธานฝ่าย' ? sportType : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'ลงทะเบียนไม่สำเร็จ');
        return;
      }

      const created: StudentRecord = data.student;
      setStudents((prev) => [created, ...prev]);
      setSuccessInfo({
        message: data.message || `ลงทะเบียน ${created.fullName} เรียบร้อยแล้ว`,
        student: created,
      });
    } catch {
      setErrorMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 lg:pt-8 space-y-4">
      <SourceModeBanner sourceMode={sourceMode} />

      {/* Student Registration & QR Pass Self-Lookup */}
      <div className="editorial-panel rounded-2xl p-5 space-y-3">
        <div>
          <h2 className="font-display font-semibold text-base text-pinkteam-charcoal">
            ค้นหาสถานะลงทะเบียน / รับบัตร QR
          </h2>
          <p className="text-xs text-pinkteam-secondary mt-0.5">
            นักเรียนที่ลงทะเบียนแล้วสามารถค้นหาชื่อ ห้อง หรือเลขประจำตัว (เช่น 69001) เพื่อเปิดบัตร QR ได้ทันที
          </p>
        </div>
        <div className="relative">
          <Search
            className="w-4 h-4 text-pinkteam-muted absolute left-3 top-1/2 -translate-y-1/2"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={lookupQuery}
            onChange={(e) => setLookupQuery(e.target.value)}
            placeholder="พิมพ์ชื่อ, ชื่อเล่น, ห้อง หรือรหัส 5 หลัก"
            className="w-full min-h-[40px] pl-9 pr-3 py-2 rounded-lg border border-black/15 bg-white text-sm"
          />
        </div>
        {lookupQuery.trim() !== '' && (
          <div className="space-y-2 pt-1">
            {lookupMatches.length === 0 ? (
              <div className="text-xs text-pinkteam-muted py-1">
                ไม่พบรายชื่อที่ตรงกับ "{lookupQuery}" — สามารถกรอกแบบฟอร์มลงทะเบียนด้านล่างได้
              </div>
            ) : (
              lookupMatches.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl editorial-raised p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-display font-medium text-sm text-pinkteam-charcoal truncate">
                      {s.fullName} {s.nickname ? `(${s.nickname})` : ''}
                    </div>
                    <div className="text-xs text-pinkteam-secondary tabular-nums">
                      ห้อง {s.classRoom} · เลขที่ {s.numberLabel}
                      {s.studentCode ? ` · รหัส ${s.studentCode}` : ''} ·{' '}
                      {s.roleCategory === 'central' ? s.centralPosition : s.departmentName || '-'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="editorial-panel rounded-2xl p-5 sm:p-7">
        <div className="mb-6">
          <h1 className="font-display font-semibold text-2xl text-pinkteam-charcoal">
            ลงทะเบียนข้อมูลและฝ่ายงาน
          </h1>
          <p className="text-sm text-pinkteam-secondary mt-1">
            กรอกข้อมูลส่วนตัวและเลือกบทบาทหน้าที่ในคณะสีชมพู อยุธยา 2569
          </p>
        </div>

        <div className="space-y-3 mb-5">
          {errorMsg && <ErrorState message={errorMsg} />}
          {successInfo && <SuccessBanner message={successInfo.message} />}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h2 className="font-display font-medium text-sm text-pinkteam-charcoal border-b border-black/10 pb-2">
              ข้อมูลส่วนตัวนักเรียน
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-pinkteam-charcoal mb-1">
                  ชื่อ-นามสกุล <span className="text-pinkteam-magenta">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ชื่อ-นามสกุล"
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-pinkteam-charcoal mb-1">
                  ชื่อเล่น <span className="text-pinkteam-magenta">*</span>
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="ชื่อเล่น"
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-pinkteam-charcoal mb-1">
                  ชั้น / ห้อง <span className="text-pinkteam-magenta">*</span>
                </label>
                <select
                  value={classRoom}
                  onChange={(e) => setClassRoom(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-sm cursor-pointer"
                  required
                >
                  <option value="">เลือกชั้น / ห้อง</option>
                  {GRADES.map((g) => (
                    <optgroup key={g.grade} label={g.grade}>
                      {g.rooms.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-pinkteam-charcoal mb-1">
                  เลขที่และกลุ่ม <span className="text-pinkteam-magenta">*</span>
                </label>
                <select
                  value={numberLabel}
                  onChange={(e) => setNumberLabel(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-sm cursor-pointer"
                  required
                >
                  <option value="">เลือกเลขที่และกลุ่ม</option>
                  {NUMBERS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-pinkteam-muted mt-1">
                  เลขที่ 1–20 กลุ่ม ก และ 1–20 กลุ่ม ข
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="font-display font-medium text-sm text-pinkteam-charcoal border-b border-black/10 pb-2">
              ตำแหน่งและฝ่ายงาน
            </h2>

            {isM1Locked ? (
              <div className="rounded-xl editorial-raised p-4 text-sm text-pinkteam-charcoal leading-relaxed">
                ระบบล็อกคำตอบให้เข้า <strong className="font-semibold">ฝ่ายสแตนเชียร์</strong> ในสถานะ{' '}
                <strong className="font-semibold">สมาชิกฝ่าย</strong> โดยอัตโนมัติ หากต้องการตำแหน่งอื่น กรุณาแจ้งพี่สตาฟโดยตรง พี่สตาฟจะเป็นผู้แก้ไขข้อมูลในระบบให้
              </div>
            ) : (
              <>
                <div className="editorial-raised p-1.5 rounded-xl">
                  <div className="relative grid grid-cols-2 items-center">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-0 w-1/2 rounded-lg bg-pinkteam-magenta shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{
                        transform: `translate3d(${roleCategory === 'central' ? 100 : 0}%, 0, 0)`,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setRoleCategory('department');
                        setPosition('');
                      }}
                      className={`relative z-10 min-h-[40px] rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 cursor-pointer ${
                        roleCategory === 'department'
                          ? 'text-white'
                          : 'text-pinkteam-charcoal hover:text-pinkteam-magenta'
                      }`}
                    >
                      ฝ่ายงาน
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRoleCategory('central');
                        setPosition('');
                      }}
                      className={`relative z-10 min-h-[40px] rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 cursor-pointer ${
                        roleCategory === 'central'
                          ? 'text-white'
                          : 'text-pinkteam-charcoal hover:text-pinkteam-magenta'
                      }`}
                    >
                      ตำแหน่งบริหารคณะสี
                    </button>
                  </div>
                </div>

                {roleCategory === 'central' ? (
                  <div>
                    <label className="block text-xs font-medium text-pinkteam-charcoal mb-1">
                      ตำแหน่งบริหาร <span className="text-pinkteam-magenta">*</span>
                    </label>
                    <select
                      value={centralPosition}
                      onChange={(e) => setCentralPosition(e.target.value)}
                      className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-sm cursor-pointer"
                      required
                    >
                      <option value="">เลือกตำแหน่ง</option>
                      {CENTRAL_POSITIONS.map((pos) => {
                        const taken = takenCentral.has(pos);
                        return (
                          <option key={pos} value={pos} disabled={taken}>
                            {pos}
                            {taken ? ' (มีผู้รับแล้ว)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-pinkteam-charcoal mb-1">
                          ฝ่ายงาน <span className="text-pinkteam-magenta">*</span>
                        </label>
                        <select
                          value={departmentName}
                          onChange={(e) => {
                            setDepartmentName(e.target.value);
                            setPosition('');
                            setSportType('');
                          }}
                          className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-sm cursor-pointer"
                          required
                        >
                          <option value="">เลือกฝ่ายงาน</option>
                          {departments.map((dept) => {
                            const count = deptMemberCounts.get(dept.name) ?? 0;
                            const isM1 = classRoom.startsWith('ม.1');
                            if (dept.m1Only && policies.m1StandOnly && !isM1) {
                              return null;
                            }
                            const isFull =
                              typeof dept.maxCapacity === 'number' && count >= dept.maxCapacity;
                            let suffix = '';
                            if (dept.isClosed) {
                              suffix = ` (ปิดรับชั่วคราว - ${dept.closedNote || 'รอคัดตัว'})`;
                            } else if (typeof dept.maxCapacity === 'number') {
                              suffix = isFull
                                ? ` (เต็มแล้ว ${count}/${dept.maxCapacity} คน)`
                                : ` (เหลือ ${dept.maxCapacity - count} ที่ - ${count}/${dept.maxCapacity})`;
                            }
                            return (
                              <option
                                key={dept.id}
                                value={dept.name}
                                disabled={dept.isClosed || isFull}
                              >
                                {dept.name}
                                {suffix}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {selectedDeptMeta && !selectedDeptMeta.hasSports && (
                        <div>
                          <label className="block text-xs font-medium text-pinkteam-charcoal mb-1">
                            ตำแหน่ง <span className="text-pinkteam-magenta">*</span>
                          </label>
                          <select
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                            className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-sm cursor-pointer"
                            required
                          >
                            <option value="">เลือกตำแหน่ง</option>
                            {availableDeptPositions.map((pos) => {
                              const isTaken =
                                (pos === 'ประธานฝ่าย' &&
                                  students.some(
                                    (s) =>
                                      s.departmentName === selectedDeptMeta.name &&
                                      s.position === 'ประธานฝ่าย'
                                  )) ||
                                (pos === selectedDeptMeta.deputyLabel &&
                                  students.some(
                                    (s) =>
                                      s.departmentName === selectedDeptMeta.name &&
                                      s.position === selectedDeptMeta.deputyLabel
                                  ));
                              return (
                                <option key={pos} value={pos} disabled={isTaken}>
                                  {pos}
                                  {isTaken ? ' (มีผู้รับแล้ว)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}
                    </div>

                    {selectedDeptMeta?.hasSports && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-pinkteam-charcoal mb-1">
                            ประเภทกีฬา <span className="text-pinkteam-magenta">*</span>
                          </label>
                          <select
                            value={sportType}
                            onChange={(e) => setSportType(e.target.value)}
                            className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-sm cursor-pointer"
                          >
                            <option value="">เลือกประเภทกีฬา</option>
                            {SPORT_TYPES.map((sp) => (
                              <option key={sp} value={sp}>
                                {sp}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-pinkteam-charcoal mb-1">
                            ตำแหน่งกีฬา <span className="text-pinkteam-magenta">*</span>
                          </label>
                          <select
                            value={position}
                            onChange={(e) => setPosition(e.target.value)}
                            className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-sm cursor-pointer"
                            required
                          >
                            <option value="">เลือกตำแหน่ง</option>
                            {(() => {
                              const captainTaken = Boolean(
                                sportType &&
                                  students.some(
                                    (s) =>
                                      s.departmentName === selectedDeptMeta.name &&
                                      s.sportType === sportType &&
                                      s.position === 'หัวหน้ากีฬา'
                                  )
                              );
                              return (
                                <option value="หัวหน้ากีฬา" disabled={captainTaken}>
                                  หัวหน้ากีฬา{captainTaken ? ' (มีผู้รับแล้ว)' : ''}
                                </option>
                              );
                            })()}
                            <option value="สตาฟกีฬา">สตาฟกีฬา</option>
                            <option value="นักกีฬา">นักกีฬา</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="rounded-xl editorial-raised px-4 py-3 text-xs text-pinkteam-secondary leading-relaxed">
            ตำแหน่งสำคัญรับได้ตำแหน่งละ 1 คน ระบบตรวจสอบตำแหน่งว่างแบบเรียลไทม์จากข้อมูลจริง
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-pinkteam-magenta hover:bg-pinkteam-deep text-white font-display font-medium text-sm sm:text-base transition-colors duration-150 disabled:opacity-50 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" strokeWidth={1.5} />
            <span>{isSubmitting ? 'กำลังบันทึกข้อมูล' : 'บันทึกข้อมูล'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
