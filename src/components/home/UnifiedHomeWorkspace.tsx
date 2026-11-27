'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ArrowUpRight } from 'lucide-react';
import { HomeLegacyTabs } from '@/components/home/HomeLegacyTabs';
import { useHomeView } from '@/components/home/HomeViewContext';
import { SHOP_URL } from '@/lib/constants';
import type { CheckInSessionRecord, DepartmentRecord, StudentWithCheckIn } from '@/lib/types';

const DepartmentsBrowser = dynamic(
  () => import('@/components/departments/DepartmentsBrowser').then((m) => m.DepartmentsBrowser),
  { ssr: false }
);

const ClassroomsBrowser = dynamic(
  () => import('@/components/classrooms/ClassroomsBrowser').then((m) => m.ClassroomsBrowser),
  { ssr: false }
);

interface UnifiedHomeWorkspaceProps {
  students: StudentWithCheckIn[];
  departments: DepartmentRecord[];
  activeSession: CheckInSessionRecord | null;
  sourceMode: 'supabase' | 'legacy-readonly';
}

export function UnifiedHomeWorkspace({
  students,
  departments,
  activeSession,
  sourceMode,
}: UnifiedHomeWorkspaceProps) {
  const { activeView, selectedDeptName, selectedGrade, selectedRoom } = useHomeView();

  if (activeView === 'departments') {
    return (
      <div className="pb-6">
        <DepartmentsBrowser
          key={selectedDeptName || 'all-depts'}
          students={students}
          departments={departments}
          sourceMode={sourceMode}
          initialDeptName={selectedDeptName}
        />
      </div>
    );
  }

  if (activeView === 'classrooms') {
    return (
      <div className="pb-6">
        <ClassroomsBrowser
          key={`${selectedGrade}-${selectedRoom}`}
          students={students}
          activeSession={activeSession}
          sourceMode={sourceMode}
          initialGrade={selectedGrade}
          initialRoom={selectedRoom}
        />
      </div>
    );
  }

  return (
    <div className="w-full relative">
      {/* ================= ABOVE THE FOLD: STICKY FIGMA HERO + FEATURED JERSEY CARD ================= */}
      <section className="figma-pink-backdrop sticky top-0 lg:top-16 z-0 overflow-hidden pb-8 min-[390px]:pb-10 lg:pb-14">
        <div className="lg:max-w-7xl lg:mx-auto lg:px-6 lg:pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-8 lg:items-center">
            {/* Left / Top Editorial Hero Collage */}
            <div className="lg:col-span-7 relative">
              <div
                className="relative h-[250px] min-[390px]:h-[285px] sm:h-[360px] lg:h-[440px] w-full overflow-hidden lg:rounded-2xl"
                style={{
                  WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 66%, transparent 100%)',
                  maskImage: 'linear-gradient(to bottom, #000 0%, #000 66%, transparent 100%)',
                }}
              >
                <img
                  src="/images/figma/hero-bg-1.webp"
                  alt=""
                  aria-hidden="true"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  className="absolute inset-0 w-full h-full object-cover object-center scale-105"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(31,18,22,0.22) 0%, rgba(255,175,202,0.2) 60%, rgba(255,175,202,0.92) 100%)',
                  }}
                />
                <img
                  src="/images/figma/hero-bg-4.webp"
                  alt="คณะกรรมการสีชมพู อยุธยา 2569"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  className="absolute inset-x-0 bottom-3 min-[390px]:bottom-4 w-full h-[80%] sm:h-[82%] object-contain object-bottom"
                />
                <img
                  src="/images/figma/torn-stone.webp"
                  alt=""
                  aria-hidden="true"
                  loading="eager"
                  decoding="async"
                  className="absolute bottom-[calc(100%-44px)] min-[390px]:bottom-[calc(100%-50px)] sm:bottom-[calc(100%-64px)] lg:bottom-[calc(100%-122px)] -left-[17.73%] w-[137.5%] max-w-none h-auto pointer-events-none drop-shadow-[0_6px_12px_rgba(0,0,0,0.4)]"
                />
              </div>

              {/* White Calligraphic "คณะ อยุธยา" Script positioned below student faces */}
              <div className="absolute -right-6 min-[390px]:-right-8 sm:-right-6 -bottom-14 min-[390px]:-bottom-16 sm:-bottom-20 lg:-bottom-16 z-30 pointer-events-none">
                <img
                  src="/images/figma/calligraphy-ayutthaya.webp"
                  alt="คณะ อยุธยา"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  className="w-[320px] min-[390px]:w-[360px] sm:w-[440px] lg:w-[500px] max-w-none h-auto object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,0.75)] drop-shadow-[0_16px_28px_rgba(31,18,22,0.7)]"
                />
              </div>
            </div>

            {/* Right / Center Featured "สั่งจองเสื้อ" Card matching Figma Arch Geometry */}
            <div className="lg:col-span-5 relative z-10 px-5 min-[390px]:px-7 sm:px-8 lg:px-0 mt-2.5 min-[390px]:mt-3 lg:mt-0">
              <a
                href={SHOP_URL}
                className="btn-animated block group relative w-full max-w-[384px] mx-auto lg:max-w-none h-[265px] min-[390px]:h-[305px] sm:h-[365px] figma-card-arch figma-charcoal-surface overflow-hidden shadow-[0_14px_28px_rgba(31,18,22,0.35)] transition-[transform,box-shadow] duration-200 hover:shadow-[0_18px_32px_rgba(31,18,22,0.4)] active:scale-[0.985] cursor-pointer"
              >
                <JerseyCardInner />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ================= BELOW THE FOLD: CURTAIN SHEET SLIDING OVER STICKY HERO ================= */}
      <div className="relative z-10 -mt-3 sm:-mt-4 bg-pinkteam-paper rounded-t-[28px] sm:rounded-t-[36px] shadow-[0_-14px_40px_rgba(31,18,22,0.22)] pt-5 sm:pt-7 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <HomeLegacyTabs students={students} departments={departments} />
        </div>
      </div>
    </div>
  );
}

function JerseyCardInner() {
  return (
    <>
      <img
        src="/images/figma/jersey-models.webp"
        alt="เสื้อคณะสีชมพู อยุธยา 2569"
        loading="eager"
        decoding="async"
        className="w-full h-[84%] object-cover object-top drop-shadow-[8px_14px_10px_rgba(0,0,0,0.3)]"
      />
      <div className="absolute inset-x-0 bottom-0 h-[82px] min-[390px]:h-[92px] sm:h-[103px] flex items-end px-5 min-[390px]:px-7 pb-4 min-[390px]:pb-5">
        <img
          src="/images/figma/torn-menu-paper.webp"
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          className="absolute top-0 -left-[4.74%] w-[117.98%] max-w-none h-auto pointer-events-none"
        />
        <div className="relative z-10 w-full flex items-center justify-between gap-3">
          <span className="font-display font-bold text-3xl min-[390px]:text-4xl sm:text-[42px] leading-none text-white figma-text-shadow">
            สั่งจองเสื้อ
          </span>
          <span className="w-9 h-9 min-[390px]:w-10 min-[390px]:h-10 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-white transition-colors duration-200 group-hover:bg-pinkteam-magenta group-active:scale-95">
            <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
          </span>
        </div>
      </div>
    </>
  );
}
