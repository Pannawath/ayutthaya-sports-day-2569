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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 lg:pt-8 space-y-4">
      <SourceModeBanner sourceMode={stats.sourceMode} />

      <div className="editorial-panel rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl text-pinkteam-charcoal">
            สถิติการเข้าร่วมกิจกรรม
          </h1>
          <p className="text-sm text-pinkteam-secondary mt-1">
            ข้อมูลตรงจากฐานข้อมูล แยกตามฝ่าย ระดับชั้น ห้องเรียน และช่วงเวลา
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
              className="min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-xs sm:text-sm font-medium cursor-pointer"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          )}
          <div className="flex rounded-lg editorial-raised p-1">
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
                className={`min-h-[34px] px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer ${
                  range === opt.id
                    ? 'bg-pinkteam-magenta text-white'
                    : 'text-pinkteam-charcoal hover:bg-white/70'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="editorial-panel rounded-xl p-4">
          <div className="text-xs font-normal text-pinkteam-muted">นักเรียนทั้งหมด</div>
          <div className="font-display font-semibold text-3xl text-pinkteam-charcoal tabular-nums mt-1">
            {loading ? '...' : stats.totalStudents}
          </div>
        </div>
        <div className="editorial-panel rounded-xl p-4">
          <div className="text-xs font-normal text-pinkteam-muted">เข้าร่วมแล้ว</div>
          <div className="font-display font-semibold text-3xl text-pinkteam-charcoal tabular-nums mt-1">
            {loading ? '...' : stats.checkedInCount}
          </div>
        </div>
        <div className="editorial-panel rounded-xl p-4">
          <div className="text-xs font-normal text-pinkteam-muted">ยังไม่มา</div>
          <div className="font-display font-semibold text-3xl text-pinkteam-charcoal tabular-nums mt-1">
            {loading ? '...' : stats.pendingCount}
          </div>
        </div>
        <div className="editorial-panel rounded-xl p-4">
          <div className="text-xs font-normal text-pinkteam-muted">เปอร์เซ็นต์เข้าร่วม</div>
          <div className="font-display font-semibold text-3xl text-pinkteam-magenta tabular-nums mt-1">
            {loading ? '...' : `${stats.attendanceRate}%`}
          </div>
        </div>
      </div>

      {/* Main Chart (2/3 width) + Grade Ranked List (1/3 width) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 editorial-panel rounded-2xl p-5">
          <h2 className="font-display font-semibold text-base text-pinkteam-charcoal mb-3">
            จำนวนสมาชิกและผู้มาเข้าร่วมแยกตามฝ่าย (8 ฝ่าย)
          </h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.byDepartment}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E8DEE1" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#7A6A70' }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 12, fill: '#1F1216' }}
                />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="present" name="มาแล้ว" stackId="a" fill="#B32151" />
                <Bar
                  dataKey="pending"
                  name="ยังไม่มา"
                  stackId="a"
                  fill="#E6DCE0"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grade Ranked Bars */}
        <div className="lg:col-span-4 editorial-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="font-display font-semibold text-base text-pinkteam-charcoal mb-3">
              สัดส่วนรายระดับชั้น (ม.1 – ม.6)
            </h2>
            <div className="space-y-3">
              {stats.byGrade.map((g) => (
                <div key={g.grade} className="space-y-1">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="font-medium text-pinkteam-charcoal">{g.grade}</span>
                    <span className="text-pinkteam-secondary">
                      {g.present}/{g.total} คน ({g.rate}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-pinkteam-raised rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pinkteam-magenta transition-[width] duration-300"
                      style={{ width: `${Math.min(100, g.rate)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Trend Chart */}
      <div className="editorial-panel rounded-2xl p-5">
        <h2 className="font-display font-semibold text-base text-pinkteam-charcoal mb-3">
          แนวโน้มการเช็คชื่อตามช่วงเวลา
        </h2>
        {stats.timeline.length === 0 ? (
          <EmptyState
            title="ยังไม่มีข้อมูลเวลาเช็คชื่อในช่วงนี้"
            description="กราฟแนวโน้มจะปรากฏขึ้นเมื่อเจ้าหน้าที่บันทึกการเช็คชื่อในรอบที่เลือก"
          />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.timeline} margin={{ top: 8, right: 16, left: -16, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8DEE1" />
                <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: '#7A6A70' }} />
                <YAxis tick={{ fontSize: 12, fill: '#7A6A70' }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  name="ยอดสะสม"
                  stroke="#B32151"
                  fill="#FFAFCA"
                  fillOpacity={0.45}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Room Breakdown Table */}
      <div className="editorial-panel rounded-2xl p-5 overflow-x-auto">
        <h2 className="font-display font-semibold text-base text-pinkteam-charcoal mb-3">
          ตารางสถิติรายห้องเรียน (21 ห้อง)
        </h2>
        <table className="w-full text-sm border-collapse min-w-[480px] tabular-nums">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs text-pinkteam-muted">
              <th className="py-2 pr-3 font-medium">ห้อง</th>
              <th className="py-2 pr-3 font-medium">ระดับชั้น</th>
              <th className="py-2 pr-3 font-medium text-right">ทั้งหมด</th>
              <th className="py-2 pr-3 font-medium text-right">มาแล้ว</th>
              <th className="py-2 pr-3 font-medium text-right">ยังไม่มา</th>
              <th className="py-2 font-medium text-right">เข้าร่วม</th>
            </tr>
          </thead>
          <tbody>
            {stats.byRoom.map((r) => (
              <tr key={r.room} className="border-b border-black/5 last:border-0">
                <td className="py-2.5 pr-3 font-medium text-pinkteam-charcoal">{r.room}</td>
                <td className="py-2.5 pr-3 text-pinkteam-secondary">{r.grade}</td>
                <td className="py-2.5 pr-3 text-right">{r.total}</td>
                <td className="py-2.5 pr-3 text-right">{r.present}</td>
                <td className="py-2.5 pr-3 text-right text-pinkteam-secondary">{r.pending}</td>
                <td className="py-2.5 text-right font-medium text-pinkteam-magenta">
                  {r.rate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
