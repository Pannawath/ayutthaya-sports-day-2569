'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Loader2,
  Mail,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Shuffle,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { ErrorState, SuccessBanner } from '@/components/ui/States';
import { ALL_ROOMS } from '@/lib/constants';

type ViewSide = 'both' | 'front' | 'back';

const SIZE_SPECS = [
  { size: 'SS', chest: '34"', length: '25"' },
  { size: 'S', chest: '36"', length: '26"' },
  { size: 'M', chest: '38"', length: '27"' },
  { size: 'L', chest: '40"', length: '28"' },
  { size: 'XL', chest: '42"', length: '29"' },
  { size: '2XL', chest: '44"', length: '30"' },
  { size: '3XL', chest: '46"', length: '31"' },
  { size: '4XL', chest: '48"', length: '32"' },
  { size: '5XL', chest: '50"', length: '33"' },
] as const;

type JerseySize = (typeof SIZE_SPECS)[number]['size'];

interface StudioOrderRecord {
  email: string;
  classroom: string;
  studentNumber: string;
  name: string;
  number: string;
  size: JerseySize;
  status: string;
  slipUrl?: string | null;
  slipFileName?: string | null;
}

function normalizeRawOrder(raw: Record<string, unknown>, fallbackEmail: string): StudioOrderRecord {
  const rawSize = String(raw.size || 'L').toUpperCase();
  const validSize = SIZE_SPECS.some((s) => s.size === rawSize)
    ? (rawSize as JerseySize)
    : 'L';
  return {
    email: String(raw.email || fallbackEmail),
    classroom: String(raw.classroom || raw.classRoom || ALL_ROOMS[0]),
    studentNumber: String(raw.studentNumber || raw.numberLabel || ''),
    name: String(raw.name || raw.screenName || 'AYUTTHAYA').toUpperCase(),
    number: String(raw.number || raw.screenNumber || '69'),
    size: validSize,
    status: String(raw.status || 'รอชำระเงิน'),
    slipUrl: raw.slipUrl ? String(raw.slipUrl) : null,
    slipFileName: raw.slipFileName ? String(raw.slipFileName) : null,
  };
}

function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ไฟล์รูปภาพไม่ถูกต้อง'));
      img.onload = () => {
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function BackJerseySvg({
  screenName,
  screenNumber,
  uid,
}: {
  screenName: string;
  screenNumber: string;
  uid: string;
}) {
  const displayName = (screenName.trim() || 'AYUTTHAYA').toUpperCase();
  const displayNumber = screenNumber.trim() || '69';
  const nameFontSize = displayName.length > 12 ? 54 : displayName.length > 8 ? 62 : 70;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      viewBox="0 0 780 1019"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <path id={`arc-${uid}`} d="M 160 310 Q 390 235 620 310" fill="none" />
      </defs>
      <text
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize={nameFontSize}
        fill="#5C3C2B"
        letterSpacing="4"
      >
        <textPath href={`#arc-${uid}`} startOffset="50%" textAnchor="middle">
          {displayName}
        </textPath>
      </text>
      <text
        x="390"
        y="505"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="800"
        fontSize="330"
        fill="#5C3C2B"
        letterSpacing="0.02em"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {displayNumber}
      </text>
    </svg>
  );
}

export function JerseyShopWorkspace() {
  const [viewSide, setViewSide] = useState<ViewSide>('both');

  // Email & existing order lookup
  const [email, setEmail] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  const [existingOrders, setExistingOrders] = useState<StudioOrderRecord[]>([]);
  const [selectedOrderIdx, setSelectedOrderIdx] = useState<number | null>(null);
  const [mode, setMode] = useState<'new' | 'edit'>('new');

  // Form fields
  const [classroomType, setClassroomType] = useState<string>(ALL_ROOMS[0]);
  const [customClassroom, setCustomClassroom] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [screenName, setScreenName] = useState('AYUTTHAYA');
  const [screenNumber, setScreenNumber] = useState('69');
  const [size, setSize] = useState<JerseySize>('L');

  // Slip upload & payment
  const [slipDataUrl, setSlipDataUrl] = useState<string | null>(null);
  const [slipFileName, setSlipFileName] = useState<string | null>(null);
  const [existingSlipUrl, setExistingSlipUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const selectedSpec = useMemo(
    () => SIZE_SPECS.find((s) => s.size === size) ?? SIZE_SPECS[3],
    [size]
  );

  const resolvedClassroom =
    classroomType === 'OTHER_STUDENT'
      ? customClassroom.trim() || 'ห้องอื่นๆ'
      : classroomType;

  const needsStudentNumber =
    classroomType !== 'คุณครู / บุคลากร' && classroomType !== 'บุคคลภายนอก';

  function applyOrderToForm(order: StudioOrderRecord, idx: number) {
    setSelectedOrderIdx(idx);
    setMode('edit');
    if (ALL_ROOMS.includes(order.classroom) || order.classroom === 'คุณครู / บุคลากร' || order.classroom === 'บุคคลภายนอก') {
      setClassroomType(order.classroom);
      setCustomClassroom('');
    } else {
      setClassroomType('OTHER_STUDENT');
      setCustomClassroom(order.classroom);
    }
    setStudentNumber(order.studentNumber);
    setScreenName(order.name);
    setScreenNumber(order.number);
    setSize(order.size);
    setExistingSlipUrl(order.slipUrl || null);
    setSlipDataUrl(null);
    setSlipFileName(order.slipFileName || null);
  }

  function startNewOrderWithSameEmail() {
    setSelectedOrderIdx(null);
    setMode('new');
    setScreenName('AYUTTHAYA');
    setScreenNumber('69');
    setSize('L');
    setSlipDataUrl(null);
    setSlipFileName(null);
    setExistingSlipUrl(null);
    setFeedback(null);
  }

  async function handleLookupEmail(targetEmail?: string) {
    const clean = (targetEmail ?? email).trim().toLowerCase();
    if (!clean || !clean.includes('@')) return;
    setCheckingEmail(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/shop/studio?email=${encodeURIComponent(clean)}`);
      const json = await res.json();
      setEmailChecked(true);
      if (json.found) {
        const rawList = Array.isArray(json.orders)
          ? json.orders
          : json.data
            ? [json.data]
            : [];
        const mapped = rawList.map((r: Record<string, unknown>) => normalizeRawOrder(r, clean));
        setExistingOrders(mapped);
        if (mapped.length > 0) {
          applyOrderToForm(mapped[0], 0);
        }
      } else {
        setExistingOrders([]);
        setSelectedOrderIdx(null);
        setMode('new');
      }
    } catch {
      // ignore transient network check
    } finally {
      setCheckingEmail(false);
    }
  }

  async function handleSlipChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToDataUrl(file);
      setSlipDataUrl(compressed);
      setSlipFileName(file.name);
      setFeedback(null);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'ไม่สามารถอ่านไฟล์สลิปได้',
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFeedback(null);

    if (!email.trim() || !email.includes('@')) {
      setFeedback({ type: 'error', message: 'กรุณากรอกอีเมลให้ถูกต้อง' });
      return;
    }
    if (needsStudentNumber && !studentNumber.trim()) {
      setFeedback({ type: 'error', message: 'กรุณากรอกเลขที่ (เช่น 15ก, 22ข)' });
      return;
    }
    if (!screenName.trim()) {
      setFeedback({ type: 'error', message: 'กรุณากรอกชื่อสกรีนหลังเสื้อ' });
      return;
    }
    if (!screenNumber.trim()) {
      setFeedback({ type: 'error', message: 'กรุณากรอกเบอร์สกรีน' });
      return;
    }
    if (mode === 'new' && !slipDataUrl) {
      setFeedback({ type: 'error', message: 'กรุณาแนบสลิปการโอนเงินก่อนกดยืนยัน' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/shop/studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          classroom: resolvedClassroom,
          studentNumber: needsStudentNumber ? studentNumber.trim() : '',
          name: screenName.trim().toUpperCase(),
          number: screenNumber.trim(),
          size,
          action: mode === 'edit' ? 'update' : 'create',
          mode,
          status:
            mode === 'edit' && selectedOrderIdx !== null
              ? existingOrders[selectedOrderIdx]?.status
              : undefined,
          slipImage: slipDataUrl,
          slipUrl: !slipDataUrl ? existingSlipUrl : null,
          slipFileName,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: json.error || 'สั่งจองไม่สำเร็จ' });
        return;
      }

      setFeedback({
        type: 'success',
        message: json.message || 'บันทึกการสั่งจองเสื้อเรียบร้อยแล้ว',
      });
      await handleLookupEmail(email);
    } catch {
      setFeedback({ type: 'error', message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' });
    } finally {
      setSubmitting(false);
    }
  }

  const activeExisting =
    selectedOrderIdx !== null ? existingOrders[selectedOrderIdx] ?? null : null;

  return (
    <div className="w-full relative">
      {/* ================= TOP STICKY HERO: LIVE JERSEY STUDIO (MATCHING HOME DESIGN) ================= */}
      <section className="figma-pink-backdrop sticky top-0 lg:top-16 z-0 overflow-hidden pt-14 lg:pt-8 pb-8 sm:pb-12">
        <img
          src="/images/figma/torn-stone.webp"
          alt=""
          aria-hidden="true"
          className="lg:hidden absolute top-0 -left-[17.73%] w-[137.5%] max-w-none h-auto -translate-y-[64%] pointer-events-none drop-shadow-[0_6px_12px_rgba(0,0,0,0.4)]"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          {/* Title Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-5">
            <div className="flex items-center gap-3">
              <img
                src="/images/figma/calligraphy-ayutthaya.webp"
                alt="คณะ อยุธยา"
                className="h-10 sm:h-12 w-auto object-contain drop-shadow-[0_4px_10px_rgba(31,18,22,0.55)]"
              />
              <div>
                <h1 className="font-display font-bold text-xl sm:text-2xl text-white figma-text-shadow">
                  สั่งจองเสื้อคณะสีชมพู 2569
                </h1>
                <p className="text-xs sm:text-sm text-white/90">
                  พิมพ์ชื่อ-เบอร์แล้วดูตัวอย่างคู่หน้าหลังได้ทันที
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-pinkteam-charcoal text-white font-mono font-bold text-base sm:text-lg shadow-lg border border-white/15">
              ฿285
            </span>
          </div>

          {/* Preview Stage Card matching Home Charcoal Arch Card */}
          <div className="figma-charcoal-surface rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-[0_16px_36px_rgba(31,18,22,0.4)] border border-white/10">
            {/* View Mode Toggle Tabs */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="inline-flex rounded-xl bg-black/35 p-1 border border-white/10">
                {(
                  [
                    { id: 'both', label: 'คู่หน้า-หลัง' },
                    { id: 'front', label: 'ด้านหน้า' },
                    { id: 'back', label: 'ด้านหลัง' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setViewSide(tab.id)}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-display font-medium transition-all duration-150 cursor-pointer ${
                      viewSide === tab.id
                        ? 'bg-pinkteam-magenta text-white shadow'
                        : 'text-white/75 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-white/80 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-pink-300" />
                ไซส์ {size} · {(screenName || 'AYUTTHAYA').toUpperCase()} #{screenNumber || '69'}
              </span>
            </div>

            {/* Live Jersey Canvas */}
            {viewSide === 'both' ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-6 items-center max-w-3xl mx-auto">
                <div className="relative aspect-[780/1019] w-full max-w-[260px] mx-auto">
                  <img
                    src="/assets/images/jersey_clean_front_preview.webp"
                    alt="ตัวอย่างเสื้อด้านหน้า"
                    className="w-full h-full object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.45)]"
                  />
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/55 text-[10px] text-white/90">
                    ด้านหน้า
                  </span>
                </div>
                <div className="relative aspect-[780/1019] w-full max-w-[260px] mx-auto">
                  <img
                    src="/assets/images/jersey_clean_back_preview.webp"
                    alt="ตัวอย่างเสื้อด้านหลัง"
                    className="w-full h-full object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.45)]"
                  />
                  <BackJerseySvg
                    screenName={screenName}
                    screenNumber={screenNumber}
                    uid="both"
                  />
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/55 text-[10px] text-white/90">
                    ด้านหลัง
                  </span>
                </div>
              </div>
            ) : viewSide === 'front' ? (
              <div className="relative aspect-[780/1019] w-full max-w-[280px] sm:max-w-[310px] mx-auto">
                <img
                  src="/assets/images/jersey_clean_front_preview.webp"
                  alt="ตัวอย่างเสื้อด้านหน้า"
                  className="w-full h-full object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.45)]"
                />
              </div>
            ) : (
              <div className="relative aspect-[780/1019] w-full max-w-[280px] sm:max-w-[310px] mx-auto">
                <img
                  src="/assets/images/jersey_clean_back_preview.webp"
                  alt="ตัวอย่างเสื้อด้านหลัง"
                  className="w-full h-full object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.45)]"
                />
                <BackJerseySvg
                  screenName={screenName}
                  screenNumber={screenNumber}
                  uid="single"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= CURTAIN ORDER SHEET SLIDING OVER STICKY PREVIEW ================= */}
      <div className="relative z-10 -mt-3 sm:-mt-4 bg-pinkteam-paper rounded-t-[28px] sm:rounded-t-[36px] shadow-[0_-14px_40px_rgba(31,18,22,0.22)] pt-5 sm:pt-7 pb-12">
        <form
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto px-4 sm:px-6 space-y-5"
        >
          {feedback && (
            <div>
              {feedback.type === 'success' ? (
                <SuccessBanner message={feedback.message} />
              ) : (
                <ErrorState message={feedback.message} />
              )}
            </div>
          )}

          {/* Step 1: Email & Order Lookup */}
          <section className="editorial-panel rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-semibold text-base sm:text-lg text-pinkteam-charcoal flex items-center gap-2">
                <Mail className="w-4 h-4 text-pinkteam-magenta" />
                <span>1. อีเมลผู้สั่งจอง &amp; เช็กสถานะ</span>
              </h2>
              {activeExisting && (
                <span className="px-2.5 py-1 rounded-full bg-pinkteam-blush text-pinkteam-magenta text-xs font-semibold">
                  {activeExisting.status}
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailChecked(false);
                }}
                onBlur={() => {
                  if (email.includes('@') && !emailChecked) handleLookupEmail();
                }}
                placeholder="กรอกอีเมล เช่น student@spk.ac.th"
                className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl border border-black/15 bg-white text-sm"
              />
              <button
                type="button"
                onClick={() => handleLookupEmail()}
                disabled={checkingEmail || !email.includes('@')}
                className="btn-animated min-h-[42px] px-4 py-2 rounded-xl editorial-raised hover:bg-black/5 text-pinkteam-charcoal text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {checkingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-pinkteam-muted" />
                )}
                <span>เช็กประวัติ</span>
              </button>
            </div>

            {existingOrders.length > 0 && (
              <div className="pt-2 border-t border-black/5 space-y-2">
                <div className="text-xs text-pinkteam-secondary">
                  พบคำสั่งซื้อเดิม {existingOrders.length} รายการ (แตะเพื่อแก้ไข หรือสั่งตัวใหม่เพิ่ม)
                </div>
                <div className="flex flex-wrap gap-2">
                  {existingOrders.map((ord, idx) => (
                    <button
                      key={`${ord.name}-${ord.number}-${idx}`}
                      type="button"
                      onClick={() => applyOrderToForm(ord, idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        selectedOrderIdx === idx && mode === 'edit'
                          ? 'bg-pinkteam-magenta text-white'
                          : 'editorial-raised text-pinkteam-charcoal hover:bg-black/5'
                      }`}
                    >
                      ตัวที่ {idx + 1}: {ord.size} ({ord.name} #{ord.number})
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={startNewOrderWithSameEmail}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 cursor-pointer transition-colors ${
                      mode === 'new'
                        ? 'bg-pinkteam-charcoal text-white'
                        : 'editorial-raised text-pinkteam-charcoal hover:bg-black/5'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>สั่งตัวใหม่เพิ่ม</span>
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Step 2: Classroom & Student Number */}
          <section className="editorial-panel rounded-2xl p-5 space-y-4">
            <h2 className="font-display font-semibold text-base sm:text-lg text-pinkteam-charcoal">
              2. ห้องเรียนและเลขที่
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-pinkteam-secondary mb-1.5">
                  ห้องเรียน / สังกัด
                </label>
                <select
                  value={classroomType}
                  onChange={(e) => setClassroomType(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-black/15 bg-white text-sm"
                >
                  {ALL_ROOMS.map((room) => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                  <option value="OTHER_STUDENT">นักเรียนห้องอื่น (ระบุเอง)</option>
                  <option value="คุณครู / บุคลากร">คุณครู / บุคลากร</option>
                  <option value="บุคคลภายนอก">บุคคลภายนอก</option>
                </select>
              </div>

              {classroomType === 'OTHER_STUDENT' && (
                <div>
                  <label className="block text-xs font-medium text-pinkteam-secondary mb-1.5">
                    ระบุห้องเรียน (เช่น ม.4/12)
                  </label>
                  <input
                    type="text"
                    value={customClassroom}
                    onChange={(e) => setCustomClassroom(e.target.value)}
                    placeholder="เช่น ม.4/12"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-black/15 bg-white text-sm"
                  />
                </div>
              )}

              {needsStudentNumber && (
                <div>
                  <label className="block text-xs font-medium text-pinkteam-secondary mb-1.5">
                    เลขที่ (ระบุ ก หรือ ข)
                  </label>
                  <input
                    type="text"
                    required
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    placeholder="เช่น 15ก, 22ข, 1ก"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-black/15 bg-white text-sm"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Step 3: Screen Name, Number & Size */}
          <section className="editorial-panel rounded-2xl p-5 space-y-4">
            <h2 className="font-display font-semibold text-base sm:text-lg text-pinkteam-charcoal">
              3. สกรีนหลังเสื้อและไซส์
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-pinkteam-secondary mb-1.5">
                  ชื่อสกรีนด้านหลัง (อังกฤษพิมพ์ใหญ่)
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={screenName}
                  onChange={(e) => setScreenName(e.target.value.toUpperCase())}
                  placeholder="AYUTTHAYA"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-black/15 bg-white text-sm font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-pinkteam-secondary mb-1.5">
                  เบอร์สกรีน (1–4 หลัก)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    value={screenNumber}
                    onChange={(e) => setScreenNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="69"
                    className="flex-1 min-h-[42px] px-3 py-2 rounded-xl border border-black/15 bg-white text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setScreenNumber(String(Math.floor(Math.random() * 99) + 1).padStart(2, '0'))
                    }
                    className="min-h-[42px] px-3 rounded-xl editorial-raised hover:bg-black/5 text-xs font-medium text-pinkteam-charcoal inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>สุ่ม</span>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-pinkteam-secondary">
                  เลือกไซส์เสื้อ
                </label>
                <span className="text-xs font-semibold text-pinkteam-magenta tabular-nums">
                  ไซส์ {selectedSpec.size} · อก {selectedSpec.chest} · ยาว {selectedSpec.length}
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
                {SIZE_SPECS.map((spec) => {
                  const active = spec.size === size;
                  return (
                    <button
                      key={spec.size}
                      type="button"
                      onClick={() => setSize(spec.size)}
                      className={`py-2.5 px-2 rounded-xl text-center transition-all duration-150 cursor-pointer border ${
                        active
                          ? 'bg-pinkteam-magenta text-white border-pinkteam-magenta shadow-md'
                          : 'bg-white text-pinkteam-charcoal border-black/10 hover:border-pinkteam-magenta/50'
                      }`}
                    >
                      <div className="font-display font-bold text-sm">{spec.size}</div>
                      <div
                        className={`text-[10px] tabular-nums ${
                          active ? 'text-white/90' : 'text-pinkteam-muted'
                        }`}
                      >
                        อก {spec.chest}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Step 4: Payment & Slip Upload */}
          <section className="editorial-panel rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display font-semibold text-base sm:text-lg text-pinkteam-charcoal flex items-center gap-2">
                <QrCode className="w-4 h-4 text-pinkteam-magenta" />
                <span>4. ชำระเงิน PromptPay &amp; แนบสลิป</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowQrModal((v) => !v)}
                className="text-xs font-medium text-pinkteam-magenta hover:underline cursor-pointer"
              >
                {showQrModal ? 'ซ่อน QR Code' : 'ขยายดู QR Code'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-5 flex flex-col items-center gap-2 rounded-2xl editorial-raised p-4">
                <img
                  src="/assets/images/qr-code.png"
                  alt="QR PromptPay น.ส. ภัททิยา เมืองวงษ์"
                  className={`${showQrModal ? 'w-56 h-56' : 'w-36 h-36'} object-contain bg-white rounded-xl p-2 shadow-sm transition-all`}
                />
                <div className="text-center">
                  <div className="text-xs font-semibold text-pinkteam-charcoal">
                    น.ส. ภัททิยา เมืองวงษ์
                  </div>
                  <div className="text-[11px] text-pinkteam-secondary">
                    ธนาคารกสิกรไทย · ยอดโอน ฿285
                  </div>
                </div>
                <a
                  href="/assets/images/qr-code.png"
                  download="PromptPay_QR_Ayutthaya_2569.png"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-black/10 text-xs font-medium text-pinkteam-charcoal hover:bg-black/5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>บันทึกรูป QR</span>
                </a>
              </div>

              <div className="sm:col-span-7 space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSlipChange}
                  className="hidden"
                />
                {slipDataUrl || existingSlipUrl ? (
                  <div className="rounded-2xl editorial-raised p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {slipDataUrl ? (
                        <img
                          src={slipDataUrl}
                          alt="ตัวอย่างสลิป"
                          className="w-12 h-14 rounded-lg object-cover border border-black/10 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-14 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-emerald-700">
                          แนบสลิปเรียบร้อยแล้ว
                        </div>
                        <div className="text-xs text-pinkteam-secondary truncate">
                          {slipFileName || 'สลิปในระบบ'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-lg hover:bg-black/5 text-pinkteam-charcoal cursor-pointer"
                        title="เปลี่ยนสลิป"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSlipDataUrl(null);
                          setSlipFileName(null);
                          setExistingSlipUrl(null);
                        }}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-600 cursor-pointer"
                        title="ลบสลิป"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-2xl border-2 border-dashed border-pinkteam-magenta/35 bg-pinkteam-blush/25 hover:bg-pinkteam-blush/45 p-6 text-center transition-colors cursor-pointer space-y-2"
                  >
                    <Upload className="w-6 h-6 text-pinkteam-magenta mx-auto" />
                    <div className="text-sm font-semibold text-pinkteam-charcoal">
                      แตะเพื่อแนบสลิปการโอนเงิน (฿285)
                    </div>
                    <div className="text-xs text-pinkteam-secondary">
                      รองรับไฟล์ JPG, PNG, WEBP
                    </div>
                  </button>
                )}

                {/* Summary & Submit CTA */}
                <div className="rounded-xl bg-pinkteam-charcoal text-white p-3.5 flex items-center justify-between gap-2 text-xs">
                  <div className="truncate">
                    <span className="text-white/70 block text-[10px]">สรุปรายการ</span>
                    <span className="font-semibold">
                      ไซส์ {size} · {(screenName || 'AYUTTHAYA').toUpperCase()} #{screenNumber || '69'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-base text-pink-300 shrink-0">฿285</span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-animated w-full min-h-[48px] rounded-xl bg-pinkteam-magenta hover:bg-pinkteam-deep text-white font-display font-semibold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>
                    {submitting
                      ? 'กำลังบันทึกคำสั่งจอง...'
                      : mode === 'edit'
                        ? 'บันทึกการแก้ไขข้อมูล'
                        : 'ยืนยันการสั่งจองและส่งสลิป'}
                  </span>
                </button>
              </div>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
