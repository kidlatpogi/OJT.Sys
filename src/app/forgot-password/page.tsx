'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Mail, Send } from 'lucide-react';
import ShapeGrid from '@/components/ShapeGrid';
import BrandMark from '@/components/BrandMark';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const supabaseReady = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (supabaseReady) {
        const supabase = createClient();
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${origin}/reset-password`,
        });
        if (resetError) {
          setError(resetError.message);
          setLoading(false);
          return;
        }
      }
      setSent(true);
    } catch {
      setError('Could not process password reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-between px-4 py-6 sm:py-10">
      <ShapeGrid />

      <div className="relative z-10 w-full max-w-md mx-auto flex items-center justify-between">
        <BrandMark href="/" />
        <Link
          href="/login"
          className="font-mono text-xs uppercase tracking-wider text-slate-600 hover:text-[#C44900] font-semibold inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Login
        </Link>
      </div>

      <main className="relative z-10 w-full max-w-md mx-auto my-8">
        <div className="bg-white border-2 border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
          <span className="font-array-semibold text-xs uppercase tracking-[0.2em] text-[#334155]">
            Account Recovery
          </span>
          <h1 className="font-clash-semibold text-3xl font-bold tracking-tight text-black mt-1">
            Forgot Password
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Enter your registered email and we&apos;ll send a secure reset link to restore access to your OJT logs.
          </p>

          {error && (
            <div className="mt-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          {sent ? (
            <div className="mt-6 p-5 rounded-2xl bg-orange-50 border border-[#C44900]/30 space-y-3 text-center">
              <CheckCircle2 className="w-9 h-9 text-[#C44900] mx-auto" />
              <h2 className="font-clash-semibold text-lg font-bold text-slate-950">
                Reset Link Dispatched
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {supabaseReady
                  ? `If an account exists for ${email}, check your inbox (and spam folder) for the password reset link.`
                  : `Demo mode preview: when Supabase Auth is connected, a recovery email will be sent to ${email}.`}
              </p>
              <Link
                href="/login"
                className="mt-2 inline-flex items-center justify-center w-full h-11 rounded-xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-clash-semibold text-sm transition-colors"
              >
                Return to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                  Registered Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@nu-dasma.edu.ph"
                    className="w-full h-12 pl-10 pr-4 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-slate-900 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] disabled:opacity-60 text-white font-clash-semibold text-base inline-flex items-center justify-center gap-2 transition-all shadow-[0_10px_24px_-8px_rgba(196,73,0,0.45)] cursor-pointer"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="relative z-10 text-center font-mono text-[11px] text-slate-400 uppercase tracking-wider">
        OJT.SYS · Supabase Recovery Flow
      </footer>
    </div>
  );
}

