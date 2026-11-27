'use client';

import React, { useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  Home,
  Menu,
  Shirt,
  Users,
  X,
} from 'lucide-react';
import { useHomeView, type HomeView } from '@/components/home/HomeViewContext';
import type { UserProfile } from '@/lib/types';

interface AppShellProps {
  initialProfile?: UserProfile | null;
  children: React.ReactNode;
}

const STUDENT_NAV_LINKS: Array<
  | { view: HomeView; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; fullPage?: false }
  | { href: string; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; fullPage: true }
> = [
  { view: 'home', label: 'หน้าหลัก', icon: Home },
  { view: 'departments', label: 'ฝ่ายงาน', icon: Building2 },
  { view: 'classrooms', label: 'ห้องเรียน', icon: Users },
  { href: '/shop', label: 'สั่งจองเสื้อ', icon: Shirt, fullPage: true },
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeView, openView } = useHomeView();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Separate standalone /admin and /shop pages completely from the public student shell
  if (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/shop' ||
    pathname.startsWith('/shop/')
  ) {
    return <>{children}</>;
  }

  const isHomeRoute = pathname === '/';
  const showMobileMenuButton = !isHomeRoute || activeView !== 'home';
  const activeSlot =
    activeView === 'departments' ? 0 : activeView === 'classrooms' ? 2 : 1;

  const mobileBottomTabs: Array<{
    slot: number;
    view: HomeView;
    label: string;
    icon: string;
    iconClass: string;
    hoverRotate: string;
  }> = [
    {
      slot: 0,
      view: 'departments',
      label: 'ฝ่ายงาน',
      icon: '/images/figma/icon-register.webp',
      iconClass: 'w-8 h-9',
      hoverRotate: 'group-hover:-rotate-3',
    },
    {
      slot: 1,
      view: 'home',
      label: 'หน้าหลัก',
      icon: '/images/figma/icon-home.webp',
      iconClass: 'w-10 h-10',
      hoverRotate: '',
    },
    {
      slot: 2,
      view: 'classrooms',
      label: 'ห้องเรียน',
      icon: '/images/figma/icon-directory.webp',
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
    if (goHomeIfNotHome && (!isHomeRoute || activeView !== 'home')) {
      openView('home');
    }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Desktop Top Editorial Navbar with Torn Menu Paper (Student Website Only) */}
      <header className="no-print hidden lg:block sticky top-0 z-40 text-white overflow-x-clip">
        <div className="relative bg-[#22161A]">
          <img
            src="/images/figma/torn-menu-paper.webp"
            alt=""
            aria-hidden="true"
            decoding="async"
            className="absolute bottom-[-28px] -left-[8.18%] w-[116.36%] max-w-none h-auto pointer-events-none drop-shadow-[0_4px_10px_rgba(31,18,22,0.35)]"
          />
          <div className="relative z-10 max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
            <button
              type="button"
              onClick={() => handleSecretBrandTap(true)}
              className="btn-animated flex items-center gap-3 shrink-0 rounded-lg px-1.5 py-1 transition-opacity duration-150 hover:opacity-90 cursor-pointer text-left"
              title="อยุธยาสีชมพู 2569"
            >
              <img
                src="/images/figma/calligraphy-ayutthaya.webp"
                alt="คณะ อยุธยา"
                decoding="async"
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
                const Icon = item.icon;
                if (item.fullPage) {
                  const active = pathname === item.href;
                  return (
                    <a
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
                    </a>
                  );
                }

                const active = isHomeRoute && activeView === item.view;
                return (
                  <button
                    key={item.view}
                    type="button"
                    onClick={() => openView(item.view)}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer ${
                      active
                        ? 'bg-pinkteam-magenta text-white'
                        : 'text-white/90 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Floating Top Bar / Drawer Trigger (hidden on main Home view) */}
      {showMobileMenuButton && (
        <div className="no-print lg:hidden fixed top-3 right-3 left-3 z-40 flex items-center justify-end pointer-events-none">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="เปิดเมนูทั้งหมด"
            className="pointer-events-auto inline-flex items-center gap-2 min-h-[40px] px-3.5 py-1.5 rounded-xl bg-pinkteam-charcoal/95 text-white border border-white/15 text-xs font-medium active:scale-[0.96] transition-transform duration-150 cursor-pointer shadow-lg"
          >
            <Menu className="w-4 h-4 text-white/90" strokeWidth={1.5} />
            <span>เมนู</span>
          </button>
        </div>
      )}

      {/* Mobile Slide-Over Drawer with Open/Close Animation */}
      <div
        aria-hidden={!drawerOpen}
        className={`no-print fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className={`absolute right-0 top-0 bottom-0 w-72 max-w-[85vw] bg-pinkteam-charcoal text-white p-5 flex flex-col justify-between shadow-2xl border-l border-white/10 overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            drawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
            <img
              src="/images/figma/torn-menu-paper.webp"
              alt=""
              aria-hidden="true"
              decoding="async"
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
                  if (item.fullPage) {
                    const active = pathname === item.href;
                    return (
                      <a
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
                      </a>
                    );
                  }

                  const active = isHomeRoute && activeView === item.view;
                  return (
                    <button
                      key={item.view}
                      type="button"
                      onClick={() => {
                        openView(item.view);
                        setDrawerOpen(false);
                      }}
                      className={`flex items-center gap-3 min-h-[42px] px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer text-left ${
                        active
                          ? 'bg-pinkteam-magenta text-white'
                          : 'text-white/85 hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>
        </div>

      {/* Page Body */}
      <main className="flex-1 pb-28 lg:pb-12">{children}</main>

      {/* Figma Mobile 3-Slot Bottom Navigation (ฝ่ายงาน | หน้าหลัก | ห้องเรียน) */}
      <nav
        aria-label="แถบนำทางหลักมือถือ"
        className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 h-[104px] min-[390px]:h-[116px] sm:h-[124px] pointer-events-none overflow-x-clip"
      >
        <div className="relative h-full w-full pointer-events-auto">
          {/* Exact Figma torn-paper menu base at 1:1 aspect ratio (-36/440, 512/440) */}
          <img
            src="/images/figma/torn-menu-paper.webp"
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
            className="absolute top-0 -left-[8.18%] w-[116.36%] max-w-none h-auto pointer-events-none drop-shadow-[0_-4px_10px_rgba(31,18,22,0.45)]"
          />

          <div className="relative z-10 h-full w-full max-w-[480px] mx-auto px-4 min-[390px]:px-5 pb-2 min-[390px]:pb-2.5">
            <div className="relative h-full w-full grid grid-cols-3 items-end">
              {/* Sliding Glowing Pink Active Frame */}
              <div
                aria-hidden="true"
                data-testid="mobile-nav-active-pill"
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 flex items-end justify-center pb-1 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
                style={{ transform: `translate3d(${activeSlot * 100}%, 0, 0)` }}
              >
                <div className="relative w-[96px] min-[390px]:w-[104px] sm:w-[108px] max-w-[96%] h-[80px] min-[390px]:h-[88px] sm:h-[94px] rounded-t-[24px] sm:rounded-t-[26px] rounded-b-[14px] sm:rounded-b-[16px] overflow-hidden shadow-[0_-4px_14px_rgba(31,18,22,0.35)] ring-2 ring-white/80">
                  <img
                    src="/images/figma/home-pill-glow.webp"
                    alt=""
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              </div>

              {mobileBottomTabs.map((tab) => {
                const isActive = activeSlot === tab.slot;
                return (
                  <button
                    key={tab.view}
                    type="button"
                    onClick={() => openView(tab.view)}
                    className="group relative z-10 h-[80px] min-[390px]:h-[88px] sm:h-[94px] mb-1 flex flex-col items-center justify-center gap-1 min-[390px]:gap-1.5 rounded-2xl cursor-pointer select-none"
                  >
                    <img
                      src={tab.icon}
                      alt={tab.label}
                      decoding="async"
                      className={`${tab.iconClass} scale-90 min-[390px]:scale-100 object-contain drop-shadow-[0_3px_4px_rgba(0,0,0,0.4)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isActive
                          ? '-translate-y-1 scale-95 min-[390px]:scale-105 opacity-100'
                          : 'opacity-85 group-hover:opacity-100'
                      } ${tab.hoverRotate} group-active:scale-95`}
                    />
                    <span
                      className={`font-display font-bold text-xs min-[390px]:text-sm text-white figma-text-shadow transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isActive ? '-translate-y-0.5 opacity-100' : 'opacity-85 group-hover:opacity-100'
                      }`}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
