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
      <section className="relative overflow-hidden">
        {/* Top Mobile/Editorial Hero Collage matching หน้าหลัก.svg */}
        <div className="lg:max-w-7xl lg:mx-auto lg:px-6 lg:pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-8 lg:items-center">
            {/* Left / Top Editorial Hero Collage */}
            <div className="lg:col-span-7 relative">
              <div className="relative h-[340px] sm:h-[380px] lg:h-[440px] w-full overflow-hidden lg:rounded-3xl lg:shadow-2xl">
                {/* Blurred Stadium + Pink Aura Backdrop */}
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
                      'linear-gradient(180deg, rgba(31,18,22,0.25) 0%, rgba(255,175,202,0.22) 60%, rgba(255,175,202,0.92) 100%)',
                  }}
                />
                {/* Committee Group Photo */}
                <img
                  src="/images/figma/hero-bg-4.png"
                  alt="คณะกรรมการสีชมพู อยุธยา 2569"
                  className="absolute inset-x-0 bottom-4 w-full h-[82%] object-contain object-bottom blur-[1.2px] opacity-95"
                />
                {/* Top Torn Charcoal Edge */}
                <img
                  src="/images/figma/torn-stone.png"
                  alt=""
                  aria-hidden="true"
                  className="absolute -top-24 sm:-top-28 inset-x-0 w-[115%] -left-[7%] max-w-none h-[180px] object-cover object-bottom drop-shadow-[0_6px_12px_rgba(0,0,0,0.4)]"
                />

                {/* Editorial Top Badge */}
                <div className="relative z-10 pt-5 px-5 lg:px-7 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 text-pinkteam-charcoal text-[11px] font-display font-bold tracking-wider uppercase shadow">
                    <span className="w-2 h-2 rounded-full bg-pinkteam-magenta" />
                    AYUTTHAYA SPORTS DAY 2569
                  </span>
                </div>

                {/* White Calligraphic "คณะ อยุธยา" Script */}
                <div className="absolute right-1 sm:right-6 bottom-0 z-20 pointer-events-none">
                  <img
                    src="/images/figma/calligraphy-ayutthaya.png"
                    alt="คณะ อยุธยา"
                    className="w-[260px] sm:w-[320px] lg:w-[360px] h-auto object-contain drop-shadow-[0_6px_14px_rgba(31,18,22,0.55)]"
                  />
                </div>
              </div>
            </div>

            {/* Right / Center Featured "สั่งจองเสื้อ" Card matching Figma Arch Geometry */}
            <div className="lg:col-span-5 px-7 sm:px-8 lg:px-0 mt-3 lg:mt-0">
              {isExternalShop ? (
                <a
                  href={SHOP_URL}
                  className="block group relative w-full max-w-[384px] mx-auto lg:max-w-none h-[340px] sm:h-[365px] figma-card-arch figma-charcoal-surface overflow-hidden shadow-[0_18px_36px_rgba(31,18,22,0.42)] transition-transform duration-300 hover:-translate-y-1"
                >
                  <JerseyCardInner />
                </a>
              ) : (
                <Link
                  href={SHOP_URL}
                  className="block group relative w-full max-w-[384px] mx-auto lg:max-w-none h-[340px] sm:h-[365px] figma-card-arch figma-charcoal-surface overflow-hidden shadow-[0_18px_36px_rgba(31,18,22,0.42)] transition-transform duration-300 hover:-translate-y-1"
                >
                  <JerseyCardInner />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= BELOW THE FOLD: LIVE STATS, 4 QUICK MENUS & ANNOUNCEMENTS ================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 space-y-6 pb-8">
        <SourceModeBanner sourceMode={stats.sourceMode} />

        {/* Real-time Attendance Overview */}
        <section aria-labelledby="overview-heading" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2 text-white">
            <div>
              <h1 id="overview-heading" className="font-display font-bold text-xl sm:text-2xl figma-text-shadow">
                ภาพรวมคณะสีชมพู (อยุธยา 2569)
              </h1>
              <p className="text-xs sm:text-sm text-white/90">
                {stats.activeSession
                  ? `รอบเช็คชื่อปัจจุบัน: ${stats.activeSession.title}`
                  : 'ข้อมูลตรงจากฐานข้อมูลจริง (พร้อมรอบเช็คชื่อ)'}
              </p>
            </div>
            <Link
              href="/statistics"
              className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-pinkteam-charcoal/80 hover:bg-pinkteam-charcoal px-3 py-1.5 rounded-full transition"
            >
              ดูสถิติเชิงลึก <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="editorial-panel rounded-2xl p-4">
              <div className="text-xs font-semibold text-pinkteam-muted">นักเรียนทั้งหมดในระบบ</div>
              <div className="mt-1 font-display font-extrabold text-3xl text-pinkteam-charcoal">
                {stats.totalStudents}
              </div>
              <div className="text-[11px] text-pinkteam-muted mt-0.5">6 ระดับชั้น · 21 ห้อง</div>
            </div>
            <div className="editorial-panel rounded-2xl p-4">
              <div className="text-xs font-semibold text-pinkteam-muted">ผู้ลงทะเบียนแล้ว</div>
              <div className="mt-1 font-display font-extrabold text-3xl text-pinkteam-magenta">
                {stats.totalStudents}
              </div>
              <div className="text-[11px] text-pinkteam-muted mt-0.5">8 ฝ่ายงาน + ส่วนกลาง</div>
            </div>
            <div className="editorial-panel rounded-2xl p-4">
              <div className="text-xs font-semibold text-emerald-700">มาเข้าร่วมแล้ว</div>
              <div className="mt-1 font-display font-extrabold text-3xl text-emerald-600">
                {stats.checkedInCount}
              </div>
              <div className="text-[11px] text-emerald-700/80 mt-0.5">ยืนยันเช็คชื่อแล้ว</div>
            </div>
            <div className="editorial-panel rounded-2xl p-4">
              <div className="text-xs font-semibold text-amber-700">ยังไม่มา / รอเช็คชื่อ</div>
              <div className="mt-1 font-display font-extrabold text-3xl text-amber-600">
                {stats.pendingCount}
              </div>
              <div className="text-[11px] text-amber-700/80 mt-0.5">รอดำเนินการ</div>
            </div>
            <div className="col-span-2 lg:col-span-1 figma-charcoal-surface text-white rounded-2xl p-4 flex flex-col justify-between">
              <div className="text-xs font-semibold text-pinkteam-light">เปอร์เซ็นต์เข้าร่วม</div>
              <div className="mt-1 font-display font-extrabold text-3xl text-white">
                {stats.attendanceRate}%
              </div>
              <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-pinkteam-light transition-all"
                  style={{ width: `${Math.min(100, stats.attendanceRate)}%` }}
                />
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
                className="editorial-panel rounded-2xl p-4 hover:border-pinkteam-magenta transition group flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-pinkteam-blush text-pinkteam-magenta flex items-center justify-center group-hover:bg-pinkteam-magenta group-hover:text-white transition">
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-pinkteam-muted group-hover:text-pinkteam-magenta transition" />
                </div>
                <div>
                  <div className="font-display font-bold text-sm sm:text-base text-pinkteam-charcoal">
                    {item.title}
                  </div>
                  <div className="text-xs text-pinkteam-muted mt-0.5">{item.sub}</div>
                </div>
              </Link>
            );
          })}
        </section>

        {/* Latest Announcements */}
        <section className="editorial-panel rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-pinkteam-magenta text-white flex items-center justify-center">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base sm:text-lg text-pinkteam-charcoal">
                  ข่าวสารและประกาศล่าสุด
                </h2>
                <p className="text-xs text-pinkteam-muted">กำหนดการซ้อมและประกาศสำคัญจากคณะสีชมพู</p>
              </div>
            </div>
            <Link
              href="/announcements"
              className="text-xs font-semibold text-pinkteam-magenta hover:underline"
            >
              ดูทั้งหมด
            </Link>
          </div>

          {latestAnnouncements.length === 0 ? (
            <div className="rounded-2xl bg-pinkteam-blush/70 border border-pinkteam-soft p-6 text-center text-sm text-pinkteam-muted">
              ยังไม่มีประกาศที่เผยแพร่ในขณะนี้
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {latestAnnouncements.map((ann) => (
                <Link
                  key={ann.id}
                  href={`/announcements?id=${ann.id}`}
                  className="rounded-2xl border border-pinkteam-soft bg-white overflow-hidden hover:border-pinkteam-magenta transition flex flex-col"
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
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          ann.category === 'SCHEDULE'
                            ? 'bg-pinkteam-charcoal text-white'
                            : 'bg-pinkteam-soft text-pinkteam-magenta'
                        }`}
                      >
                        {ann.category === 'SCHEDULE' ? 'กำหนดการ' : 'ข่าวสาร'}
                      </span>
                      <h3 className="mt-2 font-display font-bold text-sm text-pinkteam-charcoal line-clamp-2">
                        {ann.title}
                      </h3>
                      <p className="mt-1 text-xs text-pinkteam-muted line-clamp-2">
                        {ann.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-pinkteam-muted pt-2 border-t border-pinkteam-blush">
                      <Calendar className="w-3.5 h-3.5" />
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
        className="w-full h-[84%] object-cover object-top drop-shadow-[10px_19px_10px_rgba(0,0,0,0.35)] transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[112px] flex items-end px-7 pb-5"
        style={{
          backgroundImage: "url('/images/figma/torn-stone.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
        }}
      >
        <div className="w-full flex items-center justify-between gap-3">
          <div>
            <span className="font-display font-extrabold text-4xl sm:text-[42px] leading-none text-white figma-text-shadow">
              สั่งจองเสื้อ
            </span>
          </div>
          <span className="w-10 h-10 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-white group-hover:bg-pinkteam-magenta transition">
            <ArrowUpRight className="w-5 h-5" />
          </span>
        </div>
      </div>
    </>
  );
}
