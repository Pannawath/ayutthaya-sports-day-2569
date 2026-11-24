'use client';

import React, { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState, SourceModeBanner } from '@/components/ui/States';
import type { AttendanceSummaryStats, CheckInSessionRecord } from '@/lib/types';

interface StatisticsDashboardProps {
  initialStats: AttendanceSummaryStats;
  sessions: CheckInSessionRecord[];
}

export function StatisticsDashboard({
  initialStats,
  sessions,
}: StatisticsDashboardProps) {
  const [stats, setStats] = useState<AttendanceSummaryStats>(initialStats);
  const [sessionId, setSessionId] = useState<string>(initialStats.activeSession?.id || '');
  const [range, setRange] = useState<'all' | 'today' | '7d'>('all');
  const [loading, setLoading] = useState(false);

  async function refreshStats(nextSessionId: string, nextRange: 'all' | 'today' | '7d') {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/statistics?range=${nextRange}${
          nextSessionId ? `&sessionId=${encodeURIComponent(nextSessionId)}` : ''
        }`
      );
      if (res.ok) {
        const json = await res.json();
        setStats(json);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 lg:pt-8 space-y-5">
      <SourceModeBanner sourceMode={stats.sourceMode} />

      <div className="editorial-panel rounded-3xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex px-2.5 py-0.5 rounded-full bg-pinkteam-blush text-pinkteam-magenta text-xs font-bold">
            06 · REAL-TIME STATISTICS
          </span>
          <h1 className="mt-1.5 font-display font-extrabold text-2xl text-pinkteam-charcoal">
            สถิติและกราฟวิเคราะห์การเข้าร่วม
          </h1>
          <p className="text-sm text-pinkteam-muted">
            อัปเดตตรงจากฐานข้อมูล แยกตามฝ่าย ระดับชั้น ห้องเรียน และช่วงเวลา
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sessions.length > 0 && (
            <select
              value={sessionId}
              onChange={(e) => {
                setSessionId(e.target.value);
                refreshStats(e.target.value, range);
              }}
              aria-label="เลือกรอบกิจกรรม"
              className="px-3 py-2 rounded-xl border border-pinkteam-soft bg-white text-xs sm:text-sm font-semibold"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          )}
          <div className="flex rounded-xl bg-pinkteam-blush p-1 border border-pinkteam-soft">
            {(
              [
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'today', label: 'วันนี้' },
                { id: '7d', label: '7 วัน' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setRange(opt.id);
                  refreshStats(sessionId, opt.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  range === opt.id
                    ? 'bg-pinkteam-magenta text-white'
                    : 'text-pinkteam-charcoal'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 opacity-100">
        <div className="editorial-panel rounded-2xl p-4">
          <div className="text-xs font-semibold text-pinkteam-muted">นักเรียนทั้งหมด</div>
          <div className="font-display font-extrabold text-3xl text-pinkteam-charcoal mt-1">
            {loading ? '...' : stats.totalStudents}
          </div>
        </div>
        <div className="editorial-panel rounded-2xl p-4">
          <div className="text-xs font-semibold text-emerald-700">เข้าร่วมแล้ว</div>
          <div className="font-display font-extrabold text-3xl text-emerald-600 mt-1">
            {loading ? '...' : stats.checkedInCount}
          </div>
        </div>
        <div className="editorial-panel rounded-2xl p-4">
          <div className="text-xs font-semibold text-amber-700">ยังไม่มา</div>
          <div className="font-display font-extrabold text-3xl text-amber-600 mt-1">
            {loading ? '...' : stats.pendingCount}
          </div>
        </div>
        <div className="figma-charcoal-surface text-white rounded-2xl p-4">
          <div className="text-xs font-semibold text-pinkteam-light">เปอร์เซ็นต์เข้าร่วม</div>
          <div className="font-display font-extrabold text-3xl mt-1">
            {loading ? '...' : `${stats.attendanceRate}%`}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Department Bar Chart */}
        <div className="editorial-panel rounded-3xl p-5">
          <h2 className="font-display font-bold text-base text-pinkteam-charcoal mb-3">
            จำนวนสมาชิกและผู้มาเข้าร่วมแยกตามฝ่าย (8 ฝ่าย)
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byDepartment} margin={{ top: 8, right: 12, left: -16, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3d5e0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#1F1216' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={56}
                />
                <YAxis tick={{ fontSize: 11, fill: '#6B4E57' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="present" name="มาแล้ว" stackId="a" fill="#B32151" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pending" name="ยังไม่มา" stackId="a" fill="#FFAFCA" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grade Bar Chart */}
        <div className="editorial-panel rounded-3xl p-5">
          <h2 className="font-display font-bold text-base text-pinkteam-charcoal mb-3">
            สถิติแยกตามระดับชั้น (ม.1 – ม.6)
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byGrade} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3d5e0" />
                <XAxis dataKey="grade" tick={{ fontSize: 12, fill: '#1F1216' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B4E57' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="present" name="มาแล้ว" stackId="g" fill="#1F1216" />
                <Bar dataKey="pending" name="ยังไม่มา" stackId="g" fill="#FFAFCA" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Timeline Trend Chart */}
      <div className="editorial-panel rounded-3xl p-5">
        <h2 className="font-display font-bold text-base text-pinkteam-charcoal mb-3">
          แนวโน้มการเช็คชื่อตามช่วงเวลา
        </h2>
        {stats.timeline.length === 0 ? (
          <EmptyState
            title="ยังไม่มีข้อมูลเวลาเช็คชื่อในช่วงนี้"
            description="กราฟแนวโน้มจะปรากฏขึ้นอัตโนมัติทันทีที่มีเจ้าหน้าที่บันทึกเช็คชื่อในรอบที่เลือก"
          />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.timeline} margin={{ top: 8, right: 16, left: -16, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3d5e0" />
                <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: '#1F1216' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B4E57' }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  name="ยอดสะสม"
                  stroke="#B32151"
                  fill="#FFAFCA"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Room Breakdown Table */}
      <div className="editorial-panel rounded-3xl p-5 overflow-x-auto">
        <h2 className="font-display font-bold text-base text-pinkteam-charcoal mb-3">
          ตารางสถิติรายห้องเรียน (21 ห้อง)
        </h2>
        <table className="w-full text-sm border-collapse min-w-[480px]">
          <thead>
            <tr className="border-b border-pinkteam-soft text-left text-xs text-pinkteam-muted">
              <th className="py-2 pr-3">ห้อง</th>
              <th className="py-2 pr-3">ระดับชั้น</th>
              <th className="py-2 pr-3">ทั้งหมด</th>
              <th className="py-2 pr-3">มาแล้ว</th>
              <th className="py-2 pr-3">ยังไม่มา</th>
              <th className="py-2">เข้าร่วม (%)</th>
            </tr>
          </thead>
          <tbody>
            {stats.byRoom.map((r) => (
              <tr key={r.room} className="border-b border-pinkteam-blush last:border-0">
                <td className="py-2 pr-3 font-bold text-pinkteam-charcoal">{r.room}</td>
                <td className="py-2 pr-3 text-pinkteam-muted">{r.grade}</td>
                <td className="py-2 pr-3">{r.total}</td>
                <td className="py-2 pr-3 text-emerald-700 font-semibold">{r.present}</td>
                <td className="py-2 pr-3 text-amber-700">{r.pending}</td>
                <td className="py-2 font-semibold text-pinkteam-magenta">{r.rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
