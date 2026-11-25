import Link from 'next/link';
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  Calendar,
  ClipboardCheck,
  Megaphone,
  Users,
} from 'lucide-react';
import { SourceModeBanner } from '@/components/ui/States';
import { SHOP_URL } from '@/lib/constants';
import { getAnnouncementsData, getAttendanceStatistics } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [stats, announcements] = await Promise.all([
    getAttendanceStatistics({ range: 'all' }),
    getAnnouncementsData(false),
  ]);

  const latestAnnouncements = announcements.slice(0, 3);
  const isExternalShop = SHOP_URL.startsWith('http');

  const quickMenu = [
    {
      href: '/check-in',
      title: 'เช็คชื่อเข้างาน',
      sub: 'เลขประจำตัว · QR · ใบกระดาษ',
      icon: ClipboardCheck,
    },
    {
      href: '/classrooms',
      title: 'ดูข้อมูลตามห้อง',
      sub: 'ม.1 – ม.6 · 21 ห้องเรียน',
      icon: Users,
    },
    {
      href: '/departments',
      title: 'ดูข้อมูลตามฝ่าย',
      sub: '8 ฝ่ายงาน · คณะกรรมการ',
      icon: Building2,
    },
    {
      href: '/statistics',
      title: 'สถิติเรียลไทม์',
      sub: 'กราฟเข้าร่วม · แนวโน้มเวลา',
      icon: BarChart3,
    },
  ];

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
                  className="absolute inset-0 w-full h-full object-cover object-center scale-105 blur-[3px]"
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
                  className="absolute inset-x-0 bottom-4 w-full h-[82%] object-contain object-bottom blur-[1.2px] opacity-95"
                />
                <img
                  src="/images/figma/torn-stone.png"
                  alt=""
                  aria-hidden="true"
                  className="absolute bottom-[calc(100%-122px)] -left-[17.73%] w-[137.5%] max-w-none h-auto pointer-events-none drop-shadow-[0_6px_12px_rgba(0,0,0,0.4)]"
                />

                {/* White Calligraphic "คณะ อยุธยา" Script */}
                <div className="absolute right-1 sm:right-6 bottom-0 z-20 pointer-events-none">
                  <img
                    src="/images/figma/calligraphy-ayutthaya.png"
                    alt="คณะ อยุธยา"
                    className="w-[260px] sm:w-[320px] lg:w-[360px] h-auto object-contain drop-shadow-[0_6px_14px_rgba(31,18,22,0.5)]"
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

      {/* ================= BELOW THE FOLD: CALM WARM-PAPER WORKSPACE ================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 space-y-6 pb-8">
        <SourceModeBanner sourceMode={stats.sourceMode} />

        {/* Real-time Attendance Overview */}
        <section aria-labelledby="overview-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1
                id="overview-heading"
                className="font-display font-semibold text-xl sm:text-2xl text-pinkteam-charcoal"
              >
                ภาพรวมคณะสีชมพู อยุธยา 2569
              </h1>
              <p className="text-sm text-pinkteam-secondary mt-0.5">
                {stats.activeSession
                  ? `รอบเช็คชื่อปัจจุบัน: ${stats.activeSession.title}`
                  : 'ข้อมูลตรงจากฐานข้อมูลจริง'}
              </p>
            </div>
            <Link
              href="/statistics"
              className="btn-animated group inline-flex items-center gap-1.5 min-h-[36px] px-3.5 py-1.5 rounded-lg editorial-panel text-xs font-medium text-pinkteam-charcoal hover:bg-pinkteam-raised transition-all duration-150 cursor-pointer"
            >
              <span>ดูสถิติทั้งหมด</span>
              <ArrowUpRight className="w-4 h-4 text-pinkteam-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.5} />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-2 editorial-panel rounded-xl p-4">
              <div className="text-xs font-normal text-pinkteam-muted">นักเรียนทั้งหมด</div>
              <div className="mt-1 font-display font-semibold text-2xl sm:text-3xl text-pinkteam-charcoal tabular-nums">
                {stats.totalStudents}
              </div>
              <div className="text-xs text-pinkteam-secondary mt-1 tabular-nums">
                6 ชั้น · 21 ห้อง
              </div>
            </div>
            <div className="lg:col-span-2 editorial-panel rounded-xl p-4">
              <div className="text-xs font-normal text-pinkteam-muted">ลงทะเบียนแล้ว</div>
              <div className="mt-1 font-display font-semibold text-2xl sm:text-3xl text-pinkteam-charcoal tabular-nums">
                {stats.totalStudents}
              </div>
              <div className="text-xs text-pinkteam-secondary mt-1 tabular-nums">8 ฝ่ายงาน</div>
            </div>
            <div className="lg:col-span-2 editorial-panel rounded-xl p-4">
              <div className="text-xs font-normal text-pinkteam-muted">มาเข้าร่วม</div>
              <div className="mt-1 font-display font-semibold text-2xl sm:text-3xl text-pinkteam-charcoal tabular-nums">
                {stats.checkedInCount}
              </div>
              <div className="text-xs text-pinkteam-secondary mt-1">ยืนยันเช็คชื่อแล้ว</div>
            </div>
            <div className="lg:col-span-2 editorial-panel rounded-xl p-4">
              <div className="text-xs font-normal text-pinkteam-muted">ยังไม่มา</div>
              <div className="mt-1 font-display font-semibold text-2xl sm:text-3xl text-pinkteam-charcoal tabular-nums">
                {stats.pendingCount}
              </div>
              <div className="text-xs text-pinkteam-secondary mt-1">รอเช็คชื่อ</div>
            </div>
            <div className="col-span-2 lg:col-span-4 editorial-panel rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-normal text-pinkteam-muted">อัตราการเข้าร่วม</span>
                <span className="font-display font-semibold text-2xl sm:text-3xl text-pinkteam-magenta tabular-nums">
                  {stats.attendanceRate}%
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="w-full h-2 bg-pinkteam-raised rounded-full overflow-hidden">
                  <div
                    className="h-full bg-pinkteam-magenta transition-[width] duration-300"
                    style={{ width: `${Math.min(100, stats.attendanceRate)}%` }}
                  />
                </div>
                <div className="text-xs text-pinkteam-secondary tabular-nums">
                  {stats.checkedInCount} จาก {stats.totalStudents} คน
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Quick Action Menus */}
        <section aria-label="เมนูลัดระบบ" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickMenu.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="btn-animated group editorial-panel rounded-xl p-4 hover:bg-pinkteam-blush/60 hover:-translate-y-1 hover:border-pinkteam-magenta/35 hover:shadow-md active:scale-[0.98] transition-all duration-200 flex flex-col justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center justify-between text-pinkteam-muted">
                  <Icon className="w-4 h-4 text-pinkteam-magenta transition-transform duration-200 group-hover:scale-110" strokeWidth={1.5} />
                  <ArrowUpRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-pinkteam-magenta" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="font-display font-medium text-sm sm:text-base text-pinkteam-charcoal">
                    {item.title}
                  </div>
                  <div className="text-xs text-pinkteam-secondary mt-0.5">{item.sub}</div>
                </div>
              </Link>
            );
          })}
        </section>

        {/* Latest Announcements */}
        <section className="editorial-panel rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Megaphone className="w-4 h-4 text-pinkteam-muted" strokeWidth={1.5} />
              <div>
                <h2 className="font-display font-semibold text-base text-pinkteam-charcoal">
                  ข่าวสารและประกาศล่าสุด
                </h2>
              </div>
            </div>
            <Link
              href="/announcements"
              className="btn-animated inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-pinkteam-magenta hover:bg-pinkteam-blush/60 cursor-pointer"
            >
              ดูทั้งหมด
            </Link>
          </div>

          {latestAnnouncements.length === 0 ? (
            <div className="rounded-xl editorial-raised p-6 text-center text-sm text-pinkteam-secondary">
              ยังไม่มีประกาศที่เผยแพร่ในขณะนี้
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {latestAnnouncements.map((ann) => (
                <Link
                  key={ann.id}
                  href={`/announcements?id=${ann.id}`}
                  className="btn-animated group rounded-xl border border-black/10 bg-white overflow-hidden hover:border-pinkteam-magenta/40 hover:-translate-y-1 hover:shadow-md active:scale-[0.985] transition-all duration-200 flex flex-col cursor-pointer"
                >
                  {ann.imageUrl && (
                    <img
                      src={ann.imageUrl}
                      alt={ann.title}
                      className="w-full h-36 object-cover"
                    />
                  )}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-2">
                    <div>
                      <span className="text-xs font-medium text-pinkteam-magenta">
                        {ann.category === 'SCHEDULE' ? 'กำหนดการ' : 'ข่าวสาร'}
                      </span>
                      <h3 className="mt-1 font-display font-medium text-sm text-pinkteam-charcoal line-clamp-2">
                        {ann.title}
                      </h3>
                      <p className="mt-1 text-xs text-pinkteam-secondary line-clamp-2">
                        {ann.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-pinkteam-muted pt-2 border-t border-black/5 tabular-nums">
                      <Calendar className="w-4 h-4" strokeWidth={1.5} />
                      <span>
                        {new Date(ann.publishedAt).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
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
