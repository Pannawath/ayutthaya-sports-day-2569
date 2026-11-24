'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Database, Inbox, Loader2 } from 'lucide-react';

export function LoadingState({ message = 'กำลังโหลดข้อมูล...' }: { message?: string }) {
  return (
    <div className="editorial-panel rounded-2xl p-10 text-center flex flex-col items-center gap-3">
      <Loader2 className="w-7 h-7 text-pinkteam-magenta animate-spin" />
      <p className="text-sm font-medium text-pinkteam-muted">{message}</p>
    </div>
  );
}

export function EmptyState({
  title = 'ไม่พบข้อมูล',
  description = 'ลองปรับเงื่อนไขการค้นหาหรือตัวกรองใหม่อีกครั้ง',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="editorial-panel rounded-2xl p-10 text-center flex flex-col items-center gap-2">
      <div className="w-11 h-11 rounded-full bg-pinkteam-blush flex items-center justify-center text-pinkteam-magenta">
        <Inbox className="w-5 h-5" />
      </div>
      <h3 className="font-display font-bold text-base text-pinkteam-charcoal">{title}</h3>
      <p className="text-sm text-pinkteam-muted max-w-md">{description}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 text-red-900">
      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
      <div className="text-sm font-medium">{message}</div>
    </div>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3 text-emerald-900">
      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
      <div className="text-sm font-medium">{message}</div>
    </div>
  );
}

export function SourceModeBanner({
  sourceMode,
}: {
  sourceMode: 'supabase' | 'legacy-readonly';
}) {
  if (sourceMode === 'supabase') return null;

  return (
    <div className="no-print rounded-2xl bg-pinkteam-charcoal text-white border border-pinkteam-light/30 px-4 py-3 flex items-start gap-3 shadow-md">
      <Database className="w-5 h-5 text-pinkteam-light shrink-0 mt-0.5" />
      <div className="text-xs sm:text-sm leading-relaxed">
        <span className="font-semibold text-pinkteam-light">
          โหมดแสดงผลข้อมูลเดิมแบบอ่านอย่างเดียว (ยังไม่เชื่อม Supabase):
        </span>{' '}
        ข้อมูลรายชื่อที่เห็นดึงสดจาก Google Sheets เดิม (181 รายการจริง) เมื่อใส่ค่า{' '}
        <code className="px-1.5 py-0.5 rounded bg-white/10 text-pinkteam-light">.env.local</code>{' '}
        และรัน <code className="px-1.5 py-0.5 rounded bg-white/10">npm run migrate:legacy</code>{' '}
        แล้ว ระบบบันทึก เช็คชื่อ Login และ Admin จะทำงานกับ PostgreSQL ทันที
      </div>
    </div>
  );
}
