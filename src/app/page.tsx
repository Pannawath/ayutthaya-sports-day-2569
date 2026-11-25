import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { HomeLegacyTabs } from '@/components/home/HomeLegacyTabs';
import { SHOP_URL } from '@/lib/constants';
import { getDepartmentsData, getStudentsData } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [{ students }, departments] = await Promise.all([
    getStudentsData(),
    getDepartmentsData(),
  ]);

  const isExternalShop = SHOP_URL.startsWith('http');

  return (
    <div className="w-full">
      {/* ================= ABOVE THE FOLD: FIGMA HERO + FEATURED JERSEY CARD ================= */}
      <section className="figma-pink-backdrop relative overflow-hidden pb-10 lg:pb-12">
        <div className="lg:max-w-7xl lg:mx-auto lg:px-6 lg:pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-8 lg:items-center">
            {/* Left / Top Editorial Hero Collage */}
            <div className="lg:col-span-7 relative">
              <div className="relative h-[340px] sm:h-[380px] lg:h-[440px] w-full overflow-hidden lg:rounded-2xl">
                <img
                  src="/images/figma/hero-bg-1.png"
                  alt=""
                  aria-hidden="true"
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
                  src="/images/figma/hero-bg-4.png"
                  alt="คณะกรรมการสีชมพู อยุธยา 2569"
                  className="absolute inset-x-0 bottom-4 w-full h-[82%] object-contain object-bottom"
                />
                <img
                  src="/images/figma/torn-stone.png"
                  alt=""
                  aria-hidden="true"
                  className="absolute bottom-[calc(100%-122px)] -left-[17.73%] w-[137.5%] max-w-none h-auto pointer-events-none drop-shadow-[0_6px_12px_rgba(0,0,0,0.4)]"
                />

                {/* White Calligraphic "คณะ อยุธยา" Script */}
                <div className="absolute -right-8 sm:-right-6 lg:-right-4 -bottom-14 sm:-bottom-16 z-20 pointer-events-none">
                  <img
                    src="/images/figma/calligraphy-ayutthaya.png"
                    alt="คณะ อยุธยา"
                    className="w-[390px] sm:w-[443px] lg:w-[490px] max-w-none h-auto object-contain drop-shadow-[0_2px_3px_rgba(31,18,22,0.85)] drop-shadow-[0_8px_16px_rgba(31,18,22,0.55)]"
                  />
                </div>
              </div>
            </div>

            {/* Right / Center Featured "สั่งจองเสื้อ" Card matching Figma Arch Geometry */}
            <div className="lg:col-span-5 px-7 sm:px-8 lg:px-0 mt-3 lg:mt-0">
              {isExternalShop ? (
                <a
                  href={SHOP_URL}
                  className="btn-animated block group relative w-full max-w-[384px] mx-auto lg:max-w-none h-[340px] sm:h-[365px] figma-card-arch figma-charcoal-surface overflow-hidden shadow-[0_14px_28px_rgba(31,18,22,0.35)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_36px_rgba(31,18,22,0.42)] active:scale-[0.985] cursor-pointer"
                >
                  <JerseyCardInner />
                </a>
              ) : (
                <Link
                  href={SHOP_URL}
                  className="btn-animated block group relative w-full max-w-[384px] mx-auto lg:max-w-none h-[340px] sm:h-[365px] figma-card-arch figma-charcoal-surface overflow-hidden shadow-[0_14px_28px_rgba(31,18,22,0.35)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_36px_rgba(31,18,22,0.42)] active:scale-[0.985] cursor-pointer"
                >
                  <JerseyCardInner />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= BELOW THE FOLD: LEGACY HOME TABS & REAL-TIME DIRECTORY ================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 pb-8">
        <HomeLegacyTabs students={students} departments={departments} />
      </div>
    </div>
  );
}

function JerseyCardInner() {
  return (
    <>
      <img
        src="/images/figma/jersey-models.png"
        alt="เสื้อคณะสีชมพู อยุธยา 2569"
        className="w-full h-[84%] object-cover object-top drop-shadow-[8px_14px_10px_rgba(0,0,0,0.3)] transition-transform duration-300 ease-out group-hover:scale-[1.03]"
      />
      <div className="absolute inset-x-0 bottom-0 h-[103px] flex items-end px-7 pb-5">
        <img
          src="/images/figma/torn-menu-paper.png"
          alt=""
          aria-hidden="true"
          className="absolute top-0 -left-[4.74%] w-[117.98%] max-w-none h-auto pointer-events-none"
        />
        <div className="relative z-10 w-full flex items-center justify-between gap-3">
          <span className="font-display font-bold text-4xl sm:text-[42px] leading-none text-white figma-text-shadow">
            สั่งจองเสื้อ
          </span>
          <span className="w-10 h-10 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-white transition-all duration-200 group-hover:bg-pinkteam-magenta group-hover:scale-110 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-active:scale-90">
            <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
          </span>
        </div>
      </div>
    </>
  );
}
