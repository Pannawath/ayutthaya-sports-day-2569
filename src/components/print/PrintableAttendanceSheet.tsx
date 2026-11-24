'use client';

import React from 'react';
import type { StudentWithCheckIn } from '@/lib/types';

interface PrintableAttendanceSheetProps {
  title: string;
  sessionTitle?: string;
  students: StudentWithCheckIn[];
}

export function PrintableAttendanceSheet({
  title,
  sessionTitle,
  students,
}: PrintableAttendanceSheetProps) {
  const sorted = students
    .slice()
    .sort(
      (a, b) =>
        a.classRoom.localeCompare(b.classRoom, 'th') ||
        a.numberLabel.localeCompare(b.numberLabel, 'th')
    );

  return (
    <div className="hidden print-only bg-white text-black p-4">
      <div className="flex items-start justify-between border-b-2 border-black pb-3 mb-4">
        <div>
          <h1 className="text-xl font-bold">ใบเช็คชื่อสมาชิกคณะสีชมพู (อยุธยา 2569)</h1>
          <p className="text-sm mt-0.5">{title}</p>
          {sessionTitle && <p className="text-xs text-gray-700">รอบกิจกรรม: {sessionTitle}</p>}
        </div>
        <div className="text-right text-xs">
          <p>ทั้งหมด: {sorted.length} คน</p>
          <p>พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')}</p>
        </div>
      </div>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black px-2 py-1.5 w-8 text-center">#</th>
            <th className="border border-black px-2 py-1.5 w-20 text-left">ห้อง/เลขที่</th>
            <th className="border border-black px-2 py-1.5 w-24 text-left">เลขประจำตัว</th>
            <th className="border border-black px-2 py-1.5 text-left">ชื่อ-นามสกุล (ชื่อเล่น)</th>
            <th className="border border-black px-2 py-1.5 text-left">ฝ่าย / ตำแหน่ง</th>
            <th className="border border-black px-2 py-1.5 w-16 text-center">มา</th>
            <th className="border border-black px-2 py-1.5 w-28 text-left">หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, idx) => (
            <tr key={s.id}>
              <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
              <td className="border border-black px-2 py-1 font-medium">
                {s.classRoom} ({s.numberLabel})
              </td>
              <td className="border border-black px-2 py-1">{s.studentCode || '-'}</td>
              <td className="border border-black px-2 py-1">
                {s.fullName} {s.nickname ? `(${s.nickname})` : ''}
              </td>
              <td className="border border-black px-2 py-1">
                {s.roleCategory === 'central'
                  ? s.centralPosition
                  : `${s.departmentName || '-'} · ${s.position}`}
              </td>
              <td className="border border-black px-2 py-1 text-center font-bold">
                {s.checkedIn ? '[ / ]' : '[   ]'}
              </td>
              <td className="border border-black px-2 py-1" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
