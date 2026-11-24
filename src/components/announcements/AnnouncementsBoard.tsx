'use client';

import React, { useMemo, useState } from 'react';
import { Calendar, Megaphone, Plus, Trash2, Upload, X } from 'lucide-react';
import { EmptyState, ErrorState, SuccessBanner } from '@/components/ui/States';
import type { AnnouncementRecord, UserProfile } from '@/lib/types';

interface AnnouncementsBoardProps {
  initialAnnouncements: AnnouncementRecord[];
  profile: UserProfile | null;
}

export function AnnouncementsBoard({
  initialAnnouncements,
  profile,
}: AnnouncementsBoardProps) {
  const [items, setItems] = useState<AnnouncementRecord[]>(initialAnnouncements);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'NEWS' | 'SCHEDULE'>('ALL');
  const [detailItem, setDetailItem] = useState<AnnouncementRecord | null>(null);

  // Admin create modal
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'NEWS' | 'SCHEDULE'>('NEWS');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const isAdmin = profile?.role === 'ADMIN';

  const filtered = useMemo(() => {
    if (categoryFilter === 'ALL') return items;
    return items.filter((a) => a.category === categoryFilter);
  }, [items, categoryFilter]);

  async function refreshList() {
    const res = await fetch(`/api/announcements${isAdmin ? '?all=1' : ''}`);
    if (res.ok) {
      const json = await res.json();
      setItems(json.announcements || []);
    }
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    setFeedback(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/announcements/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'อัปโหลดรูปไม่สำเร็จ' });
        return;
      }
      setImageUrl(data.imageUrl);
      setFeedback({ type: 'success', message: 'อัปโหลดรูปประกอบเรียบร้อยแล้ว' });
    } catch {
      setFeedback({ type: 'error', message: 'เกิดข้อผิดพลาดระหว่างอัปโหลดรูป' });
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, content, imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'เพิ่มประกาศไม่สำเร็จ' });
        return;
      }
      setTitle('');
      setContent('');
      setImageUrl('');
      setShowForm(false);
      setFeedback({ type: 'success', message: 'เผยแพร่ประกาศเรียบร้อยแล้ว' });
      await refreshList();
    } catch {
      setFeedback({ type: 'error', message: 'ไม่สามารถบันทึกประกาศได้' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('ยืนยันการลบประกาศนี้?')) return;
    const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setDetailItem(null);
      setFeedback({ type: 'success', message: 'ลบประกาศแล้ว' });
      await refreshList();
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 lg:pt-8 space-y-5">
      <div className="editorial-panel rounded-3xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex px-2.5 py-0.5 rounded-full bg-pinkteam-blush text-pinkteam-magenta text-xs font-bold">
            08 · ANNOUNCEMENTS & SCHEDULE
          </span>
          <h1 className="mt-1.5 font-display font-extrabold text-2xl text-pinkteam-charcoal">
            ข่าวสารและกำหนดการคณะสีชมพู
          </h1>
          <p className="text-sm text-pinkteam-muted">
            ติดตามประกาศ ตารางซ้อม และนัดหมายสำคัญของคณะอยุธยา 2569
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-pinkteam-blush p-1 border border-pinkteam-soft">
            {(
              [
                { id: 'ALL', label: 'ทั้งหมด' },
                { id: 'NEWS', label: 'ข่าวสาร' },
                { id: 'SCHEDULE', label: 'กำหนดการ' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCategoryFilter(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  categoryFilter === opt.id
                    ? 'bg-pinkteam-magenta text-white'
                    : 'text-pinkteam-charcoal'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pinkteam-charcoal text-white text-xs font-bold"
            >
              <Plus className="w-4 h-4" /> เพิ่มประกาศใหม่
            </button>
          )}
        </div>
      </div>

      {feedback &&
        (feedback.type === 'success' ? (
          <SuccessBanner message={feedback.message} />
        ) : (
          <ErrorState message={feedback.message} />
        ))}

      {showForm && isAdmin && (
        <form onSubmit={handleCreate} className="editorial-panel rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg text-pinkteam-charcoal">
              สร้างประกาศใหม่
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-pinkteam-muted hover:text-pinkteam-charcoal"
            >
              ปิด
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold mb-1">หัวข้อประกาศ</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-pinkteam-soft bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">หมวดหมู่</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'NEWS' | 'SCHEDULE')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-pinkteam-soft bg-white text-sm"
              >
                <option value="NEWS">ข่าวสาร</option>
                <option value="SCHEDULE">กำหนดการ</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">รายละเอียด</label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-pinkteam-soft bg-white text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold mb-1">ลิงก์รูปภาพประกอบ (ถ้ามี)</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-pinkteam-soft bg-white text-sm"
              />
            </div>
            <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-pinkteam-soft bg-pinkteam-blush text-pinkteam-magenta text-xs font-bold cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปขึ้น Supabase Storage'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-pinkteam-magenta text-white text-sm font-bold"
          >
            {saving ? 'กำลังเผยแพร่...' : 'เผยแพร่ประกาศ'}
          </button>
        </form>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="ยังไม่มีประกาศในหมวดหมู่นี้"
          description="ประกาศข่าวสารและกำหนดการจะปรากฏที่นี่เมื่อผู้ดูแลเผยแพร่"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="editorial-panel rounded-3xl overflow-hidden flex flex-col justify-between"
            >
              <div>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-44 object-cover"
                  />
                ) : (
                  <div className="h-24 figma-charcoal-surface flex items-center px-5 text-pinkteam-light">
                    <Megaphone className="w-6 h-6 mr-2" />
                    <span className="font-display font-bold text-xs tracking-wider uppercase">
                      AYUTTHAYA 2569 NOTICE
                    </span>
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                        item.category === 'SCHEDULE'
                          ? 'bg-pinkteam-charcoal text-white'
                          : 'bg-pinkteam-soft text-pinkteam-magenta'
                      }`}
                    >
                      {item.category === 'SCHEDULE' ? 'กำหนดการ' : 'ข่าวสาร'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-pinkteam-muted">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.publishedAt).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit',
                      })}
                    </span>
                  </div>

                  <h2 className="mt-2.5 font-display font-bold text-base text-pinkteam-charcoal">
                    {item.title}
                  </h2>
                  <p className="mt-1.5 text-sm text-pinkteam-muted line-clamp-3">
                    {item.content}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-4 pt-2 border-t border-pinkteam-blush flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDetailItem(item)}
                  className="text-xs font-bold text-pinkteam-magenta hover:underline"
                >
                  อ่านรายละเอียดเพิ่มเติม
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    aria-label={`ลบ ${item.title}`}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white overflow-hidden shadow-2xl">
            {detailItem.imageUrl && (
              <img
                src={detailItem.imageUrl}
                alt={detailItem.title}
                className="w-full max-h-64 object-cover"
              />
            )}
            <div className="p-6 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="px-2.5 py-0.5 rounded-md bg-pinkteam-soft text-pinkteam-magenta text-[11px] font-bold">
                    {detailItem.category === 'SCHEDULE' ? 'กำหนดการ' : 'ข่าวสาร'}
                  </span>
                  <h2 className="mt-2 font-display font-extrabold text-xl text-pinkteam-charcoal">
                    {detailItem.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailItem(null)}
                  className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-pinkteam-muted">
                เผยแพร่เมื่อ {new Date(detailItem.publishedAt).toLocaleString('th-TH')}
                {detailItem.createdByName ? ` · โดย ${detailItem.createdByName}` : ''}
              </div>

              <div className="text-sm text-pinkteam-charcoal whitespace-pre-wrap leading-relaxed pt-2 border-t border-pinkteam-blush">
                {detailItem.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
