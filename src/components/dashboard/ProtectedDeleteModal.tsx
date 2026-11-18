'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldAlert,
  X,
} from 'lucide-react';
import { AttendanceLog } from '@/types/ojt';
import { formatHoursWhole, formatReportDate } from '@/lib/ojt-calculations';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export interface ProtectedDeleteModalProps {
  isOpen: boolean;
  title?: string;
  targetLabel?: string;
  targetValue?: string;
  description?: string;
  logDate?: string;
  targetLog?: AttendanceLog | null;
  userEmail?: string;
  loading?: boolean;
  onConfirm: (password: string) => Promise<void | boolean>;
  onCancel: () => void;
  customVerify?: (
    email: string | undefined,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Re-authenticates user password via Supabase Auth or demo mode fallback.
 */
export async function verifyPasswordWithSupabase(
  email: string | undefined,
  password: string,
  options?: { isConfigured?: boolean; client?: ReturnType<typeof createClient> }
): Promise<{ success: boolean; error?: string }> {
  if (!password || password.trim().length === 0) {
    return { success: false, error: 'Password is required to confirm deletion.' };
  }

  const configured =
    options?.isConfigured !== undefined
      ? options.isConfigured
      : isSupabaseConfigured();

  if (configured) {
    if (!email) {
      return {
        success: false,
        error: 'User email not found. Cannot verify account credentials.',
      };
    }

    try {
      const supabase = options?.client || createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Incorrect password. Verification failed.',
        };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Authentication verification error';
      return { success: false, error: msg };
    }
  }

  // Demo / offline fallback mode
  if (
    password === 'wrong-password' ||
    password === 'invalid' ||
    password === 'wrong' ||
    password.length < 3
  ) {
    return {
      success: false,
      error: 'Incorrect password. Verification failed.',
    };
  }

  return { success: true };
}

export default function ProtectedDeleteModal({
  isOpen,
  title = 'Delete Log Record',
  targetLabel = 'Target Log:',
  targetValue,
  description = 'To prevent accidental loss or unauthorized deletion of accredited OJT hours, please confirm your identity by entering your account password.',
  logDate,
  targetLog,
  userEmail,
  loading = false,
  onConfirm,
  onCancel,
  customVerify,
}: ProtectedDeleteModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const resolvedDate = targetLog?.date || logDate || '';
  const resolvedHours =
    targetLog?.hours_worked !== undefined
      ? formatHoursWhole(targetLog.hours_worked)
      : null;

  // Clean reset on open or dismissal
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setError(null);
      setIsVerifying(false);
      // Autofocus password input after mount
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setPassword('');
      setShowPassword(false);
      setError(null);
      setIsVerifying(false);
    }
  }, [isOpen]);

  const handleDismiss = useCallback(() => {
    if (isVerifying || loading) return;
    setPassword('');
    setShowPassword(false);
    setError(null);
    onCancel();
  }, [isVerifying, loading, onCancel]);

  // Handle ESC key and prevent body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isVerifying && !loading) {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, isVerifying, loading, handleDismiss]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError('Please enter your account password.');
      inputRef.current?.focus();
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const verifyFn = customVerify || verifyPasswordWithSupabase;
      const verifyResult = await verifyFn(userEmail, password);

      if (!verifyResult.success) {
        setError(verifyResult.error || 'Incorrect password. Verification failed.');
        setIsVerifying(false);
        inputRef.current?.focus();
        return;
      }

      // Verification succeeded -> trigger confirmation
      const confirmResult = await onConfirm(password);
      if (confirmResult === false) {
        setIsVerifying(false);
        return;
      }

      // Clean reset
      setPassword('');
      setError(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Verification failed. Please try again.';
      setError(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const isBusy = isVerifying || loading;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      onClick={handleDismiss}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="protected-delete-title"
        aria-describedby="protected-delete-desc"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 border-2 border-red-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Contextual Header with ShieldAlert Icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-100 border border-red-200/80 flex items-center justify-center text-red-600 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-red-600">
                Protected Action
              </span>
              <h3
                id="protected-delete-title"
                className="font-clash-semibold text-xl sm:text-2xl font-bold text-slate-900 leading-tight"
              >
                {title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            disabled={isBusy}
            aria-label="Close modal"
            onClick={handleDismiss}
            className="p-2 -mr-1 -mt-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer shrink-0 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning and Contextual Target Info */}
        <div className="mt-4 p-3.5 rounded-2xl bg-red-50/70 border border-red-100 text-slate-700 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500 font-semibold uppercase">{targetLabel}</span>
            <span className="font-bold text-red-700">
              {targetValue !== undefined
                ? targetValue
                : `${resolvedDate ? formatReportDate(resolvedDate) : 'Selected Attendance'}${
                    resolvedHours ? ` (${resolvedHours})` : ''
                  }`}
            </span>
          </div>
          <p id="protected-delete-desc" className="text-xs text-slate-600 leading-relaxed font-sans">
            {description}
          </p>
        </div>

        {/* Inline Error Feedback Banner */}
        {error && (
          <div
            role="alert"
            className="mt-3.5 p-3 rounded-2xl bg-red-100/90 border border-red-300 text-red-800 text-xs font-mono flex items-start gap-2.5 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-semibold leading-relaxed">{error}</div>
          </div>
        )}

        {/* Password Verification Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="verify-password-input"
              className="block font-mono text-[11px] uppercase tracking-wider text-slate-600 font-bold mb-1.5 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Account Password
            </label>

            <div className="relative">
              <input
                ref={inputRef}
                id="verify-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isBusy}
                autoFocus
                autoComplete="current-password"
                placeholder="Enter your account password"
                className="w-full h-12 pl-3.5 pr-11 rounded-2xl border-2 border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 focus:outline-none font-mono text-sm text-slate-900 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
              />

              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
                disabled={isBusy}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer disabled:cursor-not-allowed"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {userEmail && (
              <p className="mt-1 text-[11px] font-mono text-slate-400 truncate">
                Authenticating as: <span className="text-slate-600 font-bold">{userEmail}</span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              disabled={isBusy}
              onClick={handleDismiss}
              className="h-12 rounded-2xl border-2 border-slate-200 hover:border-slate-400 font-mono text-xs uppercase font-bold text-slate-700 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isBusy || !password.trim()}
              className="h-12 rounded-2xl bg-red-600 hover:bg-red-700 font-clash-semibold text-sm text-white cursor-pointer shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isBusy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>Verify & Delete</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
