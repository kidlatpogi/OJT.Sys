'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileText,
  MoveHorizontal,
  X,
} from 'lucide-react';
import { AttendanceLog, UserProfile } from '@/types/ojt';
import ConfirmModal from '@/components/ConfirmModal';
import {
  buildMonthlyRollups,
  computeAttendanceTotals,
  formatHoursWhole,
  formatReportDate,
  formatTimeDisplay,
  getMonthLabel,
  getWeekBounds,
} from '@/lib/ojt-calculations';

interface ReportsTabProps {
  profile: UserProfile;
  logs: AttendanceLog[];
}

function getPreviousMonthKey(date: Date = new Date()): string {
  const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
}

function getCurrentMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function shiftDateDays(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + deltaDays);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export default function ReportsTab({ profile, logs }: ReportsTabProps) {
  const [activeReport, setActiveReport] = useState<'003' | '004' | '005'>('003');
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'docx' | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [pendingDownload, setPendingDownload] = useState<'pdf' | 'docx' | null>(null);

  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => a.date.localeCompare(b.date)),
    [logs]
  );

  // Monthly Report defaults to completed previous month if it has logs (or on the 1st of the month)
  const currentMonthKey = getCurrentMonthKey();
  const prevMonthKey = getPreviousMonthKey();
  const hasPrevMonthLogs = sortedLogs.some((l) => l.date.startsWith(prevMonthKey));
  const defaultMonth =
    new Date().getDate() === 1 || hasPrevMonthLogs
      ? prevMonthKey
      : sortedLogs[sortedLogs.length - 1]?.date.slice(0, 7) || currentMonthKey;

  const defaultWeekRef =
    sortedLogs[sortedLogs.length - 1]?.date || new Date().toISOString().slice(0, 10);

  const [monthFilter, setMonthFilter] = useState(defaultMonth);
  const [weekRefDate, setWeekRefDate] = useState(defaultWeekRef);

  // Attendance Report (max 12 rows)
  const periodLogs = sortedLogs.slice(-12);
  const attendanceTotals = computeAttendanceTotals(
    sortedLogs,
    periodLogs.map((l) => l.date)
  );

  // Weekly Report (strictly 1 Mon-Fri week)
  const weekBounds = getWeekBounds(weekRefDate);
  const weeklyLogs = sortedLogs
    .filter((l) => l.date >= weekBounds.start && l.date <= weekBounds.end)
    .slice(0, 5);
  const weeklyTotal = weeklyLogs.reduce(
    (sum, l) => sum + Math.ceil(Number(l.hours_worked) || 0),
    0
  );

  // Monthly Report (rolls up completed weeks for target month)
  const monthlyRollups = buildMonthlyRollups(sortedLogs, monthFilter).slice(0, 4);
  const monthlyTotal = monthlyRollups.reduce((sum, r) => sum + Math.ceil(r.totalHours), 0);
  const isMonthInProgress = monthFilter >= currentMonthKey;

  useEffect(() => {
    return () => {
      if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
    };
  }, [previewPdfUrl]);

  const fetchReportBlob = async (format: 'pdf' | 'docx') => {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: activeReport,
        format,
        profile,
        logs: sortedLogs,
        monthFilter,
        weekStart: weekRefDate,
      }),
    });
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  };

  const handleOpenPreview = async () => {
    setPreviewLoading(true);
    try {
      const blob = await fetchReportBlob('pdf');
      if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
      const url = URL.createObjectURL(blob);
      const titleMap = {
        '003': 'Daily Attendance Report (1:1 Preview)',
        '004': 'Weekly Accomplishment Report (1:1 Preview)',
        '005': 'Monthly Accomplishment Report (1:1 Preview)',
      };
      setPreviewTitle(titleMap[activeReport]);
      setPreviewPdfUrl(url);
    } catch {
      alert('Could not generate 1:1 preview. Please try again.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(null);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    setExportingFormat(format);
    try {
      const blob = await fetchReportBlob(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const nameMap = {
        '003': 'Attendance-Report',
        '004': 'Weekly-Report',
        '005': 'Monthly-Report',
      };
      a.href = url;
      a.download = `${nameMap[activeReport]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert(`Failed to export ${format.toUpperCase()} report.`);
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="font-array-semibold text-xs uppercase tracking-[0.2em] text-[#334155]">
            Official Templates
          </span>
          <h2 className="font-clash-semibold text-2xl sm:text-3xl font-bold text-black">
            OJT Reports
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/80 rounded-2xl">
          {[
            { id: '003' as const, label: 'Attendance' },
            { id: '004' as const, label: 'Weekly Report' },
            { id: '005' as const, label: 'Monthly Report' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveReport(tab.id)}
              className={`px-2 sm:px-3 py-2 rounded-xl font-mono text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                activeReport === tab.id
                  ? 'bg-white text-[#C44900] shadow-xs'
                  : 'text-slate-600 hover:text-black'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Period Controls + Preview / DOCX / PDF Export */}
      <div className="no-print bg-white border-2 border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {activeReport === '004' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous week"
                onClick={() => setWeekRefDate((d) => shiftDateDays(d, -7))}
                className="h-10 w-10 rounded-xl border border-slate-200 hover:border-slate-400 flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div>
                <span className="block font-mono text-[10px] uppercase text-slate-400 font-bold">
                  Week ({weekBounds.label})
                </span>
                <input
                  type="date"
                  value={weekRefDate}
                  onChange={(e) => setWeekRefDate(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-slate-200 text-xs font-mono"
                />
              </div>
              <button
                type="button"
                aria-label="Next week"
                onClick={() => setWeekRefDate((d) => shiftDateDays(d, 7))}
                className="h-10 w-10 rounded-xl border border-slate-200 hover:border-slate-400 flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeReport === '005' && (
            <div>
              <label className="block font-mono text-[10px] uppercase text-slate-400 font-bold">
                Report Month (Finalizes 1st of Next Month)
              </label>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-slate-200 text-xs font-mono"
                />
                <span
                  className={`font-mono text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                    isMonthInProgress
                      ? 'bg-slate-100 text-slate-600 border border-slate-200'
                      : 'bg-orange-50 text-[#C44900] border border-[#C44900]/30'
                  }`}
                >
                  {isMonthInProgress ? 'Month In Progress' : 'Ready for Submission'}
                </span>
              </div>
            </div>
          )}

          {activeReport === '003' && (
            <div className="font-mono text-xs text-slate-600">
              Latest <strong>{periodLogs.length}</strong> of 12 daily attendance rows
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={previewLoading}
            onClick={handleOpenPreview}
            className="h-11 px-3 rounded-xl bg-slate-900 hover:bg-black disabled:opacity-60 text-white font-mono text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>{previewLoading ? 'Loading...' : 'Preview'}</span>
          </button>

          <button
            type="button"
            disabled={exportingFormat !== null}
            onClick={() => setPendingDownload('docx')}
            className="h-11 px-3 rounded-xl border-2 border-slate-200 hover:border-slate-900 disabled:opacity-60 font-mono text-xs font-bold text-slate-800 inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>{exportingFormat === 'docx' ? 'Building...' : 'DOCX'}</span>
          </button>

          <button
            type="button"
            disabled={exportingFormat !== null}
            onClick={() => setPendingDownload('pdf')}
            className="h-11 px-3 rounded-xl bg-[#C44900] hover:bg-[#9E3B00] disabled:opacity-60 text-white font-mono text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{exportingFormat === 'pdf' ? 'Saving...' : 'PDF'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Horizontal Scroll Hint */}
      <div className="no-print sm:hidden flex items-center justify-center gap-1.5 font-mono text-[11px] text-slate-500">
        <MoveHorizontal className="w-3.5 h-3.5 text-[#C44900]" />
        <span>Swipe left or right to view full 1:1 document page</span>
      </div>

      {/* Horizontally Scrollable 1:1 Official Template Sheet Preview */}
      <div className="print-only-card bg-white border-2 border-slate-200/80 rounded-3xl p-3 sm:p-6 w-full overflow-x-auto touch-pan-x">
        {activeReport === '003' && (
          <div className="w-[700px] mx-auto space-y-4 text-black p-2 sm:p-4">
            <img
              src="/seca-header.png"
              alt="NU Dasmariñas School of Engineering, Computing, and Architecture"
              decoding="async"
              className="mx-auto block w-[393px] h-[97px] max-w-full object-contain"
            />
            <h3 className="text-center font-sans text-lg font-bold tracking-wide">
              DAILY ATTENDANCE REPORT
            </h3>

            <table className="w-full text-xs border-collapse border border-black font-sans">
              <tbody>
                <tr>
                  <td className="border border-black p-1.5 font-bold w-24">Name:</td>
                  <td className="border border-black p-1.5" colSpan={4}>
                    {profile.full_name}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5 font-bold">Company:</td>
                  <td className="border border-black p-1.5" colSpan={4}>
                    {profile.company_name}
                    {profile.branch_department ? ` (${profile.branch_department})` : ''}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5 text-[11px]" colSpan={5}>
                    <strong>NOTE:</strong> To be filled up by the intern and signed by the Internship Supervisor/immediate supervisor on a daily basis. This must be submitted to the Internship Coordinator along with the weekly activity report.
                  </td>
                </tr>
                <tr className="bg-slate-100 font-bold text-center">
                  <td className="border border-black p-1.5 w-36">Date</td>
                  <td className="border border-black p-1.5">Time-In</td>
                  <td className="border border-black p-1.5">Time-Out</td>
                  <td className="border border-black p-1.5">Total Hours</td>
                  <td className="border border-black p-1.5">Signature</td>
                </tr>
                {Array.from({ length: 12 }).map((_, idx) => {
                  const log = periodLogs[idx];
                  return (
                    <tr key={idx} className="h-7">
                      <td className="border border-black px-2 py-1 whitespace-nowrap">
                        {log ? formatReportDate(log.date) : ''}
                      </td>
                      <td className="border border-black px-2 py-1 text-center whitespace-nowrap">
                        {log ? formatTimeDisplay(log.time_in) : ''}
                      </td>
                      <td className="border border-black px-2 py-1 text-center whitespace-nowrap">
                        {log ? formatTimeDisplay(log.time_out) : ''}
                      </td>
                      <td className="border border-black px-2 py-1 text-center font-semibold whitespace-nowrap">
                        {log ? formatHoursWhole(log.hours_worked) : ''}
                      </td>
                      <td className="border border-black px-2 py-1"></td>
                    </tr>
                  );
                })}
                <tr>
                  <td className="border border-black p-1.5 font-bold">Previous Total:</td>
                  <td className="border border-black p-1.5 font-semibold">
                    {formatHoursWhole(attendanceTotals.previousTotal)}
                  </td>
                  <td className="border border-black p-1.5 font-bold">Total this Period:</td>
                  <td className="border border-black p-1.5 font-semibold">
                    {formatHoursWhole(attendanceTotals.totalThisPeriod)}
                  </td>
                  <td className="border border-black p-1.5">
                    <span className="font-bold block text-[10px]">
                      Total Hours Served: (Previous Total + Total this Period)
                    </span>
                    <span className="font-bold text-[#C44900]">
                      {formatHoursWhole(attendanceTotals.totalHoursServed)}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-bold">Intern Signature</td>
                  <td className="border border-black p-2" colSpan={2}></td>
                  <td className="border border-black p-2 font-bold" colSpan={2}>
                    Date
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5 text-[11px]" colSpan={5}>
                    I verify that the above information is correct and that the intern was in attendance on the above days at the times indicated.
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-bold">Supervisor Signature</td>
                  <td className="border border-black p-2" colSpan={2}></td>
                  <td className="border border-black p-2 font-bold" colSpan={2}>
                    Date
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeReport === '004' && (
          <div className="w-[700px] mx-auto space-y-4 text-black font-sans p-2 sm:p-4">
            <img
              src="/seca-header.png"
              alt="NU Dasmariñas School of Engineering, Computing, and Architecture"
              decoding="async"
              className="mx-auto block w-[393px] h-[97px] max-w-full object-contain"
            />
            <div className="text-center space-y-0.5">
              <h3 className="text-base font-bold">
                ON-THE-JOB TRAINING <span className="underline">WEEKLY</span> ACCOMPLISHMENT REPORT
              </h3>
              <p className="text-xs font-bold">MONTH OF: {getMonthLabel(weekBounds.start)}</p>
              <p className="text-xs font-semibold">{profile.academic_term}</p>
            </div>

            <div className="text-xs space-y-1">
              <p>
                <strong>Name of Student Trainee:</strong> {profile.full_name}
              </p>
              <p>
                <strong>Name of Company/Branch Office:</strong> {profile.company_name}
                {profile.branch_department ? ` / ${profile.branch_department}` : ''}
              </p>
            </div>

            <table className="w-full text-xs border-collapse border border-black">
              <thead>
                <tr className="bg-slate-100 font-bold text-center">
                  <th className="border border-black p-2 w-40">DATE</th>
                  <th className="border border-black p-2">DAILY ACCOMPLISHMENTS</th>
                  <th className="border border-black p-2 w-32">NO. OF WORKING HOURS</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, idx) => {
                  const log = weeklyLogs[idx];
                  return (
                    <tr key={idx} className="h-14">
                      <td className="border border-black p-2 align-top whitespace-nowrap">
                        {log ? formatReportDate(log.date) : ''}
                      </td>
                      <td className="border border-black p-2 whitespace-pre-line align-top">
                        {log ? log.ai_summary || log.custom_tasks || log.tasks_selected.join(', ') : ''}
                      </td>
                      <td className="border border-black p-2 text-center font-semibold align-top">
                        {log ? formatHoursWhole(log.hours_worked) : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <p className="text-xs font-bold text-right">
              Total No. of HOURS: {formatHoursWhole(weeklyTotal)}
            </p>

            <div className="grid grid-cols-2 gap-8 pt-6 text-xs">
              <div>
                <p>Checked by:</p>
                <div className="mt-8 border-t border-black pt-1">
                  <p className="font-semibold">{profile.trainor_name || '______________________'}</p>
                  <p className="text-[11px] text-slate-600">Signature over Printed Name of Trainor</p>
                </div>
              </div>
              <div>
                <p>Noted by:</p>
                <div className="mt-8 border-t border-black pt-1">
                  <p className="font-semibold">{profile.supervisor_name || '______________________'}</p>
                  <p className="text-[11px] text-slate-600">
                    Signature over Printed Name of Supervisor/Manager
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeReport === '005' && (
          <div className="w-[700px] mx-auto space-y-4 text-black font-sans p-2 sm:p-4">
            <img
              src="/seca-header.png"
              alt="NU Dasmariñas School of Engineering, Computing, and Architecture"
              decoding="async"
              className="mx-auto block w-[393px] h-[97px] max-w-full object-contain"
            />
            <div className="text-center space-y-0.5">
              <h3 className="text-base font-bold">
                ON-THE-JOB TRAINING <span className="underline">MONTHLY</span> ACCOMPLISHMENT REPORT
              </h3>
              <p className="text-xs font-bold">MONTH OF: {getMonthLabel(`${monthFilter}-01`)}</p>
              <p className="text-xs font-semibold">{profile.academic_term}</p>
            </div>

            <div className="text-xs space-y-1">
              <p>
                <strong>Name of Student Trainee:</strong> {profile.full_name}
              </p>
              <p>
                <strong>Name of Company/Branch Office:</strong> {profile.company_name}
                {profile.branch_department ? ` / ${profile.branch_department}` : ''}
              </p>
            </div>

            <table className="w-full text-xs border-collapse border border-black">
              <thead>
                <tr className="bg-slate-100 font-bold text-center">
                  <th className="border border-black p-2 w-44">DATE</th>
                  <th className="border border-black p-2">WEEKLY ACCOMPLISHMENTS</th>
                  <th className="border border-black p-2 w-32">NO. OF WORKING HOURS</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 4 }).map((_, idx) => {
                  const wk = monthlyRollups[idx];
                  return (
                    <tr key={idx} className="h-16">
                      <td className="border border-black p-2 align-top font-semibold">
                        {wk ? wk.dateRangeLabel : ''}
                      </td>
                      <td className="border border-black p-2 whitespace-pre-line align-top">
                        {wk ? wk.weeklyAccomplishments : ''}
                      </td>
                      <td className="border border-black p-2 text-center font-semibold align-top">
                        {wk ? formatHoursWhole(wk.totalHours) : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <p className="text-xs font-bold text-right">
              Total No. of HOURS: {formatHoursWhole(monthlyTotal)}
            </p>

            <div className="grid grid-cols-2 gap-8 pt-6 text-xs">
              <div>
                <p>Checked by:</p>
                <div className="mt-8 border-t border-black pt-1">
                  <p className="font-semibold">{profile.trainor_name || '______________________'}</p>
                  <p className="text-[11px] text-slate-600">Signature over Printed Name of Trainor</p>
                </div>
              </div>
              <div>
                <p>Noted by:</p>
                <div className="mt-8 border-t border-black pt-1">
                  <p className="font-semibold">{profile.supervisor_name || '______________________'}</p>
                  <p className="text-[11px] text-slate-600">
                    Signature over Printed Name of Supervisor/Manager
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Exact 1:1 Rendered PDF Preview Modal via Portal (sits above header & bottom nav) */}
      {previewPdfUrl &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="max-w-5xl w-full h-[84dvh] sm:h-[88dvh] mx-auto bg-white rounded-2xl sm:rounded-3xl border-2 border-slate-200 flex flex-col overflow-hidden shadow-2xl">
              <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#C44900] font-bold block">
                    1:1 PDF Document Preview
                  </span>
                  <h3 className="font-clash-semibold text-base sm:text-lg font-bold text-black truncate">
                    {previewTitle}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={previewPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 px-3 rounded-xl border border-slate-300 hover:border-black font-mono text-xs font-bold text-slate-800 inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Open Tab</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setPendingDownload('docx')}
                    className="h-9 px-3 rounded-xl border border-slate-300 hover:border-black font-mono text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    DOCX
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDownload('pdf')}
                    className="h-9 px-3 rounded-xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-mono text-xs font-bold cursor-pointer"
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    aria-label="Close preview"
                    onClick={closePreview}
                    className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-slate-100 p-2 sm:p-4 overflow-hidden flex flex-col">
                <iframe
                  src={previewPdfUrl}
                  title={previewTitle}
                  className="w-full flex-1 rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>
          </div>,
          document.body
        )}

      <ConfirmModal
        isOpen={pendingDownload !== null}
        loading={exportingFormat !== null}
        title={
          pendingDownload === 'pdf'
            ? 'Download PDF Report'
            : 'Download DOCX Report'
        }
        description={
          pendingDownload
            ? `Download your ${
                activeReport === '003'
                  ? 'Daily Attendance Report'
                  : activeReport === '004'
                  ? 'Weekly Accomplishment Report'
                  : 'Monthly Accomplishment Report'
              } as a .${pendingDownload.toUpperCase()} file?`
            : ''
        }
        confirmLabel={pendingDownload === 'pdf' ? 'Download PDF' : 'Download DOCX'}
        onConfirm={async () => {
          const fmt = pendingDownload;
          if (!fmt) return;
          await handleExport(fmt);
          setPendingDownload(null);
        }}
        onCancel={() => setPendingDownload(null)}
      />
    </div>
  );
}
