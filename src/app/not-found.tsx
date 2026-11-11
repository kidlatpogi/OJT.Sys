'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import BrandMark from '@/components/BrandMark';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getDemoSession } from '@/lib/storage';

export default function NotFound() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSignedIn(Boolean(session));
      } else {
        setSignedIn(Boolean(getDemoSession()));
      }
    };
    check();
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#f8f8f8] flex flex-col items-center justify-center px-4 text-center">
      <BrandMark href={signedIn ? '/dashboard' : '/'} />
      <h1 className="font-clash-semibold text-4xl sm:text-5xl font-bold text-black mt-6">
        Page Not Found
      </h1>
      <p className="font-sans text-sm text-slate-600 mt-2 max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href={signedIn ? '/dashboard' : '/'}
        className="mt-6 h-11 px-6 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-clash-semibold text-sm inline-flex items-center justify-center"
      >
        {signedIn ? 'Back to Dashboard' : 'Back to Home'}
      </Link>
    </div>
  );
}
