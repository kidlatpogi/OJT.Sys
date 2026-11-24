'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CalendarPlus, Camera, Clock, Moon, Pencil, Trash2, X } from 'lucide-react';
import { AttendanceLog, CalendarEntry, UserProfile } from '@/types/ojt';
import ConfirmModal from '@/components/ConfirmModal';
import ProtectedDeleteModal from '@/components/dashboard/ProtectedDeleteModal';
import ImageModal from '@/components/ImageModal';
import {
  calculateShiftHours,
  formatHoursWhole,
  formatLocalToIso,
  formatReportDate,
  formatTimeDisplay,
  getTodayDateString,
  isoToLocalHHMM,
} from '@/lib/ojt-calculations';
import { fetchCalendarEntries } from '@/lib/calendar-service';

interface LogsTabProps {
  profile: UserProfile;
  logs: AttendanceLog[];
  calendarEntries?: CalendarEntry[];
  onSaveLog: (
    log: Omit<AttendanceLog, 'id' | 'user_id'> & { id?: string; originalDate?: string }
  ) => Promise<void>;
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
  const [originalDate, setOriginalDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [date, setDate] = useState(getTodayDateString());
  const [timeIn, setTimeIn] = useState('09:00');
  const [timeOut, setTimeOut] = useState('18:00');
  const [isOvernight, setIsOvernight] = useState(false);
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
    if (calendarEntries && calendarEntries.length > 0) {
      setEntries(calendarEntries);
    }
  }, [calendarEntries]);

  useEffect(() => {
    if (!profile.id) return;
    let active = true;
    fetchCalendarEntries(profile.id).then((data) => {
      if (active && data) {
        setEntries(data);
      }
    });
    return () => {
      active = false;
    };
  }, [profile.id, logs, calendarEntries]);

  const calendarMap = useMemo(() => {
    const map = new Map<string, CalendarEntry>();
    entries.forEach((e) => {
      if (e.date) map.set(e.date, e);
    });
    return map;
  }, [entries]);

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));

  const openNewModal = () => {
    setEditing(null);
    setOriginalDate(null);
    setIsOvernight(false);
    setDate(getTodayDateString());
    setTimeIn(profile.daily_start_time?.slice(0, 5) || '09:00');
    setTimeOut(profile.daily_end_time?.slice(0, 5) || '18:00');
    setSummary('');
    setIsModalOpen(true);
  };

  const openEditModal = (log: AttendanceLog) => {
    setEditing(log);
    setOriginalDate(log.date);
    setDate(log.date);
    setTimeIn(isoToLocalHHMM(log.time_in, '09:00'));
    setTimeOut(isoToLocalHHMM(log.time_out, '18:00'));

    if (log.time_in && log.time_out) {
      const inDate = new Date(log.time_in).getDate();
      const outDate = new Date(log.time_out).getDate();
      setIsOvernight(inDate !== outDate);
    } else {
      setIsOvernight(false);
    }

    setSummary(log.ai_summary || log.custom_tasks || '');
    setIsModalOpen(true);
  };

  const computedShift = useMemo(() => {
    if (!timeIn || !timeOut) return { hours: 0, isInverted: false, timeInIso: '', timeOutIso: '' };
    const [hIn, mIn] = timeIn.split(':').map(Number);
    const [hOut, mOut] = timeOut.split(':').map(Number);
    const minsIn = (hIn || 0) * 60 + (mIn || 0);
    const minsOut = (hOut || 0) * 60 + (mOut || 0);
    const isInverted = minsOut <= minsIn;

    const timeInIso = formatLocalToIso(date, timeIn, false);
    const timeOutIso = formatLocalToIso(date, timeOut, isOvernight);
    const hours = calculateShiftHours(timeInIso, timeOutIso, profile.lunch_break_minutes);
    return { hours, isInverted, timeInIso, timeOutIso };
  }, [date, timeIn, timeOut, isOvernight, profile.lunch_break_minutes]);

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
    const { timeInIso, timeOutIso, hours } = computedShift;

    await onSaveLog({
      id: editing?.id,
      originalDate: originalDate || undefined,
      date,
      time_in: timeInIso,
      time_out: timeOutIso,
      hours_worked: hours,
      tasks_selected: editing?.tasks_selected || [],
      custom_tasks: editing?.custom_tasks || '',
      ai_summary: summary.trim(),
      ai_provider: editing?.ai_provider || 'manual',
    });
    setSubmitting(false);
    setConfirmSaveOpen(false);
    setIsModalOpen(false);
  };

  const handleConfirmedDelete = async (_password: string) => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await onDeleteLog(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setSubmitting(false);
    }
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
          <div className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="w-full max-w-md bg-white rounded-3xl p-4 sm:p-6 border-2 border-slate-200 max-h-[calc(100dvh-2.5rem)] sm:max-h-[85dvh] overflow-y-auto shadow-2xl my-auto">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#C44900] font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    What did you work on?
                  </span>
                  <h3 className="font-clash-semibold text-lg sm:text-xl font-bold text-black mt-0.5">
                    {editing ? 'Edit Attendance Log' : 'Add OJT Day Log'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 -mr-1 -mt-1 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
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

                {/* Inverted Time Warning / PM Auto-Fix & Overnight Toggle */}
                {computedShift.isInverted && !isOvernight ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <div className="flex items-start gap-2 text-xs font-mono text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Time Out is earlier than Time In (0h worked).</span>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Did you mean PM, or is this an overnight shift?
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      {parseInt(timeOut.split(':')[0], 10) < 12 && (
                        <button
                          type="button"
                          onClick={() => {
                            const [h, m] = timeOut.split(':');
                            const pmH = parseInt(h, 10) + 12;
                            setTimeOut(`${String(pmH).padStart(2, '0')}:${m}`);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#C44900] hover:bg-[#9E3B00] text-white text-[11px] font-mono font-bold cursor-pointer transition-colors"
                        >
                          Switch to PM ({parseInt(timeOut.split(':')[0], 10) + 12}:{timeOut.split(':')[1]})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsOvernight(true)}
                        className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 text-[11px] font-mono font-bold cursor-pointer transition-colors inline-flex items-center gap-1"
                      >
                        <Moon className="w-3 h-3" />
                        Overnight (+1 day)
                      </button>
                    </div>
                  </div>
                ) : isOvernight ? (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-2 text-xs font-mono text-indigo-900">
                    <span className="inline-flex items-center gap-1.5 font-bold">
                      <Moon className="w-3.5 h-3.5 text-indigo-600" />
                      Overnight shift enabled (ends next day)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsOvernight(false)}
                      className="text-[11px] text-indigo-600 hover:underline cursor-pointer"
                    >
                      Disable
                    </button>
                  </div>
                ) : null}

                {/* Live Shift Preview Bar */}
                <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    Shift Preview:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      {formatTimeDisplay(timeIn)} → {formatTimeDisplay(timeOut)}
                      {isOvernight && <span className="text-[#C44900] text-[10px] ml-1 font-bold">(+1d)</span>}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#C44900]/10 text-[#C44900] font-bold text-[11px]">
                      {computedShift.hours}h net
                    </span>
                  </div>
                </div>

                {/* Day Photo Preview if attached in Calendar */}
                {calendarMap.get(date)?.image_url && (
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                      Day Photo (Calendar Entry)
                    </label>
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-[16/9] max-h-40 bg-slate-900 flex items-center justify-center">
                      <img
                        src={calendarMap.get(date)!.image_url}
                        alt={`Photo for ${date}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

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
                  className="w-full h-12 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-clash-semibold text-base cursor-pointer shadow-sm active:scale-[0.99] transition-all"
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
            ? `Save your edits to the attendance log for ${formatReportDate(date)} (${formatTimeDisplay(timeIn)} – ${formatTimeDisplay(timeOut)}${isOvernight ? ' next day' : ''} · ${computedShift.hours} hrs)?`
            : `Add a new OJT attendance log for ${formatReportDate(date)} (${formatTimeDisplay(timeIn)} – ${formatTimeDisplay(timeOut)}${isOvernight ? ' next day' : ''} · ${computedShift.hours} hrs)?`
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

      {/* Protected Log Deletion Modal (R8) */}
      <ProtectedDeleteModal
        isOpen={deleteTarget !== null}
        targetLog={deleteTarget}
        logDate={deleteTarget?.date}
        userEmail={profile.email}
        loading={submitting}
        onConfirm={handleConfirmedDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Unified Reusable Image Modal */}
      {lightboxPhoto && (
        <ImageModal
          isOpen={Boolean(lightboxPhoto)}
          onClose={() => setLightboxPhoto(null)}
          imageUrl={lightboxPhoto.imageUrl}
          date={lightboxPhoto.date}
          title={lightboxPhoto.title}
          description={lightboxPhoto.description}
        />
      )}
    </div>
  );
}

