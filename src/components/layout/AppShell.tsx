'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  Home,
  Menu,
  RefreshCw,
  Shirt,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type { UserProfile } from '@/lib/types';

interface AppShellProps {
  initialProfile?: UserProfile | null;
  children: React.ReactNode;
}

const STUDENT_NAV_LINKS = [
  { href: '/', label: 'หน้าแรก', icon: Home },
  { href: '/register', label: 'ลงทะเบียน', icon: UserPlus },
  { href: '/classrooms', label: 'ดูตามห้อง', icon: Users },
  { href: '/departments', label: 'ดูตามฝ่าย', icon: Building2 },
  { href: '/shop', label: 'สั่งจองเสื้อ', icon: Shirt },
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [optimisticSlot, setOptimisticSlot] = useState<number | null>(null);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOptimisticSlot(null);
  }, [pathname]);

  // Separate standalone /admin website completely from the public student shell
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return <>{children}</>;
  }

  const isHome = pathname === '/';
  const routeSlot = pathname.startsWith('/register')
    ? 0
    : pathname.startsWith('/classrooms') || pathname.startsWith('/departments')
      ? 2
      : 1;
  const activeSlot = optimisticSlot ?? routeSlot;

  const mobileBottomTabs = [
    {
      slot: 0,
      href: '/register',
      label: 'ลงทะเบียน',
      icon: '/images/figma/icon-register.png',
      iconClass: 'w-8 h-9',
      hoverRotate: 'group-hover:-rotate-3',
    },
    {
      slot: 1,
      href: '/',
      label: 'หน้าหลัก',
      icon: '/images/figma/icon-home.png',
      iconClass: 'w-10 h-10',
      hoverRotate: '',
    },
    {
      slot: 2,
      href: '/classrooms',
      label: 'รายชื่อ',
      icon: '/images/figma/icon-directory.png',
      iconClass: 'w-9 h-9',
      hoverRotate: 'group-hover:rotate-3',
    },
  ];

  function handleSecretBrandTap(goHomeIfNotHome = false) {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      setDrawerOpen(false);
      router.push('/admin');
      return;
    }
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 1200);
    if (goHomeIfNotHome && !isHome) {
      router.push('/');
    }
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetch('/api/sync', { method: 'POST' });
      router.refresh();
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Desktop Top Editorial Navbar with Torn Menu Paper (Student Website Only) */}
      <header className="no-print hidden lg:block sticky top-0 z-40 text-white overflow-x-clip">
        <div className="relative bg-[#22161A]">
          <img
            src="/images/figma/torn-menu-paper.png"
            alt=""
            aria-hidden="true"
            className="absolute bottom-[-28px] -left-[8.18%] w-[116.36%] max-w-none h-auto pointer-events-none drop-shadow-[0_4px_10px_rgba(31,18,22,0.35)]"
          />
          <div className="relative z-10 max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
            <button
              type="button"
              onClick={() => handleSecretBrandTap(true)}
              className="btn-animated flex items-center gap-3 shrink-0 rounded-lg px-1.5 py-1 transition-all duration-150 hover:opacity-90 cursor-pointer text-left"
              title="อยุธยาสีชมพู 2569"
            >
              <img
                src="/images/figma/calligraphy-ayutthaya.png"
                alt="คณะ อยุธยา"
                className="h-9 w-auto object-contain"
              />
              <div className="leading-tight">
                <div className="font-display font-semibold text-sm text-white">
                  อยุธยาสีชมพู 2569
                </div>
                <div className="text-xs text-white/80 font-normal">
                  สารคามพิทยาคม
                </div>
              </div>
            </button>

            <nav className="flex items-center gap-1" aria-label="เมนูหลัก">
              {STUDENT_NAV_LINKS.map((item) => {
                const active =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer ${
                      active
                        ? 'bg-pinkteam-magenta text-white'
                        : 'text-white/90 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                title="รีเฟรชข้อมูลสด"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-medium text-white border border-white/15 transition-colors duration-150 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                  strokeWidth={1.5}
                />
                <span>{refreshing ? 'กำลังอัปเดต' : 'รีเฟรช'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Floating Top Bar / Drawer Trigger */}
      <div className="no-print lg:hidden fixed top-3 right-3 left-3 z-40 flex items-center justify-end pointer-events-none">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="เปิดเมนูทั้งหมด"
          className="pointer-events-auto inline-flex items-center gap-2 min-h-[40px] px-3.5 py-1.5 rounded-xl bg-pinkteam-charcoal/95 text-white border border-white/15 text-xs font-medium active:scale-[0.98] transition-transform duration-150 cursor-pointer"
        >
          <Menu className="w-4 h-4 text-white/90" strokeWidth={1.5} />
          <span>เมนู</span>
        </button>
      </div>

      {/* Mobile Slide-Over Drawer (Student Navigation Only) */}
      {drawerOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/55"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute right-0 top-0 bottom-0 w-72 max-w-[85vw] bg-pinkteam-charcoal text-white p-5 flex flex-col justify-between shadow-2xl border-l border-white/10 overflow-hidden">
            <img
              src="/images/figma/torn-menu-paper.png"
              alt=""
              aria-hidden="true"
              className="absolute bottom-[calc(100%-76px)] -left-[8.18%] w-[116.36%] max-w-none h-auto opacity-80 pointer-events-none"
            />
            <div className="relative z-10">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => handleSecretBrandTap(false)}
                  className="text-left cursor-pointer"
                >
                  <div className="font-display font-semibold text-base text-white">
                    อยุธยาสีชมพู 2569
                  </div>
                  <div className="text-xs text-white/75">สารคามพิทยาคม</div>
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="ปิดเมนู"
                  className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <nav className="mt-4 flex flex-col gap-1">
                {STUDENT_NAV_LINKS.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-3 min-h-[42px] px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer ${
                        active
                          ? 'bg-pinkteam-magenta text-white'
                          : 'text-white/85 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="relative z-10 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={async () => {
                  await handleRefresh();
                  setDrawerOpen(false);
                }}
                disabled={refreshing}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-lg bg-pinkteam-magenta hover:bg-pinkteam-deep text-white font-medium text-sm transition-colors duration-150 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                  strokeWidth={1.5}
                />
                <span>{refreshing ? 'กำลังอัปเดตข้อมูล' : 'รีเฟรชข้อมูลสด'}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Page Body */}
      <main className="flex-1 pb-28 lg:pb-12">{children}</main>

      {/* Figma Mobile 3-Slot Bottom Navigation (440x956 reference) */}
      <nav
        aria-label="แถบนำทางหลักมือถือ"
        className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 h-[124px] pointer-events-none overflow-x-clip"
      >
        <div className="relative h-full w-full pointer-events-auto">
          {/* Exact Figma torn-paper menu base at 1:1 aspect ratio (-36/440, 512/440) */}
          <img
            src="/images/figma/torn-menu-paper.png"
            alt=""
            aria-hidden="true"
            className="absolute top-0 -left-[8.18%] w-[116.36%] max-w-none h-auto pointer-events-none drop-shadow-[0_-4px_10px_rgba(31,18,22,0.45)]"
          />

          <div className="relative z-10 h-full w-full max-w-[480px] mx-auto px-5 pb-2.5">
            <div className="relative h-full w-full grid grid-cols-3 items-end">
              {/* Sliding Glowing Pink Active Frame */}
              <div
                aria-hidden="true"
                data-testid="mobile-nav-active-pill"
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 flex items-end justify-center pb-1 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
                style={{ transform: `translate3d(${activeSlot * 100}%, 0, 0)` }}
              >
                <div className="relative w-[108px] max-w-[96%] h-[94px] rounded-t-[26px] rounded-b-[16px] overflow-hidden shadow-[0_-4px_16px_rgba(255,175,202,0.45)] ring-2 ring-white/80 transition-shadow duration-300">
                  <img
                    src="/images/figma/home-pill-glow.png"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              </div>

              {mobileBottomTabs.map((tab) => {
                const isActive = activeSlot === tab.slot;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setOptimisticSlot(tab.slot)}
                    className="group relative z-10 h-[94px] mb-1 flex flex-col items-center justify-center gap-1.5 rounded-2xl cursor-pointer select-none"
                  >
                    <img
                      src={tab.icon}
                      alt={tab.label}
                      className={`${tab.iconClass} object-contain drop-shadow-[0_3px_4px_rgba(0,0,0,0.4)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isActive
                          ? '-translate-y-1 scale-105 opacity-100'
                          : 'opacity-85 group-hover:opacity-100 group-hover:scale-110'
                      } ${tab.hoverRotate} group-active:scale-95`}
                    />
                    <span
                      className={`font-display font-bold text-sm text-white figma-text-shadow transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isActive ? '-translate-y-0.5 opacity-100' : 'opacity-85 group-hover:opacity-100'
                      }`}
                    >
                      {tab.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
