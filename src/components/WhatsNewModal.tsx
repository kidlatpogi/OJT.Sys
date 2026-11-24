'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import {
  Clock,
  CloudLightning,
  Download,
  Layers,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { APP_VERSION } from '@/config/version';
import {
  CHANGELOG_ITEMS,
  ChangelogItem,
  WHATS_NEW_STORAGE_KEY,
} from '@/config/changelog';

export { CHANGELOG_ITEMS, WHATS_NEW_STORAGE_KEY };
export type { ChangelogItem };

const ICON_MAP: Record<ChangelogItem['iconName'], React.ComponentType<{ className?: string }>> = {
  Smartphone,
  RefreshCw,
  CloudLightning,
  SlidersHorizontal,
  Clock,
  Layers,
  ShieldCheck,
  Download,
};

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
  const pathname = usePathname();
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

  // Strict route guard: WhatsNewModal must never show outside of authenticated /dashboard
  if (pathname !== '/dashboard' && !forceShow) {
    return null;
  }

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
                  What&apos;s New • v{APP_VERSION}
                </span>
              </div>
              <h3
                id="whats-new-modal-title"
                className="font-clash-semibold text-lg sm:text-xl font-bold text-slate-900 mt-0.5"
              >
                Release Highlights &amp; System Updates
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
          {CHANGELOG_ITEMS.map((item) => {
            const ItemIcon = ICON_MAP[item.iconName] || Sparkles;
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 hover:border-orange-200 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#C44900] flex items-center justify-center shrink-0 mt-0.5">
                  <ItemIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-sans text-xs sm:text-sm font-bold text-slate-900">
                      {item.title}
                    </h4>
                    <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-semibold shrink-0">
                      {item.badge}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-slate-600 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full h-12 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-clash-semibold text-sm sm:text-base inline-flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.99]"
          >
            Got it, Continue to Dashboard
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
