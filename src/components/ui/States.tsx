'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Inbox, Loader2 } from 'lucide-react';

export function LoadingState({ message = 'กำลังโหลดข้อมูล' }: { message?: string }) {
  return (
    <div className="editorial-panel rounded-2xl p-8 text-center flex flex-col items-center gap-3">
      <Loader2 className="w-4 h-4 text-pinkteam-magenta animate-spin" strokeWidth={1.5} />
      <p className="text-sm font-normal text-pinkteam-secondary">{message}</p>
    </div>
  );
}

export function EmptyState({
  title = 'ไม่พบข้อมูล',
  description = 'ลองปรับคำค้นหาหรือตัวกรองใหม่อีกครั้ง',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="editorial-panel rounded-2xl p-8 text-center flex flex-col items-center gap-2">
      <div className="w-9 h-9 rounded-lg editorial-raised flex items-center justify-center text-pinkteam-muted">
        <Inbox className="w-4 h-4" strokeWidth={1.5} />
      </div>
      <h3 className="font-display font-medium text-base text-pinkteam-charcoal">{title}</h3>
      <p className="text-sm text-pinkteam-secondary max-w-md">{description}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-red-50 border border-red-200/80 px-4 py-3 flex items-start gap-2.5 text-red-900">
      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" strokeWidth={1.5} />
      <div className="text-sm font-normal">{message}</div>
    </div>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 px-4 py-3 flex items-start gap-2.5 text-emerald-900">
      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={1.5} />
      <div className="text-sm font-normal">{message}</div>
    </div>
  );
}

export function SourceModeBanner(_props: {
  sourceMode: 'supabase' | 'legacy-readonly';
}) {
  return null;
}
