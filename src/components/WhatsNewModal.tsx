'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckSquare, CloudLightning, ShieldCheck, Sparkles, X, Zap } from 'lucide-react';

export const WHATS_NEW_STORAGE_KEY = 'ojt_whats_new_v1_3_0_dismissed';

interface WhatsNewModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  forceShow?: boolean;
}

export default function WhatsNewModal({
  isOpen: controlledIsOpen,
  onClose,
  forceShow = false,
}: WhatsNewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (forceShow) {
      setInternalIsOpen(true);
      return;
    }
    try {
      const isDismissed = localStorage.getItem(WHATS_NEW_STORAGE_KEY) === 'true';
      setInternalIsOpen(!isDismissed);
    } catch {
      setInternalIsOpen(false);
    }
  }, [forceShow]);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(WHATS_NEW_STORAGE_KEY, 'true');
    } catch (e) {
      console.warn("Failed to persist What's New dismissal:", e);
    }
    setInternalIsOpen(false);
    if (onClose) onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, handleDismiss]);

  if (!mounted || !isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      onClick={handleDismiss}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-7 border-2 border-slate-200 shadow-2xl max-h-[calc(100dvh-2.5rem)] sm:max-h-[90dvh] overflow-y-auto my-auto space-y-5 animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C44900] text-white flex items-center justify-center shrink-0 shadow-[0_8px_16px_-4px_rgba(196,73,0,0.4)]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#C44900]/15 text-[#C44900]">
                  What&apos;s New • v1.3.0
                </span>
              </div>
              <h3
                id="whats-new-modal-title"
                className="font-clash-semibold text-lg sm:text-xl font-bold text-slate-900 mt-0.5"
              >
                Release Highlights &amp; Performance Update
              </h3>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close What's New dialog"
            onClick={handleDismiss}
            className="p-2 -mr-1 -mt-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer shrink-0 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlight Items Grid */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-[#C44900]/20 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#C44900]/10 text-[#C44900] flex items-center justify-center shrink-0 mt-0.5">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-sans text-xs sm:text-sm font-bold text-slate-900">
                Real-Time Task Checkbox Reflection
              </h4>
              <p className="font-mono text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Checked tasks under &ldquo;What did you work on?&rdquo; now immediately sync in real-time with the Day Activity Inspector on the Calendar before clocking out.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
              <CloudLightning className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-sans text-xs sm:text-sm font-bold text-slate-900">
                Local Save &amp; Cloud Sync Toggle
              </h4>
              <p className="font-mono text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Added an Offline Attendance preference switch in Profile Settings with an active status badge and instant storage persistence.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-sans text-xs sm:text-sm font-bold text-slate-900">
                Supabase 401 Unauthorized Recovery
              </h4>
              <p className="font-mono text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Proactive session validation, automatic token refresh, and durable local storage caching protect your calendar entries against auth timeouts.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-sans text-xs sm:text-sm font-bold text-slate-900">
                High Performance &amp; Zero-Lag Sync
              </h4>
              <p className="font-mono text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Isolated 1-second clock tickers, memoized calendar day tiles, and debounced cloud sync eliminate card re-render cascades.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full h-12 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-clash-semibold text-sm sm:text-base inline-flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.99]"
          >
            Got it, Explore App
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
