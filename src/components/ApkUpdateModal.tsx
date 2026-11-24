'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { Download, Smartphone, X } from 'lucide-react';
import {
  APP_VERSION,
  APK_UPDATE_STORAGE_KEY,
  LANDING_PAGE_APK_SECTION,
  compareSemver,
} from '@/config/version';

interface ApkUpdateModalProps {
  forceShow?: boolean;
}

export default function ApkUpdateModal({ forceShow = false }: ApkUpdateModalProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [installedVer, setInstalledVer] = useState<string>('1.2.0');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (forceShow) {
      setIsOpen(true);
      return;
    }

    // Only run check in browser/webview environment
    if (typeof window === 'undefined') return;

    // Strict platform check: Only native Capacitor Android app users receive APK updates
    const isNative = Capacitor.isNativePlatform();
    if (!isNative) return;

    // Check if trainee dismissed the update reminder for this session
    try {
      if (sessionStorage.getItem(APK_UPDATE_STORAGE_KEY) === 'true') {
        return;
      }
    } catch {
      // Storage access failure: proceed with check
    }

    async function checkVersion() {
      let currentInstalled = '1.2.0';

      // Safe detection: If Capacitor App plugin is registered, query it via Plugins
      try {
        const plugins = (
          Capacitor as unknown as {
            Plugins?: { App?: { getInfo: () => Promise<{ version?: string }> } };
          }
        ).Plugins;
        if (plugins?.App) {
          const info = await plugins.App.getInfo();
          currentInstalled = info?.version || '1.2.0';
        }
      } catch {
        currentInstalled = '1.2.0';
      }

      setInstalledVer(currentInstalled);

      // If installed APK version is older than latest APP_VERSION, prompt update
      if (compareSemver(currentInstalled, APP_VERSION) < 0) {
        setIsOpen(true);
      }
    }

    checkVersion();
  }, [forceShow]);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(APK_UPDATE_STORAGE_KEY, 'true');
    } catch {
      // Ignore sessionStorage errors
    }
    setIsOpen(false);
  };

  const handleUpdateClick = () => {
    handleDismiss();
    // Redirect to landing page APK download section
    window.location.href = LANDING_PAGE_APK_SECTION;
  };

  // Route isolation: Never display outside of authenticated /dashboard
  if (pathname !== '/dashboard' && !forceShow) {
    return null;
  }

  if (!mounted || !isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[130] bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="presentation"
      onClick={handleDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="apk-update-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 border-2 border-orange-200 shadow-2xl space-y-4 animate-in fade-in-0 zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C44900] text-white flex items-center justify-center shrink-0 shadow-[0_8px_16px_-4px_rgba(196,73,0,0.4)]">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-[#C44900]">
                App Update Available
              </span>
              <h3 id="apk-update-title" className="font-clash-semibold text-lg font-bold text-slate-900 mt-0.5">
                New Android APK Release
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss update notification"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-sm text-slate-600">
          <p className="leading-relaxed">
            Your installed APK (v{installedVer}) is outdated. Version <strong>v{APP_VERSION}</strong> includes full-height mobile scroll clearances, real-time clock task sync, offline attendance, and stability fixes.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between font-mono text-xs text-slate-700">
            <span>
              Installed: <strong className="text-amber-700">v{installedVer}</strong>
            </span>
            <span>
              Latest: <strong className="text-[#C44900]">v{APP_VERSION}</strong>
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleUpdateClick}
            className="w-full h-11 px-4 rounded-xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-clash-semibold text-sm inline-flex items-center justify-center gap-2 transition-all shadow-[0_8px_16px_-4px_rgba(196,73,0,0.4)] active:scale-[0.99] cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            Update Now (Download APK)
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full h-9 rounded-xl text-slate-500 hover:text-slate-800 font-mono text-xs transition-colors cursor-pointer"
          >
            Remind Me Later
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
