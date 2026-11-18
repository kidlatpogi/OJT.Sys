'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { formatReportDate } from '@/lib/ojt-calculations';

export interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  date?: string | null;
  title?: string | null;
  description?: string | null;
}

export default function ImageModal({
  isOpen,
  onClose,
  imageUrl,
  date,
  title,
  description,
}: ImageModalProps) {
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  // Reset zoom state whenever the modal opens or the image changes
  useEffect(() => {
    if (isOpen) {
      setIsZoomed(false);
    }
  }, [isOpen, imageUrl]);

  // Handle ESC key and scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl || typeof document === 'undefined') {
    return null;
  }

  const formattedDate = date ? formatReportDate(date) : null;
  const displayTitle = title || (formattedDate ? `Activity for ${formattedDate}` : 'Activity Photo');

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-modal-title"
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#141313] text-white rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden transition-all"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800 shrink-0">
          <div className="min-w-0">
            {formattedDate && (
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#C44900] font-bold block">
                {formattedDate}
              </span>
            )}
            <h3
              id="image-modal-title"
              className="font-clash-semibold text-lg sm:text-xl font-bold text-white mt-0.5 truncate"
            >
              {displayTitle}
            </h3>
          </div>

          <div className="flex items-center gap-1 shrink-0 -mr-1 -mt-1">
            <button
              type="button"
              onClick={() => setIsZoomed((prev) => !prev)}
              aria-label={isZoomed ? 'Zoom out image' : 'Zoom in image'}
              title={isZoomed ? 'Zoom out' : 'Zoom in'}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
            >
              {isZoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
            </button>
            <button
              type="button"
              aria-label="Close photo preview"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto py-3 space-y-3 flex-1 flex flex-col items-center">
          <div
            className={`relative w-full rounded-2xl bg-black border border-slate-800 flex items-center justify-center min-h-[220px] transition-all ${
              isZoomed ? 'overflow-auto max-h-[68vh] p-2' : 'overflow-hidden'
            }`}
          >
            <img
              src={imageUrl}
              alt={displayTitle}
              onClick={() => setIsZoomed((prev) => !prev)}
              title={isZoomed ? 'Click to zoom out' : 'Click to zoom in'}
              className={`transition-all duration-200 select-none ${
                isZoomed
                  ? 'max-w-none scale-150 cursor-zoom-out my-16 object-contain'
                  : 'w-full max-h-[60vh] object-contain cursor-zoom-in'
              }`}
            />
          </div>

          {description && (
            <div className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-slate-200 font-sans whitespace-pre-line leading-relaxed">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 block font-bold mb-1">
                Activity Notes
              </span>
              {description}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-mono text-xs font-bold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
