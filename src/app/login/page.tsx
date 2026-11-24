'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, LogIn } from 'lucide-react';
import { ErrorState } from '@/components/ui/States';
import { createSupabaseBrowserClient, isBrowserSupabaseConfigured } from '@/lib/supabase/client';

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/admin';
  const reason = searchParams.get('reason');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    reason === 'auth_required'
      ? 'กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบหรือเจ้าหน้าที่ก่อนเข้าใช้งานหน้านี้'
      : null
  );

  const supabaseConfigured = isBrowserSupabaseConfigured();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY ใน .env.local');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authErr) {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        return;
      }

      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      const role = meData?.profile?.role;

      if (role === 'ADMIN') {
        router.push(nextPath);
      } else if (role === 'STAFF') {
        router.push(nextPath.startsWith('/admin') ? '/check-in' : nextPath);
      } else {
        setError('บัญชีนี้ยังไม่มีสิทธิ์ในระบบ');
        return;
      }
      router.refresh();
    } catch {
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-20 lg:pt-14 pb-10">
      <div className="editorial-panel rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-11 h-11 rounded-xl bg-pinkteam-charcoal text-white flex items-center justify-center mx-auto">
            <Lock className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <h1 className="font-display font-semibold text-2xl text-pinkteam-charcoal">
            เข้าสู่ระบบเจ้าหน้าที่
          </h1>
          <p className="text-xs sm:text-sm text-pinkteam-secondary">
            ระบบจัดการคณะสีชมพู อยุธยา 2569
          </p>
        </div>

        {!supabaseConfigured && (
          <div className="rounded-xl editorial-raised p-4 text-xs text-pinkteam-charcoal leading-relaxed">
            <strong className="font-medium">ยังไม่พบการตั้งค่า Supabase ใน .env.local:</strong>{' '}
            คัดลอก <code className="font-mono">.env.example</code> เป็น{' '}
            <code className="font-mono">.env.local</code> แล้วใส่ URL/Key จากนั้นสร้างบัญชีผ่าน{' '}
            <code className="font-mono">npm run create:admin</code>
          </div>
        )}

        {error && <ErrorState message={error} />}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-pinkteam-charcoal mb-1">
              อีเมล
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@ayutthaya.shop"
              className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-pinkteam-charcoal mb-1">
              รหัสผ่าน
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="รหัสผ่าน"
              className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-pinkteam-magenta hover:bg-pinkteam-deep text-white font-display font-medium text-sm transition-colors duration-150 disabled:opacity-50 cursor-pointer"
          >
            <LogIn className="w-4 h-4" strokeWidth={1.5} />
            <span>{loading ? 'กำลังตรวจสอบ' : 'เข้าสู่ระบบ'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-4 pt-20 text-center text-pinkteam-secondary text-sm">
          กำลังโหลด
        </div>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}
