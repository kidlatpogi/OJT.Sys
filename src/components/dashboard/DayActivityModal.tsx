'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  Camera,
  Check,
  Clock,
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { AttendanceLog, CalendarEntry } from '@/types/ojt';
import { formatFullDate } from '@/lib/calendar-utils';
import {
  deleteCalendarEntry,
  saveCalendarEntry,
  uploadCalendarImage,
} from '@/lib/calendar-service';

export interface DayActivityModalProps {
  isOpen: boolean;
  date: string; // YYYY-MM-DD
  userId: string;
  initialEntry?: CalendarEntry | null;
  dayLog?: AttendanceLog | null;
  onClose: () => void;
  onEntryUpdated: (entry: CalendarEntry | null) => void;
}

export default function DayActivityModal({
  isOpen,
  date,
  userId,
  initialEntry,
  dayLog,
  onClose,
  onEntryUpdated,
}: DayActivityModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState(initialEntry?.title || 'What did you work on?');
  const [description, setDescription] = useState(initialEntry?.description || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when initialEntry or date changes
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setPreviewUrl(null);
      const initialDesc =
        initialEntry?.description !== undefined && initialEntry?.description !== ''
          ? initialEntry.description
          : dayLog?.ai_summary || dayLog?.custom_tasks || '';
      setDescription(initialDesc);
      setTitle(initialEntry?.title || 'What did you work on?');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, date, initialEntry, dayLog]);

  // Handle escape key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUploading && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, isUploading, isDeleting, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const activeImageUrl = previewUrl || initialEntry?.image_url;

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMessage('File size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  // Upload or update entry
  const handleSave = async () => {
    try {
      setIsUploading(true);
      setErrorMessage(null);

      let finalImageUrl = initialEntry?.image_url || '';

      // If user picked a new file, upload it
      if (selectedFile) {
        finalImageUrl = await uploadCalendarImage(userId, date, selectedFile);
      }

      if (!finalImageUrl) {
        setErrorMessage('Please choose a photo to upload for this day.');
        setIsUploading(false);
        return;
      }

      const saved = await saveCalendarEntry(userId, date, finalImageUrl, description, title);
      onEntryUpdated(saved);
      setSuccessMessage('Photo saved successfully!');
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload photo';
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // Delete entry
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove the photo for this day?')) {
      return;
    }

    try {
      setIsDeleting(true);
      setErrorMessage(null);
      await deleteCalendarEntry(userId, date, initialEntry?.image_url);
      onEntryUpdated(null);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete photo';
      setErrorMessage(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      onClick={() => {
        if (!isUploading && !isDeleting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#141313] text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800/80 shrink-0">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#C44900] font-bold">
              <CalendarDays className="w-3.5 h-3.5" />
              What did you work on?
            </span>
            <h3
              id="day-modal-title"
              className="font-clash-semibold text-lg sm:text-xl font-bold text-white mt-0.5 truncate"
            >
              {formatFullDate(date)}
            </h3>
          </div>

          <button
            type="button"
            disabled={isUploading || isDeleting}
            aria-label="Close modal"
            onClick={onClose}
            className="p-2 -mr-1 -mt-1 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer shrink-0 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto py-4 space-y-4 flex-1 pr-1">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-mono">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-mono flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              {successMessage}
            </div>
          )}

          {/* Photo Section */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-2">
              Photo of the Day
            </label>

            {activeImageUrl ? (
              <div className="relative group rounded-2xl overflow-hidden border border-slate-700 bg-black aspect-[4/3] sm:aspect-[16/10] flex items-center justify-center">
                <img
                  src={activeImageUrl}
                  alt={`Activity for ${date}`}
                  className="w-full h-full object-cover"
                />

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-white/90 hover:bg-white text-slate-900 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg transition-transform hover:scale-105"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Replace
                  </button>
                  {initialEntry && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="px-3.5 py-2 rounded-xl bg-red-600/90 hover:bg-red-600 text-white font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg transition-transform hover:scale-105"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 ${
                  isDragOver
                    ? 'border-[#C44900] bg-[#C44900]/10'
                    : 'border-slate-800 hover:border-slate-600 bg-white/[0.02]'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                  <Camera className="w-6 h-6 text-[#C44900]" />
                </div>
                <div>
                  <p className="font-sans text-sm font-semibold text-white">
                    Drop a photo here, or browse
                  </p>
                  <p className="font-mono text-xs text-slate-400 mt-1">
                    Supports JPEG, PNG, WebP up to 5MB
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/*"
              onChange={onFileInputChange}
              className="hidden"
            />
          </div>

          {/* Entry Title */}
          <div>
            <label
              htmlFor="day-title-input"
              className="block font-mono text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-2"
            >
              Entry Title
            </label>
            <input
              id="day-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What did you work on?"
              maxLength={100}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#1c1c1f] border border-slate-800 focus:border-[#C44900] focus:ring-1 focus:ring-[#C44900] text-sm text-white placeholder-slate-500 font-sans outline-hidden transition-colors"
            />
          </div>

          {/* Optional Caption / Description */}
          <div>
            <label
              htmlFor="day-description-input"
              className="block font-mono text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-2"
            >
              Activity Notes (Optional)
            </label>
            <textarea
              id="day-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you build, learn, or experience today?"
              rows={3}
              maxLength={500}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#1c1c1f] border border-slate-800 focus:border-[#C44900] focus:ring-1 focus:ring-[#C44900] text-sm text-white placeholder-slate-500 font-sans outline-hidden resize-none transition-colors"
            />
            <div className="text-right font-mono text-[10px] text-slate-500 mt-1">
              {description.length}/500
            </div>
          </div>

          {/* Correlated Punch Clock Attendance Info */}
          {dayLog && (
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-[#C44900]" />
                  Logged Hours:
                </span>
                <span className="text-white font-bold">{dayLog.hours_worked} hrs</span>
              </div>
              {dayLog.ai_summary && (
                <div className="text-xs font-sans text-slate-300 leading-relaxed pt-1 border-t border-white/5 line-clamp-3">
                  {dayLog.ai_summary}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
          {initialEntry && !selectedFile ? (
            <button
              type="button"
              disabled={isDeleting || isUploading}
              onClick={handleDelete}
              className="px-4 py-2.5 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 font-mono text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove Photo
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUploading || isDeleting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-mono text-xs font-bold cursor-pointer transition-colors"
            >
              Close
            </button>

            {(selectedFile ||
              (initialEntry &&
                (description !== (initialEntry.description || '') ||
                  title !== (initialEntry.title || 'What did you work on?')))) && (
              <button
                type="button"
                disabled={isUploading || isDeleting}
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-clash-semibold text-sm font-bold cursor-pointer transition-all shadow-md flex items-center gap-2 disabled:opacity-60"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Photo
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
