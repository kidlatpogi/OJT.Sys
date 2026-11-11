'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarPlus, Pencil, Trash2, X } from 'lucide-react';
import { AttendanceLog, UserProfile } from '@/types/ojt';
import ConfirmModal from '@/components/ConfirmModal';
import {
  calculateShiftHours,
  formatHoursWhole,
  formatReportDate,
  formatTimeDisplay,
  getTodayDateString,
} from '@/lib/ojt-calculations';

interface LogsTabProps {
  profile: UserProfile;
  logs: AttendanceLog[];
  onSaveLog: (log: Omit<AttendanceLog, 'id' | 'user_id'> & { id?: string }) => Promise<void>;
  onDeleteLog: (id: string) => Promise<void>;
}

export default function LogsTab({ profile, logs, onSaveLog, onDeleteLog }: LogsTabProps) {
  const [editing, setEditing] = useState<AttendanceLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [date, setDate] = useState(getTodayDateString());
  const [timeIn, setTimeIn] = useState('08:00');
  const [timeOut, setTimeOut] = useState('17:00');
  const [summary, setSummary] = useState('');
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceLog | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      ai_summary: summary,
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
          {sorted.map((log) => (
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

              {(log.ai_summary || log.custom_tasks || log.tasks_selected.length > 0) && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {log.ai_summary || log.custom_tasks || log.tasks_selected.join(', ')}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Mobile-Friendly Add / Edit Modal via Portal */}
      {isModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 border-t-2 sm:border-2 border-slate-200 max-h-[90dvh] overflow-y-auto safe-bottom">
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
    </div>
  );
}

