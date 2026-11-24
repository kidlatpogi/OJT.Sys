'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, X, Clock, Layers, Tag, ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'ojt_whats_new_v1_2_1_dismissed';

interface WhatsNewBannerProps {
  onDismiss?: () => void;
  className?: string;
}

export default function WhatsNewBanner({ onDismiss, className = '' }: WhatsNewBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setMounted(true);
    try {
      const isDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
      setDismissed(isDismissed);
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleClose = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch (e) {
      console.error('Failed to save banner dismissal state:', e);
    }
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  // Don't render during SSR or if dismissed
  if (!mounted || dismissed) return null;

  return (
    <div
      role="region"
      aria-label="What's New in OJT.SYS v1.2.1"
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-[#C44900]/30 bg-gradient-to-r from-orange-50/90 via-white to-amber-50/60 p-4 sm:p-5 shadow-sm transition-all duration-300 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 sm:gap-4 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#C44900] text-white flex items-center justify-center shrink-0 shadow-[0_8px_16px_-4px_rgba(196,73,0,0.4)]">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#C44900]/15 text-[#C44900]">
                What&apos;s New • v1.2.1
              </span>
              <span className="font-clash-semibold text-sm sm:text-base font-bold text-slate-900">
                Accurate Time Logging, Smart PM Detection &amp; Shift Fixes
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-slate-700 pt-1">
              <div className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-[#C44900] shrink-0" />
                <span>Exact 9am–5pm Local Time (No Drift)</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-[#C44900] shrink-0" />
                <span>Smart Inverted Time &amp; 1-Click PM Fix</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Tag className="w-3.5 h-3.5 text-[#C44900] shrink-0" />
                <span>Save Tasks Without Time-Out</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C44900] shrink-0" />
                <span>Clean Date Moves &amp; Protected CRUD</span>
              </div>
            </div>
          </div>
        </div>

        {/* User-Triggered Close Button (Never auto-dismisses) */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close announcement banner"
          className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
