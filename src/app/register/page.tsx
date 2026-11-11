'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';
import ShapeGrid from '@/components/ShapeGrid';
import BrandMark from '@/components/BrandMark';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEFAULT_DEMO_PROFILE, saveDemoProfile, setDemoSession } from '@/lib/storage';
import {
  evaluatePasswordStrength,
  formatStudentIdInput,
  isValidLettersOnly,
  isValidNuEmail,
  isValidStudentId,
  sanitizeLettersOnly,
} from '@/lib/validation';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [program, setProgram] = useState<'BSIT' | 'BSCS'>('BSIT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const supabaseReady = isSupabaseConfigured();
  const passwordStrength = useMemo(() => evaluatePasswordStrength(password), [password]);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidLettersOnly(firstName) || !isValidLettersOnly(lastName)) {
      setError('First Name and Last Name must contain letters only.');
      return;
    }

    if (!isValidStudentId(studentId)) {
      setError('Student ID must match the exact format YYYY-NNNNNN (example: 2024-100001).');
      return;
    }

    if (!isValidNuEmail(email)) {
      setError('Please enter a valid NU school email (e.g. name@students.nu-dasma.edu.ph).');
      return;
    }

    if (!passwordStrength.isStrong) {
      setError('Password does not meet company security requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    setLoading(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    try {
      if (supabaseReady) {
        const supabase = createClient();
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              student_id: studentId.trim(),
              program,
              company_name: '',
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }

        if (data.session) {
          router.push('/dashboard');
          router.refresh();
          return;
        }

        setSuccessMsg(
          'Account created! Please check your NU email inbox to confirm your account, then sign in to complete your OJT setup.'
        );
        setLoading(false);
      } else {
        // Demo mode: leave company_name blank so the onboarding modal triggers on first dashboard entry
        saveDemoProfile({
          ...DEFAULT_DEMO_PROFILE,
          email: email.trim(),
          full_name: fullName,
          student_id: studentId.trim(),
          program,
          company_name: '',
          branch_department: '',
          supervisor_name: '',
          supervisor_position: '',
        });
        setDemoSession({
          email: email.trim(),
          full_name: fullName,
        });
        router.push('/dashboard');
      }
    } catch {
      setError('Registration failed. Please verify your details and try again.');
      setLoading(false);
    }
  };

  const passwordRules = [
    { label: 'At least 8 characters', ok: passwordStrength.minLength },
    { label: 'One uppercase letter (A-Z)', ok: passwordStrength.hasUpper },
    { label: 'One lowercase letter (a-z)', ok: passwordStrength.hasLower },
    { label: 'One number (0-9)', ok: passwordStrength.hasNumber },
    { label: 'One special character (!@#$...)', ok: passwordStrength.hasSpecial },
  ];

  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-between px-4 py-6 sm:py-10">
      <ShapeGrid />

      <div className="relative z-10 w-full max-w-md mx-auto flex items-center justify-between">
        <BrandMark href="/" />
        <Link
          href="/login"
          className="font-mono text-xs uppercase tracking-wider text-slate-600 hover:text-[#C44900] font-semibold"
        >
          Sign In →
        </Link>
      </div>

      <main className="relative z-10 w-full max-w-md mx-auto my-6">
        <div className="bg-white border-2 border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
          {/* Segmented Auth Tabs (Login / Register) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-6">
            <Link
              href="/login"
              className="py-2.5 text-center rounded-xl text-slate-500 hover:text-slate-900 font-clash-semibold text-sm transition-colors"
            >
              Sign In
            </Link>
            <span className="py-2.5 text-center rounded-xl bg-white text-slate-900 font-clash-semibold text-sm shadow-xs">
              Register
            </span>
          </div>

          <div className="mb-5">
            <span className="font-array-semibold text-xs uppercase tracking-[0.2em] text-[#334155]">
              Create Account
            </span>
            <h1 className="font-clash-semibold text-2xl sm:text-3xl font-bold tracking-tight text-black mt-0.5">
              Trainee Registration
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              You&apos;ll configure your company and OJT schedule right after signing in.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          {successMsg ? (
            <div className="p-5 rounded-2xl bg-orange-50 border border-[#C44900]/30 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-[#C44900] mx-auto" />
              <p className="text-sm text-slate-800 font-medium">{successMsg}</p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-[#C44900] text-white font-clash-semibold text-sm"
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* First Name & Last Name (Letters Only) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(sanitizeLettersOnly(e.target.value))}
                      placeholder="Juan"
                      className="w-full h-12 pl-10 pr-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(sanitizeLettersOnly(e.target.value))}
                    placeholder="Dela Cruz"
                    className="w-full h-12 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none"
                  />
                </div>
              </div>

              {/* Student ID (2024-100001 format) & Program (BSIT / BSCS) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                    Student ID
                  </label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={11}
                    pattern="\d{4}-\d{6}"
                    value={studentId}
                    onChange={(e) => setStudentId(formatStudentIdInput(e.target.value))}
                    placeholder="2024-100001"
                    className="w-full h-12 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none font-mono text-sm"
                  />
                  <span className="block font-mono text-[10px] text-slate-400 mt-1">
                    Format: 2024-100001
                  </span>
                </div>
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                    Program
                  </label>
                  <select
                    value={program}
                    onChange={(e) => setProgram(e.target.value as 'BSIT' | 'BSCS')}
                    className="w-full h-12 px-3 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none"
                  >
                    <option value="BSIT">BSIT</option>
                    <option value="BSCS">BSCS</option>
                  </select>
                </div>
              </div>

              {/* NU School Email */}
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                  NU School Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="delacruzj@students.nu-dasma.edu.ph"
                    className="w-full h-12 pl-10 pr-4 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none"
                  />
                </div>
                <span className="block font-mono text-[10px] text-slate-400 mt-1">
                  Accepts valid @students.nu-*.edu.ph / @nu-*.edu.ph
                </span>
              </div>

              {/* Strong Password */}
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
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

                <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider font-bold text-slate-600">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#C44900]" />
                      Password Strength
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold uppercase ${
                        passwordStrength.isStrong
                          ? 'text-[#C44900]'
                          : passwordStrength.score >= 3
                          ? 'text-slate-700'
                          : 'text-red-600'
                      }`}
                    >
                      {passwordStrength.isStrong
                        ? 'Strong'
                        : passwordStrength.score >= 3
                        ? 'Moderate'
                        : 'Weak'}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <span
                        key={lvl}
                        className={`h-1.5 rounded-full transition-colors ${
                          passwordStrength.score >= lvl
                            ? passwordStrength.isStrong
                              ? 'bg-[#C44900]'
                              : 'bg-orange-300'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>

                  <ul className="space-y-1 pt-0.5">
                    {passwordRules.map((rule) => (
                      <li
                        key={rule.label}
                        className={`flex items-center gap-1.5 font-mono text-[11px] ${
                          rule.ok ? 'text-[#C44900] font-medium' : 'text-slate-500'
                        }`}
                      >
                        {rule.ok ? (
                          <Check className="w-3.5 h-3.5 text-[#C44900] shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        )}
                        <span>{rule.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className={`w-full h-12 pl-10 pr-12 rounded-xl border-2 bg-slate-50/50 focus:bg-white focus:outline-none ${
                      confirmPassword.length > 0 && !passwordsMatch
                        ? 'border-red-300 focus:border-red-500'
                        : passwordsMatch
                        ? 'border-[#C44900] focus:border-[#C44900]'
                        : 'border-slate-200 focus:border-[#C44900]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label="Toggle confirm password visibility"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <span
                    className={`block font-mono text-[10px] mt-1 ${
                      passwordsMatch ? 'text-[#C44900]' : 'text-red-600'
                    }`}
                  >
                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] disabled:opacity-60 text-white font-clash-semibold text-base inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="relative z-10 text-center font-mono text-[11px] text-slate-400 uppercase tracking-wider">
        OJT.SYS · Trainee Registration
      </footer>
    </div>
  );
}
