'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CalendarPlus,
  Camera,
  Clock,
  Filter,
  Moon,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
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

const MONTHS_LIST = [
  { value: '01', label: 'Jan' },
  { value: '02', label: 'Feb' },
  { value: '03', label: 'Mar' },
  { value: '04', label: 'Apr' },
  { value: '05', label: 'May' },
  { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' },
  { value: '08', label: 'Aug' },
  { value: '09', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' },
];

const DAYS_LIST = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

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

  // Search & Filter & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterDay, setFilterDay] = useState('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

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
    if (calendarEntries !== undefined) return;
    let active = true;
    fetchCalendarEntries(profile.id).then((data) => {
      if (active && data) {
        setEntries(data);
      }
    });
    return () => {
      active = false;
    };
  }, [profile.id, calendarEntries]);

  const calendarMap = useMemo(() => {
    const map = new Map<string, CalendarEntry>();
    entries.forEach((e) => {
      if (e.date) map.set(e.date, e);
    });
    return map;
  }, [entries]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.date) set.add(l.date.slice(0, 4));
    });
    return Array.from(set).sort().reverse();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // 1. Year filter
    if (filterYear !== 'all') {
      result = result.filter((l) => l.date.startsWith(filterYear));
    }

    // 2. Month filter
    if (filterMonth !== 'all') {
      result = result.filter((l) => {
        const parts = l.date.split('-');
        return parts[1] === filterMonth;
      });
    }

    // 3. Day filter
    if (filterDay !== 'all') {
      result = result.filter((l) => {
        const parts = l.date.split('-');
        return parts[2] === filterDay;
      });
    }

    // 4. Keyword / task / date search
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((l) => {
        const cal = calendarMap.get(l.date);
        const matchDate = l.date.toLowerCase().includes(q) || formatReportDate(l.date).toLowerCase().includes(q);
        const matchSummary = (l.ai_summary || '').toLowerCase().includes(q);
        const matchCustom = (l.custom_tasks || '').toLowerCase().includes(q);
        const matchTitle = (cal?.title || '').toLowerCase().includes(q);
        const matchDesc = (cal?.description || '').toLowerCase().includes(q);
        const matchTasks = (l.tasks_selected || []).some((t) => t.toLowerCase().includes(q));
        return matchDate || matchSummary || matchCustom || matchTitle || matchDesc || matchTasks;
      });
    }

    // 5. Sort by Day / Date
    result.sort((a, b) => {
      return sortOrder === 'desc'
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date);
    });

    return result;
  }, [logs, filterYear, filterMonth, filterDay, searchQuery, sortOrder, calendarMap]);

  const hasActiveFilter =
    searchQuery.trim() !== '' ||
    filterYear !== 'all' ||
    filterMonth !== 'all' ||
    filterDay !== 'all' ||
    sortOrder !== 'desc';

  const resetFilters = () => {
    setSearchQuery('');
    setFilterYear('all');
    setFilterMonth('all');
    setFilterDay('all');
    setSortOrder('desc');
  };

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

  const totalLoggedHours = useMemo(() => {
    return logs.reduce((sum, l) => sum + (Number(l.hours_worked) || 0), 0);
  }, [logs]);

  const avgShiftHours = useMemo(() => {
    if (logs.length === 0) return 0;
    return Math.round((totalLoggedHours / logs.length) * 10) / 10;
  }, [logs.length, totalLoggedHours]);

  return (
    <div className="space-y-5 pb-36 sm:pb-40 pb-[calc(env(safe-area-inset-bottom)+7.5rem)]">
      {/* Top Header & Quick Add */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#C44900] font-bold">
            Attendance Ledger
          </span>
          <h2 className="font-clash-semibold text-2xl sm:text-3xl font-bold text-black mt-0.5">
            Daily Logs ({logs.length})
          </h2>
        </div>

        <button
          type="button"
          onClick={openNewModal}
          className="h-11 px-4 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-mono text-xs uppercase font-bold inline-flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.99] self-start sm:self-auto"
        >
          <CalendarPlus className="w-4 h-4" />
          Add OJT Day Log
        </button>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-3.5 sm:p-4">
          <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
            Total Logged
          </span>
          <span className="font-clash-semibold text-xl sm:text-2xl font-bold text-[#C44900] mt-0.5 block">
            {formatHoursWhole(totalLoggedHours)}
          </span>
        </div>
        <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-3.5 sm:p-4">
          <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
            Completed Shifts
          </span>
          <span className="font-clash-semibold text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 block">
            {logs.length} {logs.length === 1 ? 'day' : 'days'}
          </span>
        </div>
        <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-3.5 sm:p-4">
          <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
            Avg Shift
          </span>
          <span className="font-clash-semibold text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 block">
            {avgShiftHours}h
          </span>
        </div>
      </div>

      {/* Search & Sort Controls Toolbar */}
      <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Top Row on Mobile: Search Bar + Mobile Filters Toggle */}
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs by keyword, task, or date..."
                className="w-full h-11 pl-10 pr-9 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-xs font-mono text-slate-900 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mobile Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFilterExpanded((prev) => !prev)}
              className={`sm:hidden h-11 px-3 rounded-xl border-2 font-mono text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer relative ${
                isFilterExpanded || (filterYear !== 'all' || filterMonth !== 'all' || filterDay !== 'all' || sortOrder !== 'desc')
                  ? 'border-[#C44900] bg-orange-50/70 text-[#C44900]'
                  : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100'
              }`}
              aria-label="Toggle filter and sort options"
              aria-expanded={isFilterExpanded}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {(filterYear !== 'all' || filterMonth !== 'all' || filterDay !== 'all' || sortOrder !== 'desc') && (
                <span className="w-2 h-2 rounded-full bg-[#C44900]" />
              )}
            </button>
          </div>

          {/* Filter & Sort Controls: Collapsible on mobile (<640px), permanently inline on desktop (sm:) */}
          <div
            className={`${
              isFilterExpanded ? 'flex' : 'hidden'
            } sm:flex items-center gap-2 flex-wrap pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100`}
          >
            {/* Year Selector */}
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="h-11 px-3 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none font-mono text-xs text-slate-700 cursor-pointer"
            >
              <option value="all">All Years</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>

            {/* Month Selector */}
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="h-11 px-3 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none font-mono text-xs text-slate-700 cursor-pointer"
            >
              <option value="all">All Months</option>
              {MONTHS_LIST.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.value})
                </option>
              ))}
            </select>

            {/* Day Selector */}
            <select
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              className="h-11 px-3 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none font-mono text-xs text-slate-700 cursor-pointer"
            >
              <option value="all">All Days</option>
              {DAYS_LIST.map((d) => (
                <option key={d} value={d}>
                  Day {d}
                </option>
              ))}
            </select>

            {/* Sort by Day / Date */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
              className="h-11 px-3 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none font-mono text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="h-11 px-3 rounded-xl border-2 border-slate-200 hover:border-slate-400 bg-white font-mono text-xs font-bold text-slate-600 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Status count indicator */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-900">{filteredLogs.length}</strong> of{' '}
            {logs.length} logs
          </span>
          {hasActiveFilter && (
            <span className="text-[#C44900] font-bold">Filters Active</span>
          )}
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-8 sm:p-12 text-center shadow-xs">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-clash-semibold text-lg text-slate-900">No attendance logs yet</p>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Tap Time-In on the Clock tab or click &ldquo;Add OJT Day Log&rdquo; above to record your first daily shift.
          </p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-8 text-center shadow-xs space-y-2">
          <p className="font-clash-semibold text-base text-slate-900">No logs match your filter criteria</p>
          <p className="text-xs font-mono text-slate-500">
            Try adjusting your search terms, year, month, or day.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-2 h-9 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* ITEM 4: Show logs in "ONE" column only */
        <div className="space-y-3.5">
          {filteredLogs.map((log) => {
            const calEntry = calendarMap.get(log.date);
            const hasPhoto = Boolean(calEntry?.image_url);
            const displayTitle = calEntry?.title || 'What did you work on?';
            const displayNotes = calEntry?.description || '';

            return (
              <article
                key={log.id}
                className="bg-white border-2 border-slate-200/80 hover:border-[#C44900] rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition-colors shadow-xs"
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

                {/* Accomplishments Summary */}
                {(log.ai_summary || log.custom_tasks || log.tasks_selected.length > 0) &&
                  (!hasPhoto ||
                    (log.ai_summary !== displayNotes &&
                      (log.ai_summary || log.custom_tasks || log.tasks_selected.join(', ')) !== displayNotes)) && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed font-sans">
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
                        <strong>Notice:</strong> Time-out appears earlier than or equal to time-in ({timeIn} → {timeOut}), resulting in 0 net hours.
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60">
                      {/* 1-Click Fix to PM button if timeOut is in AM (01:00 - 11:59) */}
                      {parseInt(timeOut.split(':')[0], 10) < 12 && (
                        <button
                          type="button"
                          onClick={() => {
                            const [h, m] = timeOut.split(':').map(Number);
                            const newH = String((h + 12) % 24).padStart(2, '0');
                            setTimeOut(`${newH}:${String(m).padStart(2, '0')}`);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-mono text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          Switch to PM ({((parseInt(timeOut.split(':')[0], 10) + 12) % 24).toString().padStart(2, '0')}:{timeOut.split(':')[1]})
                        </button>
                      )}
                      {/* Overnight shift toggle */}
                      <button
                        type="button"
                        onClick={() => setIsOvernight(true)}
                        className="px-2.5 py-1 rounded-lg border border-amber-400 text-amber-800 hover:bg-amber-100 font-mono text-[11px] font-semibold cursor-pointer transition-colors"
                      >
                        Overnight (+1 day)
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Overnight Badge and Toggle */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <Moon className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono text-xs text-slate-700">Overnight Shift (Ends next calendar day)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isOvernight}
                    onChange={(e) => setIsOvernight(e.target.checked)}
                    className="w-4 h-4 accent-[#C44900] rounded cursor-pointer"
                  />
                </div>

                {/* Live shift calculation preview */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">
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
                    className="w-full p-3.5 rounded-xl border-2 border-slate-200 focus:border-[#C44900] focus:outline-none text-sm font-sans"
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
