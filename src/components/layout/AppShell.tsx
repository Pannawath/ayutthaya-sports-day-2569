'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  Home,
  LogIn,
  LogOut,
  Megaphone,
  Menu,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { createSupabaseBrowserClient, isBrowserSupabaseConfigured } from '@/lib/supabase/client';
import type { UserProfile } from '@/lib/types';

interface AppShellProps {
  initialProfile: UserProfile | null;
  children: React.ReactNode;
}

const ALL_NAV_LINKS = [
  { href: '/', label: 'หน้าหลัก', icon: Home },
  { href: '/check-in', label: 'เช็คชื่อ', icon: ClipboardCheck },
  { href: '/register', label: 'ลงทะเบียน', icon: UserPlus },
  { href: '/classrooms', label: 'ตามห้อง', icon: Users },
  { href: '/departments', label: 'ตามฝ่าย', icon: Building2 },
  { href: '/statistics', label: 'สถิติ', icon: BarChart3 },
  { href: '/announcements', label: 'ประกาศ', icon: Megaphone },
];

export function AppShell({ initialProfile, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);

  const isHome = pathname === '/';

  async function handleLogout() {
    if (isBrowserSupabaseConfigured()) {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    }
    setProfile(null);
    setDrawerOpen(false);
    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Desktop Top Editorial Navbar */}
      <header className="no-print hidden lg:block sticky top-0 z-40 bg-pinkteam-charcoal/95 text-white border-b border-pinkteam-light/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <img
              src="/images/figma/calligraphy-ayutthaya.png"
              alt="คณะ อยุธยา"
              className="h-10 w-auto object-contain group-hover:scale-105 transition-transform"
            />
            <div className="leading-tight">
              <div className="font-display font-bold text-sm tracking-wide text-white">
                AYUTTHAYA SPORTS DAY 2569
              </div>
              <div className="text-[11px] text-pinkteam-light font-medium">
                PINK TEAM · สารคามพิทยาคม
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-1" aria-label="เมนูหลัก">
            {ALL_NAV_LINKS.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-pinkteam-magenta text-white shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            {profile?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  pathname.startsWith('/admin')
                    ? 'bg-pinkteam-light text-pinkteam-charcoal'
                    : 'text-pinkteam-light hover:bg-white/10'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>แอดมิน</span>
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {profile ? (
              <div className="flex items-center gap-2.5">
                <div className="text-right">
                  <div className="text-xs font-semibold text-white">{profile.fullName}</div>
                  <div className="text-[10px] uppercase tracking-wider text-pinkteam-light">
                    {profile.role}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  ออก
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-pinkteam-magenta hover:bg-pinkteam-deep text-xs font-semibold text-white transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                เข้าสู่ระบบเจ้าหน้าที่
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Floating Top Bar / Drawer Trigger */}
      <div className="no-print lg:hidden fixed top-3 right-3 left-3 z-40 flex items-center justify-between pointer-events-none">
        {!isHome ? (
          <Link
            href="/"
            className="pointer-events-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pinkteam-charcoal/90 text-white border border-white/15 shadow-lg text-xs font-semibold backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-pinkteam-light" />
            <span>อยุธยาสีชมพู 2569</span>
          </Link>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="เปิดเมนูทั้งหมด"
          className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-pinkteam-charcoal/90 text-white border border-white/20 shadow-lg text-xs font-semibold backdrop-blur-md active:scale-95 transition"
        >
          <Menu className="w-4 h-4 text-pinkteam-light" />
          <span>เมนู</span>
        </button>
      </div>

      {/* Mobile Slide-Over Drawer for all 8 sections + RBAC */}
      {drawerOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute right-0 top-0 bottom-0 w-72 max-w-[85vw] figma-charcoal-surface text-white p-5 flex flex-col justify-between shadow-2xl border-l border-pinkteam-light/20">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <div className="font-display font-bold text-base text-white">
                    AYUTTHAYA 2569
                  </div>
                  <div className="text-xs text-pinkteam-light">PINK TEAM CONTROL</div>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="ปิดเมนู"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="mt-4 flex flex-col gap-1.5">
                {ALL_NAV_LINKS.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                        active
                          ? 'bg-pinkteam-magenta text-white shadow'
                          : 'text-white/85 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                {profile?.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                      pathname.startsWith('/admin')
                        ? 'bg-pinkteam-light text-pinkteam-charcoal'
                        : 'text-pinkteam-light hover:bg-white/10'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>หน้าผู้ดูแลระบบ (Admin)</span>
                  </Link>
                )}
              </nav>
            </div>

            <div className="pt-4 border-t border-white/10">
              {profile ? (
                <div className="space-y-3">
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-xs font-semibold text-white">{profile.fullName}</div>
                    <div className="text-[11px] text-pinkteam-light">
                      สิทธิ์: {profile.role}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold text-white"
                  >
                    <LogOut className="w-4 h-4" />
                    ออกจากระบบ
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-pinkteam-magenta text-white font-semibold text-sm shadow"
                >
                  <LogIn className="w-4 h-4" />
                  เข้าสู่ระบบเจ้าหน้าที่ / Admin
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Page Body */}
      <main className="flex-1 pb-28 lg:pb-12">{children}</main>

      {/* Figma Mobile 3-Slot Bottom Navigation (440x956 reference) */}
      <nav
        aria-label="แถบนำทางหลักมือถือ"
        className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 h-[98px] pointer-events-none"
      >
        <div className="relative h-full w-full max-w-[480px] mx-auto pointer-events-auto">
          {/* Torn charcoal texture base matching Figma */}
          <div
            className="absolute inset-x-0 bottom-0 h-[86px] rounded-t-[26px] overflow-hidden shadow-[0_-8px_24px_rgba(31,18,22,0.45)]"
            style={{
              backgroundImage: "url('/images/figma/torn-stone.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'top center',
            }}
          />

          <div className="relative h-full grid grid-cols-3 items-end px-4 pb-2.5">
            {/* Left: ลงทะเบียน */}
            <Link
              href="/register"
              className={`flex flex-col items-center justify-end gap-1 pb-1 transition-transform active:scale-95 ${
                pathname === '/register' ? 'opacity-100 scale-105' : 'opacity-90'
              }`}
            >
              <img
                src="/images/figma/icon-register.png"
                alt="ลงทะเบียน"
                className="w-8 h-9 object-contain drop-shadow-[0_4px_4px_rgba(0,0,0,0.45)]"
              />
              <span className="font-display font-bold text-sm text-white figma-text-shadow">
                ลงทะเบียน
              </span>
            </Link>

            {/* Center: Elevated Glowing Pink หน้าหลัก */}
            <Link
              href="/"
              className="relative flex flex-col items-center justify-end pb-1 transition-transform active:scale-95"
            >
              <div
                className={`relative w-[108px] h-[94px] rounded-t-[26px] rounded-b-[16px] flex flex-col items-center justify-center gap-1 overflow-hidden shadow-[0_-4px_18px_rgba(255,175,202,0.45)] ${
                  isHome ? 'ring-2 ring-white/80' : 'opacity-95'
                }`}
              >
                <img
                  src="/images/figma/home-pill-glow.png"
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <img
                  src="/images/figma/icon-home.png"
                  alt="หน้าหลัก"
                  className="relative z-10 w-10 h-10 object-contain drop-shadow-[0_4px_4px_rgba(0,0,0,0.35)]"
                />
                <span className="relative z-10 font-display font-bold text-sm text-white figma-text-shadow">
                  หน้าหลัก
                </span>
              </div>
            </Link>

            {/* Right: รายชื่อ */}
            <Link
              href="/classrooms"
              className={`flex flex-col items-center justify-end gap-1 pb-1 transition-transform active:scale-95 ${
                pathname === '/classrooms' || pathname === '/departments'
                  ? 'opacity-100 scale-105'
                  : 'opacity-90'
              }`}
            >
              <img
                src="/images/figma/icon-directory.png"
                alt="รายชื่อ"
                className="w-9 h-9 object-contain drop-shadow-[0_4px_4px_rgba(0,0,0,0.45)]"
              />
              <span className="font-display font-bold text-sm text-white figma-text-shadow">
                รายชื่อ
              </span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
