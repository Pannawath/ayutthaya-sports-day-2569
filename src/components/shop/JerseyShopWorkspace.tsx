'use client';

import React, { useMemo, useState } from 'react';
import { Check, Search, Shirt } from 'lucide-react';
import { EmptyState, ErrorState, SuccessBanner } from '@/components/ui/States';
import { ALL_ROOMS, NUMBERS } from '@/lib/constants';
import type { LiveJerseyOrderRow } from '@/lib/live-store';

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

export function JerseyShopWorkspace({
  initialOrders,
}: {
  initialOrders: LiveJerseyOrderRow[];
}) {
  const [orders, setOrders] = useState<LiveJerseyOrderRow[]>(initialOrders);
  const [studentCode, setStudentCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [classRoom, setClassRoom] = useState(ALL_ROOMS[0]);
  const [numberLabel, setNumberLabel] = useState(NUMBERS[0]);
  const [screenName, setScreenName] = useState('AYUTTHAYA');
  const [screenNumber, setScreenNumber] = useState('69');
  const [size, setSize] = useState<(typeof SIZE_SPECS)[number]['size']>('L');
  const [quantity, setQuantity] = useState(1);

  const [lookupQuery, setLookupQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const filteredOrders = useMemo(() => {
    const q = lookupQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.full_name.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.class_room.toLowerCase().includes(q) ||
        o.screen_name.toLowerCase().includes(q) ||
        (o.student_code || '').toLowerCase().includes(q)
    );
  }, [orders, lookupQuery]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/shop/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentCode: studentCode.trim() || null,
          fullName: fullName.trim(),
          email: email.trim(),
          classRoom,
          numberLabel,
          screenName: screenName.trim(),
          screenNumber: screenNumber.trim(),
          size,
          quantity,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: json.error || 'สั่งจองไม่สำเร็จ' });
        return;
      }
      setOrders((prev) => [json.order, ...prev]);
      setFeedback({ type: 'success', message: json.message });
      setFullName('');
      setEmail('');
      setStudentCode('');
      setQuantity(1);
    } catch {
      setFeedback({ type: 'error', message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' });
    } finally {
      setSubmitting(false);
    }
  }

  const selectedSpec = SIZE_SPECS.find((s) => s.size === size)!;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 lg:pt-8 space-y-5">
      <div className="editorial-panel rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl text-pinkteam-charcoal">
            สั่งจองเสื้อคณะสีชมพู อยุธยา 2569
          </h1>
          <p className="text-sm text-pinkteam-secondary mt-1">
            เลือกไซส์ กำหนดชื่อและเบอร์สกรีนหลังเสื้อ พร้อมตรวจสอบคำสั่งจองแบบเรียลไทม์
          </p>
        </div>
        <div className="text-right tabular-nums">
          <div className="text-xs text-pinkteam-muted">ยอดจองสะสมในระบบ</div>
          <div className="font-display font-semibold text-2xl text-pinkteam-magenta">
            {orders.length} รายการ
          </div>
        </div>
      </div>

      {feedback &&
        (feedback.type === 'success' ? (
          <SuccessBanner message={feedback.message} />
        ) : (
          <ErrorState message={feedback.message} />
        ))}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:items-start">
        {/* Left: Jersey Showcase + Live Screen Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="editorial-panel rounded-2xl overflow-hidden">
            <div className="relative bg-pinkteam-charcoal p-5 text-white">
              <img
                src="/images/figma/jersey-models.png"
                alt="เสื้อคณะสีชมพู อยุธยา 2569"
                className="w-full h-64 object-contain mx-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.45)]"
              />
              <div className="mt-4 rounded-xl bg-white/10 border border-white/15 p-4 text-center">
                <div className="text-xs text-white/75">ตัวอย่างลายสกรีนหลังเสื้อ</div>
                <div className="mt-1 font-display font-bold text-xl tracking-wider text-white uppercase">
                  {screenName.trim() || 'AYUTTHAYA'}
                </div>
                <div className="font-display font-bold text-4xl text-pinkteam-light tabular-nums leading-none mt-1">
                  {screenNumber.trim() || '69'}
                </div>
                <div className="mt-2 text-xs text-white/80 tabular-nums">
                  ไซส์ {selectedSpec.size} · อก {selectedSpec.chest} · ยาว {selectedSpec.length}
                </div>
              </div>
            </div>
          </div>

          <div className="editorial-panel rounded-2xl p-4 space-y-2.5">
            <div className="font-display font-medium text-sm text-pinkteam-charcoal">
              เลือกขนาดเสื้อ (นิ้ว)
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-3 gap-2">
              {SIZE_SPECS.map((spec) => {
                const active = spec.size === size;
                return (
                  <button
                    key={spec.size}
                    type="button"
                    onClick={() => setSize(spec.size)}
                    className={`min-h-[44px] rounded-xl p-2 text-center border transition-colors duration-150 cursor-pointer ${
                      active
                        ? 'bg-pinkteam-magenta text-white border-pinkteam-magenta'
                        : 'editorial-raised text-pinkteam-charcoal hover:bg-black/5'
                    }`}
                  >
                    <div className="font-display font-semibold text-sm">{spec.size}</div>
                    <div className={`text-[11px] tabular-nums ${active ? 'text-white/85' : 'text-pinkteam-muted'}`}>
                      {spec.chest}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Order Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 editorial-panel rounded-2xl p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-black/10 pb-3">
            <Shirt className="w-4 h-4 text-pinkteam-magenta" strokeWidth={1.5} />
            <h2 className="font-display font-semibold text-base text-pinkteam-charcoal">
              กรอกข้อมูลสั่งจองเสื้อ
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-pinkteam-charcoal mb-1">
                ชื่อ-นามสกุลผู้สั่ง <span className="text-pinkteam-magenta">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="เช่น กฤติยา มั่งมี"
                className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-pinkteam-charcoal mb-1">
                อีเมลสำหรับติดตามสถานะ <span className="text-pinkteam-magenta">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@ayutthaya.shop"
                className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-pinkteam-charcoal mb-1">
                เลขประจำตัว (ถ้ามี)
              </label>
              <input
                type="text"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                placeholder="เช่น 69001"
                className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-pinkteam-charcoal mb-1">
                ชั้น / ห้อง <span className="text-pinkteam-magenta">*</span>
              </label>
              <select
                value={classRoom}
                onChange={(e) => setClassRoom(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-sm cursor-pointer"
              >
                {ALL_ROOMS.map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-pinkteam-charcoal mb-1">
                เลขที่และกลุ่ม <span className="text-pinkteam-magenta">*</span>
              </label>
              <select
                value={numberLabel}
                onChange={(e) => setNumberLabel(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-sm cursor-pointer"
              >
                {NUMBERS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-pinkteam-charcoal mb-1">
                ชื่อสกรีนหลังเสื้อ <span className="text-pinkteam-magenta">*</span>
              </label>
              <input
                type="text"
                value={screenName}
                maxLength={20}
                onChange={(e) => setScreenName(e.target.value)}
                placeholder="AYUTTHAYA"
                className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-sm uppercase"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-pinkteam-charcoal mb-1">
                เบอร์สกรีน <span className="text-pinkteam-magenta">*</span>
              </label>
              <input
                type="text"
                value={screenNumber}
                maxLength={4}
                onChange={(e) => setScreenNumber(e.target.value)}
                placeholder="69"
                className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-sm tabular-nums"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-pinkteam-charcoal mb-1">
                จำนวน (ตัว)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-black/15 bg-white text-sm tabular-nums"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-pinkteam-magenta hover:bg-pinkteam-deep text-white font-display font-medium text-sm transition-colors duration-150 disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-4 h-4" strokeWidth={1.5} />
            <span>{submitting ? 'กำลังบันทึกคำสั่งจอง' : `ยืนยันสั่งจองเสื้อไซส์ ${size}`}</span>
          </button>
        </form>
      </div>

      {/* Order Lookup */}
      <div className="editorial-panel rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display font-semibold text-base text-pinkteam-charcoal">
            ตรวจสอบรายการสั่งจอง ({filteredOrders.length})
          </h2>
          <div className="relative w-full sm:w-72">
            <Search
              className="w-4 h-4 text-pinkteam-muted absolute left-3 top-1/2 -translate-y-1/2"
              strokeWidth={1.5}
            />
            <input
              type="text"
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, อีเมล, ชื่อสกรีน หรือห้อง"
              className="w-full min-h-[40px] pl-9 pr-3 py-2 rounded-lg border border-black/15 bg-white text-sm"
            />
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <EmptyState
            title="ยังไม่มีรายการสั่งจองในระบบ"
            description="กรอกแบบฟอร์มด้านบนเพื่อบันทึกคำสั่งจองเสื้อคณะสีชมพู"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredOrders.map((o) => (
              <div key={o.id} className="rounded-xl editorial-raised p-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display font-medium text-sm text-pinkteam-charcoal truncate">
                    {o.full_name}
                  </div>
                  <span className="text-xs font-medium text-pinkteam-magenta shrink-0 tabular-nums">
                    ไซส์ {o.size} × {o.quantity}
                  </span>
                </div>
                <div className="text-xs text-pinkteam-secondary tabular-nums">
                  ห้อง {o.class_room} · เลขที่ {o.number_label} · สกรีน {o.screen_name} #{o.screen_number}
                </div>
                <div className="text-xs text-pinkteam-muted flex items-center justify-between pt-1 border-t border-black/5">
                  <span className="truncate">{o.email}</span>
                  <span className="font-medium text-pinkteam-charcoal shrink-0">{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
