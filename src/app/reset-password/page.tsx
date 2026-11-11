'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, CheckCircle2, Circle, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import ShapeGrid from '@/components/ShapeGrid';
import BrandMark from '@/components/BrandMark';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { evaluatePasswordStrength } from '@/lib/validation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!strength.isStrong) {
      setError('Password must meet all company security requirements.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const { error: updateErr } = await supabase.auth.updateUser({ password });
        if (updateErr) {
          setError(updateErr.message);
          setLoading(false);
          return;
        }
      }
      setDone(true);
      setTimeout(() => router.push('/login'), 1600);
    } catch {
      setError('Unable to update password.');
    } finally {
      setLoading(false);
    }
  };

  const rules = [
    { label: 'At least 8 characters', ok: strength.minLength },
    { label: 'One uppercase letter (A-Z)', ok: strength.hasUpper },
    { label: 'One lowercase letter (a-z)', ok: strength.hasLower },
    { label: 'One number (0-9)', ok: strength.hasNumber },
    { label: 'One special character (!@#$...)', ok: strength.hasSpecial },
  ];

  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-between px-4 py-6 sm:py-10">
      <ShapeGrid />

      <div className="relative z-10 w-full max-w-md mx-auto">
        <BrandMark href="/" />
      </div>

      <main className="relative z-10 w-full max-w-md mx-auto my-8">
        <div className="bg-white border-2 border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
          <span className="font-array-semibold text-xs uppercase tracking-[0.2em] text-[#334155]">
            Security Update
          </span>
          <h1 className="font-clash-semibold text-3xl font-bold tracking-tight text-black mt-1">
            Set New Password
          </h1>

          {error && (
            <div className="mt-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          {done ? (
            <div className="mt-6 p-5 rounded-2xl bg-orange-50 border border-[#C44900]/30 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#C44900] mx-auto" />
              <p className="text-sm font-semibold text-slate-950">
                Password updated! Redirecting to login...
              </p>
              <Link href="/login" className="text-xs font-mono text-[#C44900] underline">
                Go to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="mt-6 space-y-4">
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full h-12 pl-10 pr-12 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none"
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

                <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1.5">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider font-bold text-slate-600">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#C44900]" />
                    Password Requirements
                  </span>
                  <ul className="space-y-1">
                    {rules.map((r) => (
                      <li
                        key={r.label}
                        className={`flex items-center gap-1.5 font-mono text-[11px] ${
                          r.ok ? 'text-[#C44900] font-medium' : 'text-slate-500'
                        }`}
                      >
                        {r.ok ? (
                          <Check className="w-3.5 h-3.5 text-[#C44900] shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        )}
                        <span>{r.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full h-12 pl-10 pr-4 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-clash-semibold text-base transition-colors cursor-pointer"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </main>

      <div />
    </div>
  );
}
