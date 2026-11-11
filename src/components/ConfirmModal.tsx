'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, loading, onCancel]);

  if (!isOpen || typeof document === 'undefined') return null;

  const isDanger = variant === 'danger';

  return createPortal(
    <div
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 border-t-2 sm:border-2 border-slate-200 shadow-2xl safe-bottom"
      >
        <div className="flex items-start justify-between gap-3">
          <h3
            id="confirm-modal-title"
            className="font-clash-semibold text-xl sm:text-2xl font-bold text-black"
          >
            {title}
          </h3>

          <button
            type="button"
            disabled={loading}
            aria-label="Close confirmation"
            onClick={onCancel}
            className="p-2 -mr-1 -mt-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="font-sans text-sm text-slate-600 leading-relaxed mt-2">
          {description}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="h-12 rounded-2xl border-2 border-slate-200 hover:border-slate-400 font-mono text-xs uppercase font-bold text-slate-700 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`h-12 rounded-2xl font-clash-semibold text-base text-white transition-colors cursor-pointer disabled:opacity-60 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#C44900] hover:bg-[#9E3B00]'
            }`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
