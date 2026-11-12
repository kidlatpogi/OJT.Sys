'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Clock,
  LogIn,
  LogOut,
  Save,
  Sparkles,
} from 'lucide-react';
import { AttendanceLog, PRESET_OJT_TASKS, UserProfile } from '@/types/ojt';
import ConfirmModal from '@/components/ConfirmModal';
import {
  calculateShiftHours,
  formatHoursWhole,
  formatTimeDisplay,
  getTodayDateString,
} from '@/lib/ojt-calculations';

interface PunchClockCardProps {
  profile: UserProfile;
  todayLog: AttendanceLog | null;
  onSaveLog: (log: Omit<AttendanceLog, 'id' | 'user_id'> & { id?: string }) => Promise<void>;
}

function getTodayShiftEndDate(dailyEndTime: string): Date | null {
  const clean = (dailyEndTime || '18:00').slice(0, 5);
  const [hh, mm] = clean.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
}

export default function PunchClockCard({
  profile,
  todayLog,
  onSaveLog,
}: PunchClockCardProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [customTasks, setCustomTasks] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiProvider, setAiProvider] = useState('manual');
  const [tasksDirty, setTasksDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; variant: 'success' | 'error' } | null>(null);
  const [autoTimeOutBlocked, setAutoTimeOutBlocked] = useState(false);
  const [pendingAction, setPendingAction] = useState<'time-in' | 'time-out' | 'save-log' | 'format-notes' | null>(null);

  const autoTimeOutTriggeredRef = useRef(false);
  const justTimedOutRef = useRef(false);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (todayLog) {
      if (justTimedOutRef.current && todayLog.time_out) {
        justTimedOutRef.current = false;
        setSelectedTasks([]);
        setCustomTasks('');
        setAiSummary('');
        setAiProvider('manual');
        setTasksDirty(false);
        autoTimeOutTriggeredRef.current = true;
        setAutoTimeOutBlocked(false);
        return;
      }
      setSelectedTasks(todayLog.tasks_selected || []);
      setCustomTasks(todayLog.custom_tasks || '');
      setAiSummary(todayLog.ai_summary || '');
      setAiProvider(todayLog.ai_provider || 'manual');
      setTasksDirty(false);
      if (todayLog.time_out) {
        autoTimeOutTriggeredRef.current = true;
        setAutoTimeOutBlocked(false);
      }
    } else {
      setSelectedTasks([]);
      setCustomTasks('');
      setAiSummary('');
      setAiProvider('manual');
      setTasksDirty(false);
      autoTimeOutTriggeredRef.current = false;
      setAutoTimeOutBlocked(false);
    }
  }, [todayLog]);

  const showToast = useCallback((msg: string, variant: 'success' | 'error' = 'success') => {
    setToast({ msg, variant });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const todayStr = getTodayDateString();
  const isTimedIn = Boolean(todayLog?.time_in);
  const isTimedOut = Boolean(todayLog?.time_out);
  const isChecklistLocked = !isTimedIn || isTimedOut;

  const toggleTask = (label: string) => {
    if (isChecklistLocked) return;
    setTasksDirty(true);
    setSelectedTasks((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const runAutoPolish = async (tasks: string[], custom: string) => {
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, customTasks: custom }),
      });
      const data = await res.json();
      return {
        summary: data.summary || '',
        provider: data.provider || 'regex-fallback',
      };
    } catch {
      return {
        summary: '• Completed assigned internship development and support tasks.',
        provider: 'regex-fallback',
      };
    }
  };

  const getAutoPolishedOutput = useCallback(async () => {
    const hasTaskInputs = selectedTasks.length > 0 || customTasks.trim().length > 0;
    if (hasTaskInputs && (tasksDirty || !aiSummary.trim())) {
      const generated = await runAutoPolish(selectedTasks, customTasks);
      setAiSummary(generated.summary);
      setAiProvider(generated.provider);
      setTasksDirty(false);
      return generated;
    }
    return { summary: aiSummary, provider: aiProvider };
  }, [selectedTasks, customTasks, tasksDirty, aiSummary, aiProvider]);

  const executeTimeOut = useCallback(
    async (outTimestampIso: string, reason: 'manual' | 'auto') => {
      if (!todayLog?.time_in) return;
      setIsSaving(true);
      try {
        const hours = calculateShiftHours(
          todayLog.time_in,
          outTimestampIso,
          profile.lunch_break_minutes
        );
        const polished = await getAutoPolishedOutput();

        justTimedOutRef.current = true;

        await onSaveLog({
          id: todayLog.id,
          date: todayStr,
          time_in: todayLog.time_in,
          time_out: outTimestampIso,
          hours_worked: hours,
          tasks_selected: selectedTasks,
          custom_tasks: customTasks,
          ai_summary: polished.summary,
          ai_provider: polished.provider,
        });

        setAutoTimeOutBlocked(false);
        setSelectedTasks([]);
        setCustomTasks('');
        setAiSummary('');
        setAiProvider('manual');
        setTasksDirty(false);

        if (reason === 'auto') {
          showToast(
            `Shift finished! Auto timed out at ${formatTimeDisplay(outTimestampIso)} (${formatHoursWhole(hours)}).`,
            'success'
          );
        } else {
          showToast(
            `Timed Out! Logged ${formatHoursWhole(hours)} and formatted for your reports.`,
            'success'
          );
        }
      } catch {
        justTimedOutRef.current = false;
        if (reason === 'auto') {
          autoTimeOutTriggeredRef.current = false;
        }
        showToast('Failed to save time-out. Please try again.', 'error');
      } finally {
        setIsSaving(false);
      }
    },
    [
      todayLog,
      profile.lunch_break_minutes,
      getAutoPolishedOutput,
      onSaveLog,
      todayStr,
      selectedTasks,
      customTasks,
      showToast,
    ]
  );

  // Auto Time-Out Watcher with Restrictions (5a: requires >=1 checked task, 5b: rounds up to exact whole hour)
  useEffect(() => {
    if (!now) return;
    if (profile.auto_time_out === false) return;
    if (!isTimedIn || isTimedOut || isSaving) return;
    if (autoTimeOutTriggeredRef.current) return;

    const shiftEnd = getTodayShiftEndDate(profile.daily_end_time || '18:00');
    if (!shiftEnd) return;

    // Never auto time-out to a shift end that is earlier than or equal to the actual Time-In
    const timeInMs = todayLog?.time_in ? new Date(todayLog.time_in).getTime() : NaN;
    if (Number.isNaN(timeInMs) || timeInMs >= shiftEnd.getTime()) {
      setAutoTimeOutBlocked(false);
      return;
    }

    if (now.getTime() >= shiftEnd.getTime()) {
      // Restriction 5a: Do NOT auto time-out if none of "What did you work on?" is checked
      if (selectedTasks.length === 0) {
        setAutoTimeOutBlocked(true);
        return;
      }

      autoTimeOutTriggeredRef.current = true;
      setAutoTimeOutBlocked(false);
      executeTimeOut(shiftEnd.toISOString(), 'auto');
    } else {
      setAutoTimeOutBlocked(false);
    }
  }, [
    now,
    profile.auto_time_out,
    profile.daily_end_time,
    todayLog?.time_in,
    isTimedIn,
    isTimedOut,
    isSaving,
    selectedTasks.length,
    executeTimeOut,
  ]);

  const handleTimeIn = async () => {
    setIsSaving(true);
    const stamp = new Date().toISOString();
    await onSaveLog({
      id: todayLog?.id,
      date: todayStr,
      time_in: stamp,
      time_out: todayLog?.time_out || null,
      hours_worked: calculateShiftHours(
        stamp,
        todayLog?.time_out || null,
        profile.lunch_break_minutes
      ),
      tasks_selected: selectedTasks,
      custom_tasks: customTasks,
      ai_summary: aiSummary,
      ai_provider: aiProvider,
    });
    setIsSaving(false);
    showToast('Timed In! Have a productive OJT shift.', 'success');
  };

  const handleManualTimeOut = () => {
    if (!todayLog?.time_in) return;
    if (selectedTasks.length === 0) {
      showToast('Please check at least one task under "What did you work on?" before timing out.', 'error');
      return;
    }
    setPendingAction('time-out');
  };

  const handleFormatCustomNotes = async () => {
    if (!customTasks.trim()) return;
    setIsSaving(true);
    try {
      const generated = await runAutoPolish(selectedTasks, customTasks);
      setAiSummary(generated.summary);
      setAiProvider(generated.provider);
      setTasksDirty(false);
      showToast('Custom notes formatted into Weekly & Monthly Report Summary.', 'success');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmPendingAction = async () => {
    const action = pendingAction;
    if (!action) return;
    if (action === 'time-in') {
      await handleTimeIn();
    } else if (action === 'time-out') {
      await executeTimeOut(new Date().toISOString(), 'manual');
    } else if (action === 'save-log') {
      await handleSaveTasks();
    } else if (action === 'format-notes') {
      await handleFormatCustomNotes();
    }
    setPendingAction(null);
  };

  const handleSaveTasks = async () => {
    setIsSaving(true);
    const polished = await getAutoPolishedOutput();
    await onSaveLog({
      id: todayLog?.id,
      date: todayStr,
      time_in: todayLog?.time_in || null,
      time_out: todayLog?.time_out || null,
      hours_worked: todayLog?.hours_worked || 0,
      tasks_selected: selectedTasks,
      custom_tasks: customTasks,
      ai_summary: polished.summary,
      ai_provider: polished.provider,
    });
    setIsSaving(false);
    showToast('Saved & formatted for Weekly Report and Monthly Report.', 'success');
  };

  const liveTimeStr = now
    ? now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    : '--:--:--';

  const liveDateStr = now
    ? now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : todayStr;

  return (
    <div className="space-y-4">
      {/* Mobile-Responsive Notification Banner */}
      {toast && (
        <div
          role="status"
          className={`fixed top-16 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-auto sm:max-w-md z-50 px-4 py-3 rounded-2xl font-mono text-xs shadow-xl flex items-start sm:items-center gap-2.5 border ${
            toast.variant === 'error'
              ? 'bg-red-950 text-red-100 border-red-500/60'
              : 'bg-[#141313] text-white border-[#C44900]'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full mt-1 sm:mt-0 shrink-0 ${
              toast.variant === 'error' ? 'bg-red-400' : 'bg-[#C44900]'
            }`}
          />
          <span className="leading-snug">{toast.msg}</span>
        </div>
      )}

      {/* Dark Hero Punch Clock Card */}
      <section className="bg-[#141313] text-white rounded-3xl p-5 sm:p-7 border border-slate-800 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400 block truncate">
              {liveDateStr}
            </span>
            <div className="font-mono text-3xl sm:text-5xl font-bold tracking-tight text-white mt-1 tabular-nums">
              {liveTimeStr}
            </div>
          </div>

          <span
            className={`px-3 py-1.5 rounded-full font-mono text-[11px] uppercase tracking-wider font-bold shrink-0 ${
              isTimedOut
                ? 'bg-[#C44900] text-white border border-[#C44900]'
                : isTimedIn
                ? 'bg-[#C44900]/20 text-orange-300 border border-[#C44900]/50'
                : 'bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            {isTimedOut ? 'Shift Done' : isTimedIn ? 'On Shift' : 'Not Clocked In'}
          </span>
        </div>

        {/* Timestamps Strip */}
        <div className="grid grid-cols-3 gap-2.5 mt-5">
          <div className="bg-[#201f1f] border border-white/10 rounded-2xl p-3">
            <span className="block font-mono text-[10px] uppercase text-slate-400">Time In</span>
            <span className="font-mono text-xs sm:text-base font-bold text-white mt-0.5 block">
              {formatTimeDisplay(todayLog?.time_in || null)}
            </span>
          </div>
          <div className="bg-[#201f1f] border border-white/10 rounded-2xl p-3">
            <span className="block font-mono text-[10px] uppercase text-slate-400">Time Out</span>
            <span className="font-mono text-xs sm:text-base font-bold text-white mt-0.5 block">
              {formatTimeDisplay(todayLog?.time_out || null)}
            </span>
          </div>
          <div className="bg-[#201f1f] border border-white/10 rounded-2xl p-3">
            <span className="block font-mono text-[10px] uppercase text-slate-400">Net Hours</span>
            <span className="font-mono text-xs sm:text-base font-bold text-[#C44900] mt-0.5 block">
              {todayLog?.hours_worked ? formatHoursWhole(todayLog.hours_worked) : '0h'}
            </span>
          </div>
        </div>

        {/* Auto Time-Out Blocked Warning (Restriction 5a) */}
        {autoTimeOutBlocked && (
          <div className="mt-4 p-3.5 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-100 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="font-mono text-[11px] leading-relaxed">
              Your scheduled shift end ({profile.daily_end_time?.slice(0, 5) || '18:00'}) has passed, but auto time-out is paused because no task is checked under <strong>&ldquo;What did you work on?&rdquo;</strong> below.
            </p>
          </div>
        )}

        {/* Thumb-Friendly Punch Action Buttons */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isSaving || isTimedIn}
            onClick={() => setPendingAction('time-in')}
            className={`h-14 rounded-2xl font-clash-semibold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              isTimedIn
                ? 'bg-white/10 text-slate-400 cursor-not-allowed'
                : 'bg-[#C44900] hover:bg-[#9E3B00] text-white shadow-[0_10px_28px_-6px_rgba(196,73,0,0.5)] active:scale-[0.99]'
            }`}
          >
            <LogIn className="w-5 h-5" />
            {isTimedIn ? 'Timed In Today' : 'Tap to Time-In'}
          </button>

          <button
            type="button"
            disabled={isSaving || !isTimedIn || isTimedOut}
            onClick={handleManualTimeOut}
            className={`h-14 rounded-2xl font-clash-semibold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              !isTimedIn || isTimedOut
                ? 'bg-white/10 text-slate-500 cursor-not-allowed'
                : 'bg-white text-black hover:bg-orange-50 active:scale-[0.99]'
            }`}
          >
            <LogOut className="w-5 h-5" />
            {isTimedOut ? 'Shift Completed' : 'Tap to Time-Out'}
          </button>
        </div>
      </section>

      {/* Smart Task Checklist & Auto-Formatted Weekly/Monthly Report Summary */}
      <section className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="font-array-semibold text-xs uppercase tracking-[0.2em] text-[#334155]">
              Daily Task Checklist
            </span>
            <h2 className="font-clash-semibold text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              What did you work on?
            </h2>
          </div>
          <Clock className="w-5 h-5 text-[#C44900] shrink-0" />
        </div>

        {isChecklistLocked && (
          <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#C44900] shrink-0 mt-0.5" />
            <div className="font-mono text-xs leading-relaxed">
              <p className="font-bold text-slate-900">
                {!isTimedIn ? 'Not Timed In Yet' : 'Shift Finished — Already Clocked Out'}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {!isTimedIn
                  ? 'Tap "Tap to Time-In" above to unlock the task checklist, custom notes, and report summary.'
                  : 'Your shift is complete and your accomplishments have been saved to Daily Logs.'}
              </p>
            </div>
          </div>
        )}

        <div className={`space-y-4 transition-opacity ${isChecklistLocked ? 'opacity-50 pointer-events-none select-none' : ''}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PRESET_OJT_TASKS.map((task) => {
              const active = selectedTasks.includes(task.label);
              return (
                <button
                  key={task.id}
                  type="button"
                  disabled={isChecklistLocked}
                  onClick={() => toggleTask(task.label)}
                  className={`min-h-[48px] px-3.5 py-2.5 rounded-2xl border-2 text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    active
                      ? 'border-[#C44900] bg-[#C44900]/8 text-slate-900'
                      : 'border-slate-200/90 bg-slate-50/50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <span className="block font-sans text-sm font-semibold leading-snug">
                      {task.label}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                      {task.category}
                    </span>
                  </div>
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      active ? 'bg-[#C44900] text-white' : 'bg-white border border-slate-300'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold">
              Others / Custom Notes
            </label>
            <textarea
              rows={2}
              disabled={isChecklistLocked}
              value={customTasks}
              onChange={(e) => {
                setTasksDirty(true);
                setCustomTasks(e.target.value);
              }}
              placeholder="e.g. Fix login redirect bug on iOS Safari; migrate users table"
              className="w-full p-3.5 rounded-2xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-sm text-slate-900 disabled:cursor-not-allowed"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={isChecklistLocked || isSaving || !customTasks.trim()}
                onClick={() => setPendingAction('format-notes')}
                className="h-10 px-4 rounded-xl border-2 border-slate-200 bg-white hover:border-[#C44900] hover:text-[#C44900] disabled:opacity-50 disabled:cursor-not-allowed text-slate-800 font-mono text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C44900]" />
                Add Notes to Summary
              </button>
            </div>
          </div>

          {/* Auto-Formatted Summary Preview for Weekly Report & Monthly Report */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#C44900]" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-700">
                  Weekly Report &amp; Monthly Report Summary
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400 uppercase">
                Auto-formatted on save
              </span>
            </div>

            <textarea
              rows={4}
              disabled={isChecklistLocked}
              value={aiSummary}
              onChange={(e) => {
                setTasksDirty(false);
                setAiSummary(e.target.value);
              }}
              placeholder="Automatically generated in past tense when you save or time-out..."
              className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:border-[#C44900] focus:outline-none text-sm text-slate-800 leading-relaxed disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="button"
            disabled={isChecklistLocked || isSaving}
            onClick={() => setPendingAction('save-log')}
            className="w-full h-12 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] disabled:opacity-60 disabled:cursor-not-allowed text-white font-clash-semibold text-base inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving & Formatting...' : 'Save Today’s Log'}
          </button>
        </div>
      </section>

      <ConfirmModal
        isOpen={pendingAction !== null}
        loading={isSaving}
        title={
          pendingAction === 'time-in'
            ? 'Confirm Time-In'
            : pendingAction === 'time-out'
            ? 'Confirm Time-Out'
            : pendingAction === 'format-notes'
            ? 'Add Notes to Summary'
            : "Save Today's Log"
        }
        description={
          pendingAction === 'time-in'
            ? `Record your Time-In for ${liveDateStr} at ${liveTimeStr}?`
            : pendingAction === 'time-out'
            ? `Complete your shift and record Time-Out at ${liveTimeStr}? Your selected tasks will be formatted automatically for your reports.`
            : pendingAction === 'format-notes'
            ? 'Format your custom notes (along with any checked tasks) into past-tense statements for the Weekly & Monthly Report Summary?'
            : "Save today's checked tasks and accomplishment summary to your attendance log?"
        }
        confirmLabel={
          pendingAction === 'time-in'
            ? 'Time In'
            : pendingAction === 'time-out'
            ? 'Time Out'
            : pendingAction === 'format-notes'
            ? 'Add to Summary'
            : 'Save Log'
        }
        onConfirm={handleConfirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
