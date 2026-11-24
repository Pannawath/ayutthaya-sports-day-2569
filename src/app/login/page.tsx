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
      ? 'กรุณาเข้าสู่ระบบด้วยบัญชี Admin หรือเจ้าหน้าที่ก่อนเข้าใช้งานหน้านี้'
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
        setError('บัญชีนี้ยังไม่มีสิทธิ์ในระบบ (ไม่พบข้อมูลในตาราง profiles)');
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
      <div className="editorial-panel rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-pinkteam-charcoal text-pinkteam-light flex items-center justify-center mx-auto shadow">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="font-display font-extrabold text-2xl text-pinkteam-charcoal">
            เข้าสู่ระบบเจ้าหน้าที่ / Admin
          </h1>
          <p className="text-xs sm:text-sm text-pinkteam-muted">
            AYUTTHAYA SPORTS DAY 2569 · Supabase Auth RBAC
          </p>
        </div>

        {!supabaseConfigured && (
          <div className="rounded-2xl bg-pinkteam-charcoal text-white p-4 text-xs leading-relaxed">
            <strong>ยังไม่พบการตั้งค่า Supabase ใน .env.local:</strong> กรุณาคัดลอก{' '}
            <code>.env.example</code> เป็น <code>.env.local</code> แล้วใส่ URL/Key
            จากนั้นสร้างบัญชีผ่าน <code>npm run create:admin</code>
          </div>
        )}

        {error && <ErrorState message={error} />}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-pinkteam-charcoal mb-1">
              อีเมล (Email)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@ayutthaya.shop"
              className="w-full px-3.5 py-2.5 rounded-xl border border-pinkteam-soft bg-white text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-pinkteam-charcoal mb-1">
              รหัสผ่าน (Password)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-pinkteam-soft bg-white text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-pinkteam-magenta hover:bg-pinkteam-deep text-white font-display font-bold text-sm transition disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}</span>
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
        <div className="max-w-md mx-auto px-4 pt-20 text-center text-white text-sm">
          กำลังโหลด...
        </div>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}
