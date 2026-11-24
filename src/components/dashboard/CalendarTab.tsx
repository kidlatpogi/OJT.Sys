'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Image as ImageIcon,
  Loader2,
  Plus,
} from 'lucide-react';
import { AttendanceLog, CalendarEntry, ChecklistItem, PRESET_OJT_TASKS, UserProfile } from '@/types/ojt';
import {
  buildMonthGrid,
  formatMonthYearTitle,
  getTodayDateString,
  WEEKDAY_LABELS,
} from '@/lib/calendar-utils';
import {
  formatHoursWhole,
  formatReportDate,
  formatTimeDisplay,
} from '@/lib/ojt-calculations';
import { fetchCalendarEntries } from '@/lib/calendar-service';
import DayActivityModal from '@/components/dashboard/DayActivityModal';
import ImageModal from '@/components/ImageModal';

export interface CalendarTabProps {
  profile: UserProfile;
  logs: AttendanceLog[];
  calendarEntries?: CalendarEntry[];
  onCalendarUpdated?: () => void;
  onSaveLog?: (log: Omit<AttendanceLog, 'id' | 'user_id'> & { id?: string }) => Promise<void>;
  mode?: 'supabase' | 'demo';
}

interface CalendarDayTileProps {
  date: string;
  dayNumber: number;
  entry?: CalendarEntry;
  log?: AttendanceLog;
  isToday: boolean;
  isInspected: boolean;
  onSelect: (date: string) => void;
  onHover: (date: string) => void;
  onPreviewPhoto: (preview: {
    imageUrl: string;
    date: string;
    title: string;
    description: string;
  }) => void;
}

const CalendarDayTile = React.memo(function CalendarDayTile({
  date,
  dayNumber,
  entry,
  log,
  isToday,
  isInspected,
  onSelect,
  onHover,
  onPreviewPhoto,
}: CalendarDayTileProps) {
  const hasPhoto = Boolean(entry?.image_url);

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      onMouseEnter={() => onHover(date)}
      className={`group relative aspect-[3/4] rounded-lg sm:rounded-2xl overflow-hidden cursor-pointer transition-all duration-150 select-none flex flex-col justify-between p-1 sm:p-2.5 text-left border ${
        isToday
          ? 'ring-2 ring-[#C44900] ring-offset-2 ring-offset-[#141313] border-[#C44900]'
          : isInspected
          ? 'ring-1 ring-orange-400/80 border-orange-400/80'
          : 'border-white/5 hover:border-white/20'
      } ${
        hasPhoto
          ? 'shadow-md hover:scale-[1.03] hover:shadow-xl'
          : 'bg-[#1c1c1f] hover:bg-[#252529] hover:scale-[1.02]'
      }`}
    >
      {/* Background Photo if exists */}
      {hasPhoto && entry ? (
        <>
          <img
            src={entry.image_url}
            alt={entry.title || `Photo for ${date}`}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40 pointer-events-none" />
        </>
      ) : null}

      {/* Fallback Flame icon when activity or log exists without a photo */}
      {!hasPhoto && (entry || log) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Flame className="w-5 h-5 sm:w-7 sm:h-7 text-[#C44900]/70 group-hover:text-[#C44900] group-hover:scale-110 transition-all drop-shadow-[0_0_8px_rgba(196,73,0,0.3)]" />
        </div>
      )}

      {/* Top Row: Day Number & Attendance/Activity Dot */}
      <div className="relative z-10 flex items-start justify-between w-full pointer-events-none">
        <span
          className={`font-clash-semibold font-bold text-sm sm:text-base leading-none ${
            hasPhoto
              ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]'
              : isToday
              ? 'text-[#C44900]'
              : 'text-slate-300 group-hover:text-white'
          }`}
        >
          {dayNumber}
        </span>

        {log && (
          <span
            title={`${log.hours_worked} hours logged`}
            className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#C44900] shadow-xs shrink-0"
          />
        )}
      </div>

      {/* Bottom Row / Status Indicator */}
      <div className="relative z-10 w-full pointer-events-none">
        {hasPhoto && entry ? (
          <div className="flex items-center justify-between text-[10px] text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-mono">
            {log ? (
              <span className="hidden sm:inline-block font-semibold">
                {log.hours_worked}h
              </span>
            ) : (
              <span />
            )}
            <button
              type="button"
              aria-label={`View full photo for ${date}`}
              title="View photo"
              onClick={(e) => {
                e.stopPropagation();
                onPreviewPhoto({
                  imageUrl: entry.image_url,
                  date,
                  title: entry.title || `Activity for ${date}`,
                  description:
                    entry.description ||
                    log?.ai_summary ||
                    log?.custom_tasks ||
                    (log?.tasks_selected?.length ? log.tasks_selected.join(', ') : '') ||
                    '',
                });
              }}
              className="p-1 rounded-md hover:bg-black/50 text-white/90 hover:text-white transition-colors cursor-pointer pointer-events-auto ml-auto"
            >
              <ImageIcon className="w-3 h-3 text-white/90" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-slate-500 font-mono text-[10px]">
            {log ? (
              <span className="font-semibold text-slate-400">
                {log.hours_worked}h
              </span>
            ) : (
              <span />
            )}
            <Plus className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
          </div>
        )}
      </div>
    </button>
  );
});

const CalendarTab = React.memo(function CalendarTab({
  profile,
  logs,
  calendarEntries,
  onCalendarUpdated,
  onSaveLog,
}: CalendarTabProps) {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(today.getMonth());

  const [entries, setEntries] = useState<CalendarEntry[]>(calendarEntries || []);
  const [loading, setLoading] = useState<boolean>(!calendarEntries);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [selectedInspectorDate, setSelectedInspectorDate] = useState<string>(getTodayDateString());
  const [previewImage, setPreviewImage] = useState<{
    imageUrl: string;
    date: string;
    title?: string;
    description?: string;
  } | null>(null);

  // Sync entries with calendarEntries prop when provided
  useEffect(() => {
    if (calendarEntries !== undefined) {
      setEntries(calendarEntries);
      setLoading(false);
    }
  }, [calendarEntries]);

  // Load calendar entries for the current user and active internship if calendarEntries prop not supplied
  const loadEntries = useCallback(async () => {
    if (calendarEntries !== undefined) return;
    try {
      setLoading(true);
      const data = await fetchCalendarEntries(profile.id, profile.active_internship_id);
      setEntries(data);
    } catch (err) {
      console.error('Failed to load calendar entries:', err);
    } finally {
      setLoading(false);
    }
  }, [profile.id, profile.active_internship_id, calendarEntries]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Index entries by date: 'YYYY-MM-DD' -> CalendarEntry
  const entriesByDate = useMemo(() => {
    const map = new Map<string, CalendarEntry>();
    entries.forEach((e) => {
      map.set(e.date, e);
    });
    return map;
  }, [entries]);

  // Index attendance logs by date: 'YYYY-MM-DD' -> AttendanceLog
  const logsByDate = useMemo(() => {
    const map = new Map<string, AttendanceLog>();
    logs.forEach((l) => {
      map.set(l.date, l);
    });
    return map;
  }, [logs]);

  // Month grid cells
  const monthGrid = useMemo(() => {
    return buildMonthGrid(currentYear, currentMonthIndex);
  }, [currentYear, currentMonthIndex]);

  // Month title: "September 2026"
  const monthTitle = useMemo(() => {
    return formatMonthYearTitle(currentYear, currentMonthIndex);
  }, [currentYear, currentMonthIndex]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonthIndex(now.getMonth());
  };

  // Month statistics
  const currentMonthPrefix = useMemo(() => {
    const m = String(currentMonthIndex + 1).padStart(2, '0');
    return `${currentYear}-${m}`;
  }, [currentYear, currentMonthIndex]);

  const monthStats = useMemo(() => {
    let photosCount = 0;
    let hoursCount = 0;

    entries.forEach((e) => {
      if (e.date.startsWith(currentMonthPrefix) && e.image_url) {
        photosCount++;
      }
    });

    logs.forEach((l) => {
      if (l.date.startsWith(currentMonthPrefix)) {
        hoursCount += Number(l.hours_worked) || 0;
      }
    });

    return { photosCount, hoursCount };
  }, [entries, logs, currentMonthPrefix]);

  const activeModalEntry = modalDate ? entriesByDate.get(modalDate) || null : null;
  const activeModalLog = modalDate ? logsByDate.get(modalDate) || null : null;

  const handleEntryUpdated = (updated: CalendarEntry | null) => {
    if (!modalDate) return;
    if (updated) {
      setEntries((prev) => {
        const filtered = prev.filter((e) => e.date !== updated.date);
        return [updated, ...filtered];
      });
    } else {
      setEntries((prev) => prev.filter((e) => e.date !== modalDate));
    }
    onCalendarUpdated?.();
  };

  const todayStr = getTodayDateString();
  const inspectorEntry = entriesByDate.get(selectedInspectorDate) || null;
  const inspectorLog = logsByDate.get(selectedInspectorDate) || null;

  // Dynamic checklist derived from profile or default presets
  const dynamicChecklist = useMemo<ChecklistItem[]>(() => {
    return profile.work_checklist && profile.work_checklist.length > 0
      ? profile.work_checklist
      : PRESET_OJT_TASKS;
  }, [profile.work_checklist]);

  // Selected tasks for the currently inspected day
  const inspectedTasksSelected = useMemo<string[]>(() => {
    return inspectorLog?.tasks_selected || [];
  }, [inspectorLog]);

  // Combine dynamic checklist items with any historical custom tasks in inspectorLog
  const allInspectorTasks = useMemo(() => {
    const dynamicLabels = new Set(dynamicChecklist.map((t) => t.label));
    const extras: ChecklistItem[] = [];
    inspectedTasksSelected.forEach((label) => {
      if (!dynamicLabels.has(label)) {
        extras.push({
          id: `extra_${label}`,
          label,
          category: 'Custom',
        });
      }
    });
    return [...dynamicChecklist, ...extras];
  }, [dynamicChecklist, inspectedTasksSelected]);

  const handleTileSelect = useCallback((date: string) => {
    setSelectedInspectorDate(date);
    setModalDate(date);
  }, []);

  const handleTileHover = useCallback((date: string) => {
    setSelectedInspectorDate(date);
  }, []);

  const handlePreviewPhoto = useCallback(
    (preview: { imageUrl: string; date: string; title: string; description: string }) => {
      setPreviewImage(preview);
    },
    []
  );

  const handleToggleInspectorTask = async (taskLabel: string) => {
    if (!onSaveLog) return;
    const current = inspectorLog?.tasks_selected || [];
    const updatedTasks = current.includes(taskLabel)
      ? current.filter((t) => t !== taskLabel)
      : [...current, taskLabel];

    await onSaveLog({
      id: inspectorLog?.id,
      date: selectedInspectorDate,
      time_in: inspectorLog?.time_in || null,
      time_out: inspectorLog?.time_out || null,
      hours_worked: inspectorLog?.hours_worked || 0,
      tasks_selected: updatedTasks,
      custom_tasks: inspectorLog?.custom_tasks || '',
      ai_summary: inspectorLog?.ai_summary || '',
      ai_provider: inspectorLog?.ai_provider || 'manual',
    });
  };

  return (
    <div className="space-y-4 pb-36 sm:pb-36 lg:pb-6 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] lg:pb-6">
      {/* Responsive Grid: Left 8 cols on desktop for Calendar, Right 4 cols for Desktop Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left (8 cols): Dark Hero Monthly Calendar */}
        <div className="lg:col-span-8 space-y-4">
          <section className="bg-[#141313] text-white rounded-3xl p-4 sm:p-7 border border-slate-800 shadow-sm">
            {/* Header Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#C44900] font-bold inline-flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    Daily Activity Tracker
                  </span>
                  {loading && <Loader2 className="w-3 h-3 animate-spin text-slate-500" />}
                </div>
                <h2 className="font-clash-semibold text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
                  {monthTitle}
                </h2>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleJumpToToday}
                  className="px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-white/5 hover:bg-white/10 text-slate-300 font-mono text-xs font-semibold cursor-pointer transition-colors"
                >
                  Today
                </button>
                <div className="flex items-center bg-white/5 border border-slate-800 rounded-xl p-0.5">
                  <button
                    type="button"
                    aria-label="Previous Month"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next Month"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Weekday Columns Header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2.5 pt-4 pb-2">
              {WEEKDAY_LABELS.map((day) => (
                <div
                  key={day}
                  className="text-center font-mono text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 7-Column Monthly Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2.5 pt-1">
              {monthGrid.map((cell, index) => {
                if (!cell) {
                  return (
                    <div
                      key={`spacer-${index}`}
                      aria-hidden="true"
                      className="aspect-[3/4] rounded-xl sm:rounded-2xl invisible pointer-events-none"
                    />
                  );
                }

                return (
                  <CalendarDayTile
                    key={cell.date}
                    date={cell.date}
                    dayNumber={cell.dayNumber}
                    entry={entriesByDate.get(cell.date)}
                    log={logsByDate.get(cell.date)}
                    isToday={cell.date === todayStr}
                    isInspected={cell.date === selectedInspectorDate}
                    onSelect={handleTileSelect}
                    onHover={handleTileHover}
                    onPreviewPhoto={handlePreviewPhoto}
                  />
                );
              })}
            </div>

            {/* Footer Stats Summary Bar */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#C44900]" />
                  <strong className="text-white font-bold">{monthStats.photosCount}</strong> photos logged
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <strong className="text-white font-bold">{monthStats.hoursCount}</strong> total hours
                </span>
              </div>

              <div className="text-[11px] text-slate-500">
                Click any tile to add or view daily activity photo
              </div>
            </div>
          </section>
        </div>

        {/* Right (4 cols): Desktop Activity Details Sidebar */}
        <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-20 space-y-4">
          <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                  Day Activity Inspector
                </span>
                <h3 className="font-clash-semibold text-lg font-bold text-slate-900 mt-0.5">
                  {formatReportDate(selectedInspectorDate)}
                </h3>
              </div>
              {inspectorLog && (
                <span className="px-2.5 py-1 rounded-full bg-orange-50 text-[#C44900] border border-[#C44900]/30 font-mono text-xs font-bold">
                  {formatHoursWhole(inspectorLog.hours_worked)}
                </span>
              )}
            </div>

            {inspectorEntry?.image_url ? (
              <div className="space-y-2">
                <div
                  onClick={() =>
                    setPreviewImage({
                      imageUrl: inspectorEntry.image_url,
                      date: selectedInspectorDate,
                      title: inspectorEntry.title || `Activity for ${selectedInspectorDate}`,
                      description:
                        inspectorEntry.description ||
                        inspectorLog?.ai_summary ||
                        inspectorLog?.custom_tasks ||
                        (inspectorLog?.tasks_selected?.length
                          ? inspectorLog.tasks_selected.join(', ')
                          : '') ||
                        '',
                    })
                  }
                  className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 cursor-pointer group shadow-xs"
                >
                  <img
                    src={inspectorEntry.image_url}
                    alt="Day activity"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-mono text-xs font-bold">
                    Click to Zoom Photo
                  </div>
                </div>
                {inspectorEntry.title && (
                  <p className="font-sans text-xs font-bold text-slate-800">
                    {inspectorEntry.title}
                  </p>
                )}
              </div>
            ) : null}

            {inspectorLog ? (
              <div className="space-y-3 text-xs font-mono text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Shift Timing:</span>
                  <span className="font-bold text-slate-900">
                    {formatTimeDisplay(inspectorLog.time_in)} → {formatTimeDisplay(inspectorLog.time_out)}
                  </span>
                </div>

                {/* Dynamic Checklist Tasks for Selected Date */}
                <div className="space-y-3 pt-3 border-t border-slate-200/70">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-array-semibold text-xs uppercase tracking-[0.2em] text-[#334155] block">
                        Daily Task Checklist
                      </span>
                      <h4 className="font-clash-semibold text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                        What did you work on?
                      </h4>
                    </div>
                    {inspectedTasksSelected.length > 0 && (
                      <span className="font-mono text-[10px] font-bold text-[#C44900] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 shrink-0">
                        {inspectedTasksSelected.length} completed
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 max-h-64 overflow-y-auto no-scrollbar pr-1">
                    {allInspectorTasks.map((task) => {
                      const isChecked = inspectedTasksSelected.includes(task.label);
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => handleToggleInspectorTask(task.label)}
                          className={`min-h-[48px] px-3.5 py-2.5 rounded-2xl border-2 text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                            isChecked
                              ? "border-[#C44900] bg-[#C44900]/8 text-slate-900 font-semibold"
                              : "border-slate-200/90 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <span className="block font-sans text-sm font-semibold leading-snug truncate">
                              {task.label}
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                              {task.category}
                            </span>
                          </div>
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              isChecked
                                ? "bg-[#C44900] text-white"
                                : "bg-white border border-slate-300"
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* AI Summary / Custom Notes */}
                {(inspectorLog.ai_summary || inspectorLog.custom_tasks) && (
                  <p className="text-[11px] text-slate-600 leading-relaxed pt-2 border-t border-slate-200/60 font-sans">
                    {inspectorLog.ai_summary || inspectorLog.custom_tasks}
                  </p>
                )}
              </div>
            ) : !inspectorEntry?.image_url ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-1">
                <p className="font-mono text-xs text-slate-500">No activity or log logged for this date.</p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setModalDate(selectedInspectorDate)}
              className="w-full h-11 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-mono text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {inspectorEntry || inspectorLog ? 'Edit Day Activity' : 'Add Day Activity'}
            </button>
          </div>

          {/* Month Overview Snapshot */}
          <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 space-y-3 shadow-xs">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
              Monthly Progress Summary
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-[10px] uppercase block">Total Hours</span>
                <span className="font-clash-semibold text-xl font-bold text-[#C44900] mt-0.5 block">
                  {monthStats.hoursCount}h
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-[10px] uppercase block">Photos Attached</span>
                <span className="font-clash-semibold text-xl font-bold text-slate-900 mt-0.5 block">
                  {monthStats.photosCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Day Activity Modal */}
      {modalDate && (
        <DayActivityModal
          isOpen={Boolean(modalDate)}
          date={modalDate}
          userId={profile.id}
          internshipId={profile.active_internship_id}
          initialEntry={activeModalEntry}
          dayLog={activeModalLog}
          onClose={() => setModalDate(null)}
          onEntryUpdated={handleEntryUpdated}
        />
      )}

      {/* Unified Image Modal */}
      {previewImage && (
        <ImageModal
          isOpen={Boolean(previewImage)}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage.imageUrl}
          date={previewImage.date}
          title={previewImage.title}
          description={previewImage.description}
        />
      )}
    </div>
  );
});

export default CalendarTab;
