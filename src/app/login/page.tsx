'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react';
import ShapeGrid from '@/components/ShapeGrid';
import BrandMark from '@/components/BrandMark';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { setDemoSession } from '@/lib/storage';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabaseReady = isSupabaseConfigured();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (supabaseReady) {
        const supabase = createClient();
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) {
          setError(authError.message);
          setLoading(false);
          return;
        }
        router.push('/dashboard');
        router.refresh();
      } else {
        // Local Demo Mode fallback before Supabase env is configured
        if (!email.trim() || !password) {
          setError('Please enter your email and password.');
          setLoading(false);
          return;
        }
        setDemoSession({
          email: email.trim(),
          full_name: email.split('@')[0] || 'OJT Trainee',
        });
        router.push('/dashboard');
      }
    } catch {
      setError('Unable to sign in right now. Please try again.');
      setLoading(false);
    }
  };

  const handleDemoAccess = () => {
    setDemoSession({
      email: 'trainee@nu-dasma.edu.ph',
      full_name: 'Zeus Angelo Bautista',
    });
    router.push('/dashboard');
  };

  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-between px-4 py-6 sm:py-10">
      <ShapeGrid />

      <div className="relative z-10 w-full max-w-md mx-auto flex items-center justify-between">
        <BrandMark href="/" />
        <Link
          href="/register"
          className="font-mono text-xs uppercase tracking-wider text-slate-600 hover:text-[#C44900] font-semibold"
        >
          Register →
        </Link>
      </div>

      <main className="relative z-10 w-full max-w-md mx-auto my-8">
        <div className="bg-white border-2 border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
          {/* Segmented Auth Tabs (Login / Register) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-6">
            <span className="py-2.5 text-center rounded-xl bg-white text-slate-900 font-clash-semibold text-sm shadow-xs">
              Sign In
            </span>
            <Link
              href="/register"
              className="py-2.5 text-center rounded-xl text-slate-500 hover:text-slate-900 font-clash-semibold text-sm transition-colors"
            >
              Register
            </Link>
          </div>

          <div className="mb-6">
            <span className="font-array-semibold text-xs uppercase tracking-[0.2em] text-[#334155]">
              Welcome Back
            </span>
            <h1 className="font-clash-semibold text-3xl font-bold tracking-tight text-black mt-1">
              Sign in to <span className="text-[#C44900]">OJT.SYS</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Punch in your daily attendance and generate SECA reports.
            </p>
          </div>

          {!supabaseReady && (
            <div className="mb-5 p-3.5 rounded-2xl bg-[#C44900]/8 border border-[#C44900]/25 text-xs text-slate-700 leading-relaxed">
              <span className="font-mono font-bold text-[#C44900] uppercase block mb-0.5">
                Local Preview Mode
              </span>
              Supabase environment keys are not set yet. Sign in with any credentials or tap{' '}
              <strong>Instant Demo Access</strong> below.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                Email Address
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="font-mono text-[11px] text-[#C44900] hover:underline font-semibold"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-12 pl-10 pr-12 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-slate-900 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Toggle password visibility"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] disabled:opacity-60 text-white font-clash-semibold text-base inline-flex items-center justify-center gap-2 transition-all shadow-[0_10px_24px_-8px_rgba(196,73,0,0.45)] cursor-pointer"
            >
              {loading ? 'Signing In...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {!supabaseReady && (
            <button
              type="button"
              onClick={handleDemoAccess}
              className="mt-3 w-full h-11 rounded-2xl bg-slate-900 hover:bg-black text-white font-mono text-xs uppercase tracking-wider font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C44900]" />
              Instant Demo Access
            </button>
          )}

          <p className="mt-6 text-center text-xs sm:text-sm text-slate-500">
            New intern?{' '}
            <Link href="/register" className="text-[#C44900] font-semibold hover:underline">
              Create your OJT profile
            </Link>
          </p>
        </div>
      </main>

      <footer className="relative z-10 text-center font-mono text-[11px] text-slate-400 uppercase tracking-wider">
        OJT.SYS · Mobile-First SECA Tracker
      </footer>
    </div>
  );
}

