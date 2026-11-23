'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Home, ArrowLeft, AlertTriangle } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import ShapeGrid from '@/components/ShapeGrid';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getDemoSession } from '@/lib/storage';

export default function NotFound() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        if (isSupabaseConfigured()) {
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();
          setSignedIn(Boolean(session));
        } else {
          setSignedIn(Boolean(getDemoSession()));
        }
      } catch {
        setSignedIn(false);
      }
    };
    check();
  }, []);

  return (
    <div className="relative min-h-[100dvh] bg-[#f8f8f8] flex flex-col justify-between overflow-hidden selection:bg-[#C44900] selection:text-white">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <ShapeGrid />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <BrandMark href={signedIn ? '/dashboard' : '/'} />
        <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#C44900] bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
          Status: 404_OFF_SHIFT
        </span>
      </header>

      {/* Main 404 Card Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-lg bg-[#141313] text-white rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl text-center space-y-6">
          {/* Punch Clock Stamp Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/70 border border-red-500/40 text-red-400 font-mono text-[11px] font-semibold tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>PUNCH CLOCK • RECORD MISSING</span>
          </div>

          {/* Large Hero 404 Display */}
          <div className="space-y-2">
            <h1 className="font-mono text-7xl sm:text-8xl font-black tracking-tight text-[#C44900] drop-shadow-md">
              404
            </h1>
            <h2 className="font-clash-semibold text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Shift Not Found
            </h2>
            <p className="font-sans text-sm text-slate-400 max-w-sm mx-auto leading-relaxed pt-1">
              You&apos;ve clocked into uncharted territory. The page or record you are searching for does not exist, has been archived, or was moved.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
            <Link
              href={signedIn ? '/dashboard' : '/'}
              className="h-12 px-6 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-clash-semibold text-sm tracking-tight inline-flex items-center justify-center gap-2 transition-all shadow-[0_10px_24px_-6px_rgba(196,73,0,0.5)] active:scale-[0.99]"
            >
              {signedIn ? (
                <>
                  <Clock className="w-4 h-4 shrink-0" />
                  Return to Dashboard
                </>
              ) : (
                <>
                  <Home className="w-4 h-4 shrink-0" />
                  Return to Home
                </>
              )}
            </Link>

            <button
              type="button"
              onClick={() => router.back()}
              className="h-12 px-5 rounded-2xl bg-[#201f1f] hover:bg-white/10 text-slate-200 border border-white/10 font-clash-semibold text-sm tracking-tight inline-flex items-center justify-center gap-2 transition-all"
            >
              <ArrowLeft className="w-4 h-4 shrink-0 text-slate-400" />
              Go Back
            </button>
          </div>
        </div>
      </main>

      {/* Footer Minimal Notice */}
      <footer className="relative z-10 py-4 text-center font-mono text-[11px] text-slate-400">
        OJT.SYS • Automated Internship Attendance &amp; Report Generator
      </footer>
    </div>
  );
}
