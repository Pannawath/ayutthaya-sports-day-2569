'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, QrCode, X } from 'lucide-react';
import type { StudentRecord } from '@/lib/types';

interface QrPassModalProps {
  student: StudentRecord | null;
  onClose: () => void;
}

export function QrPassModal({ student, onClose }: QrPassModalProps) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!student?.qrToken) return;
    let active = true;
    QRCode.toDataURL(student.qrToken, {
      width: 320,
      margin: 2,
      color: { dark: '#1F1216', light: '#FFFFFF' },
    }).then((url) => {
      if (active) setDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [student]);

  if (!student) return null;

  function handleDownload() {
    if (!dataUrl || !student) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `qr-${student.classRoom.replace('/', '-')}-${student.numberLabel}.png`;
    link.click();
  }

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65">
      <div className="w-full max-w-sm rounded-2xl overflow-hidden bg-pinkteam-charcoal text-white border border-white/15 shadow-2xl">
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-white/80" strokeWidth={1.5} />
            <span className="font-display font-medium text-sm">บัตร QR ประจำตัวคณะสีชมพู</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดบัตร QR"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center text-center">
          <div className="bg-white p-3 rounded-xl">
            {dataUrl ? (
              <img
                src={dataUrl}
                alt={`QR ${student.fullName}`}
                className="w-52 h-52 object-contain"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-xs text-pinkteam-muted">
                กำลังสร้าง QR
              </div>
            )}
          </div>

          <h3 className="mt-4 font-display font-semibold text-lg text-white">
            {student.fullName}
          </h3>
          <p className="text-xs text-white/75 tabular-nums mt-0.5">
            {student.nickname ? `${student.nickname} · ` : ''}
            ห้อง {student.classRoom} · เลขที่ {student.numberLabel}
          </p>
          {student.studentCode && (
            <p className="mt-1 text-xs text-white/70 tabular-nums">
              เลขประจำตัว {student.studentCode}
            </p>
          )}
          <div className="mt-3 px-3 py-1 rounded-md bg-white/10 text-xs font-medium text-white">
            {student.roleCategory === 'central'
              ? student.centralPosition
              : `${student.departmentName || '-'} · ${student.position}`}
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={!dataUrl}
            className="mt-5 w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-white text-pinkteam-charcoal font-display font-semibold text-sm hover:bg-pinkteam-paper transition-colors duration-150 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" strokeWidth={1.5} />
            บันทึกรูป QR Code (PNG)
          </button>
        </div>
      </div>
    </div>
  );
}
