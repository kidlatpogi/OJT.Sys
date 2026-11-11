'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getDemoSession } from '@/lib/storage';

export default function LandingNavActions() {
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (isSupabaseConfigured()) {
        const supabase = createClient();
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            router.replace('/dashboard');
            return;
          }
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setIsSignedIn(Boolean(session));
      } else {
        setIsSignedIn(Boolean(getDemoSession()));
      }
    };

    checkAuth();
  }, [router]);

  if (isSignedIn) {
    return (
      <Link
        href="/dashboard"
        className="px-4 py-2 rounded-xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-mono text-xs sm:text-sm font-bold tracking-wide transition-colors inline-flex items-center gap-1.5 shadow-sm"
      >
        Open Dashboard
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link
        href="/login"
        className="px-3.5 py-2 rounded-xl font-mono text-xs sm:text-sm font-semibold text-slate-700 hover:text-black hover:bg-slate-100 transition-colors"
      >
        Log In
      </Link>
      <Link
        href="/register"
        className="px-4 py-2 rounded-xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-mono text-xs sm:text-sm font-bold tracking-wide transition-colors inline-flex items-center gap-1.5 shadow-sm"
      >
        Get Started
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

