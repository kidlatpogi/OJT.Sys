'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarPlus, Camera, Pencil, Trash2, X } from 'lucide-react';
import { AttendanceLog, CalendarEntry, UserProfile } from '@/types/ojt';
import ConfirmModal from '@/components/ConfirmModal';
import {
  calculateShiftHours,
  formatHoursWhole,
  formatReportDate,
  formatTimeDisplay,
  getTodayDateString,
} from '@/lib/ojt-calculations';
import { fetchCalendarEntries } from '@/lib/calendar-service';

interface LogsTabProps {
  profile: UserProfile;
  logs: AttendanceLog[];
  calendarEntries?: CalendarEntry[];
  onSaveLog: (log: Omit<AttendanceLog, 'id' | 'user_id'> & { id?: string }) => Promise<void>;
  onDeleteLog: (id: string) => Promise<void>;
}

export default function LogsTab({
  profile,
  logs,
  calendarEntries,
  onSaveLog,
  onDeleteLog,
}: LogsTabProps) {
  const [editing, setEditing] = useState<AttendanceLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [date, setDate] = useState(getTodayDateString());
  const [timeIn, setTimeIn] = useState('08:00');
  const [timeOut, setTimeOut] = useState('17:00');
  const [summary, setSummary] = useState('');
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [emptySummaryModalOpen, setEmptySummaryModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceLog | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [entries, setEntries] = useState<CalendarEntry[]>(calendarEntries || []);
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    imageUrl: string;
    date: string;
    title: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    if (calendarEntries) {
      setEntries(calendarEntries);
      return;
    }
    if (!profile.id) return;
    let active = true;
    fetchCalendarEntries(profile.id).then((data) => {
      if (active) setEntries(data);
    });
    return () => {
      active = false;
    };
  }, [calendarEntries, profile.id, logs]);

  const calendarMap = useMemo(() => {
    const map = new Map<string, CalendarEntry>();
    entries.forEach((e) => {
      if (e.date) map.set(e.date, e);
    });
    return map;
  }, [entries]);

  useEffect(() => {
    if (!lightboxPhoto) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxPhoto(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxPhoto]);

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));

  const openNewModal = () => {
    setEditing(null);
    setDate(getTodayDateString());
    setTimeIn(profile.daily_start_time?.slice(0, 5) || '08:00');
    setTimeOut(profile.daily_end_time?.slice(0, 5) || '17:00');
    setSummary('');
    setIsModalOpen(true);
  };

  const openEditModal = (log: AttendanceLog) => {
    setEditing(log);
    setDate(log.date);
    const toHHMM = (iso: string | null, fallback: string) => {
      if (!iso) return fallback;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return fallback;
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };
    setTimeIn(toHHMM(log.time_in, '08:00'));
    setTimeOut(toHHMM(log.time_out, '17:00'));
    setSummary(log.ai_summary || log.custom_tasks || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      setEmptySummaryModalOpen(true);
      return;
    }
    setConfirmSaveOpen(true);
  };

  const handleConfirmedSave = async () => {
    setSubmitting(true);
    const timeInIso = `${date}T${timeIn}:00`;
    const timeOutIso = `${date}T${timeOut}:00`;
    const hrs = calculateShiftHours(timeInIso, timeOutIso, profile.lunch_break_minutes);

    await onSaveLog({
      id: editing?.id,
      date,
      time_in: timeInIso,
      time_out: timeOutIso,
      hours_worked: hrs,
      tasks_selected: editing?.tasks_selected || [],
      custom_tasks: editing?.custom_tasks || '',
      ai_summary: summary.trim(),
      ai_provider: editing?.ai_provider || 'manual',
    });
    setSubmitting(false);
    setConfirmSaveOpen(false);
    setIsModalOpen(false);
  };

  const handleConfirmedDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    await onDeleteLog(deleteTarget.id);
    setSubmitting(false);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="font-array-semibold text-xs uppercase tracking-[0.2em] text-[#334155]">
            Attendance Ledger
          </span>
          <h2 className="font-clash-semibold text-2xl sm:text-3xl font-bold text-black">
            Daily Logs ({sorted.length})
          </h2>
        </div>

        <button
          type="button"
          onClick={openNewModal}
          className="h-11 px-4 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-mono text-xs uppercase font-bold inline-flex items-center gap-2 cursor-pointer"
        >
          <CalendarPlus className="w-4 h-4" />
          Add Log
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-8 text-center">
          <p className="font-clash-semibold text-lg text-slate-900">No attendance logs yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Tap Time-In on the Clock tab or use Add Log to backfill an earlier day.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((log) => {
            const calEntry = calendarMap.get(log.date);
            const hasPhoto = Boolean(calEntry?.image_url);
            const displayTitle = calEntry?.title || 'What did you work on?';
            const displayNotes = calEntry?.description || '';

            return (
              <article
                key={log.id}
                className="bg-white border-2 border-slate-200/80 hover:border-[#C44900] rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-bold uppercase text-[#C44900]">
                      {formatReportDate(log.date)}
                    </span>
                    <div className="font-mono text-xs sm:text-sm text-slate-600 mt-0.5">
                      {formatTimeDisplay(log.time_in)} → {formatTimeDisplay(log.time_out)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 font-mono text-xs font-bold text-slate-900">
                      {formatHoursWhole(log.hours_worked)}
                    </span>
                    <button
                      type="button"
                      aria-label="Edit log"
                      onClick={() => openEditModal(log)}
                      className="p-2 rounded-xl text-slate-500 hover:text-black hover:bg-slate-100 cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete log"
                      onClick={() => setDeleteTarget(log)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Attached Photo & Activity Notes Strip */}
                {hasPhoto && calEntry && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start gap-3 bg-slate-50/80 rounded-2xl p-3 border border-slate-200/60">
                    <button
                      type="button"
                      aria-label={`View full photo for ${formatReportDate(log.date)}: ${displayTitle}`}
                      onClick={() =>
                        setLightboxPhoto({
                          imageUrl: calEntry.image_url,
                          date: log.date,
                          title: displayTitle,
                          description: displayNotes,
                        })
                      }
                      className="relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-slate-200 bg-black group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C44900] shadow-xs"
                    >
                      <img
                        src={calEntry.image_url}
                        alt={displayTitle}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="p-1.5 rounded-lg bg-black/60 text-white">
                          <Camera className="w-4 h-4" />
                        </span>
                      </div>
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#C44900]">
                        <Camera className="w-3.5 h-3.5" />
                        <span>{displayTitle}</span>
                      </div>

                      {displayNotes ? (
                        <p className="mt-1 text-xs sm:text-sm text-slate-700 font-sans whitespace-pre-line leading-relaxed">
                          {displayNotes}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-400 italic">No additional activity notes</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Accomplishments Summary (shown when distinct from displayNotes or when no photo) */}
                {(log.ai_summary || log.custom_tasks || log.tasks_selected.length > 0) &&
                  (!hasPhoto ||
                    (log.ai_summary !== displayNotes &&
                      (log.ai_summary || log.custom_tasks || log.tasks_selected.join(', ')) !== displayNotes)) && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                      {log.ai_summary || log.custom_tasks || log.tasks_selected.join(', ')}
                    </div>
                  )}
              </article>
            );
          })}
        </div>
      )}

      {/* Mobile-Friendly Add / Edit Modal via Portal */}
      {isModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 border-2 border-slate-200 max-h-[84dvh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-clash-semibold text-xl font-bold text-black">
                  {editing ? 'Edit Attendance Log' : 'Add OJT Day Log'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-12 px-3.5 rounded-xl border-2 border-slate-200 focus:border-[#C44900] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                      Time In
                    </label>
                    <input
                      type="time"
                      required
                      value={timeIn}
                      onChange={(e) => setTimeIn(e.target.value)}
                      className="w-full h-12 px-3.5 rounded-xl border-2 border-slate-200 focus:border-[#C44900] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                      Time Out
                    </label>
                    <input
                      type="time"
                      required
                      value={timeOut}
                      onChange={(e) => setTimeOut(e.target.value)}
                      className="w-full h-12 px-3.5 rounded-xl border-2 border-slate-200 focus:border-[#C44900] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                    Daily Accomplishments (Past Tense)
                  </label>
                  <textarea
                    rows={4}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="• Implemented API route..."
                    className="w-full p-3.5 rounded-xl border-2 border-slate-200 focus:border-[#C44900] focus:outline-none text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-12 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-clash-semibold text-base cursor-pointer"
                >
                  Save Attendance Log
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}

      <ConfirmModal
        isOpen={confirmSaveOpen}
        loading={submitting}
        title={editing ? 'Confirm Save Attendance Log' : 'Confirm Add OJT Day Log'}
        description={
          editing
            ? `Save your edits to the attendance log for ${formatReportDate(date)} (${timeIn} – ${timeOut})?`
            : `Add a new OJT attendance log for ${formatReportDate(date)} (${timeIn} – ${timeOut})?`
        }
        confirmLabel={editing ? 'Save Changes' : 'Add Log'}
        onConfirm={handleConfirmedSave}
        onCancel={() => setConfirmSaveOpen(false)}
      />

      <ConfirmModal
        isOpen={emptySummaryModalOpen}
        variant="danger"
        title="Daily Accomplishments Required"
        description="Daily Accomplishments cannot be empty. Please add at least 1 thing you did before saving."
        confirmLabel="Got It"
        cancelLabel="Close"
        onConfirm={() => setEmptySummaryModalOpen(false)}
        onCancel={() => setEmptySummaryModalOpen(false)}
      />

      <ConfirmModal
        isOpen={deleteTarget !== null}
        loading={submitting}
        variant="danger"
        title="Delete Attendance Log"
        description={
          deleteTarget
            ? `Are you sure you want to permanently delete your attendance log for ${formatReportDate(deleteTarget.date)}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete Log"
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Accessible Lightbox Modal Dialog via Portal */}
      {lightboxPhoto &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lightbox-title"
            className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            onClick={() => setLightboxPhoto(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-[#141313] text-white rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800 shrink-0">
                <div className="min-w-0">
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#C44900] font-bold block">
                    {formatReportDate(lightboxPhoto.date)}
                  </span>
                  <h3
                    id="lightbox-title"
                    className="font-clash-semibold text-lg sm:text-xl font-bold text-white mt-0.5 truncate"
                  >
                    {lightboxPhoto.title}
                  </h3>
                </div>

                <button
                  type="button"
                  aria-label="Close photo preview"
                  onClick={() => setLightboxPhoto(null)}
                  className="p-2 -mr-1 -mt-1 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto py-3 space-y-3 flex-1 flex flex-col items-center">
                <div className="relative w-full rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
                  <img
                    src={lightboxPhoto.imageUrl}
                    alt={lightboxPhoto.title}
                    className="w-full max-h-[60vh] object-contain"
                  />
                </div>

                {lightboxPhoto.description && (
                  <div className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-slate-200 font-sans whitespace-pre-line leading-relaxed">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 block font-bold mb-1">
                      Activity Notes
                    </span>
                    {lightboxPhoto.description}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setLightboxPhoto(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-mono text-xs font-bold cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

