import { AttendanceLog } from '@/types/ojt';

/**
 * Computes net working hours between two ISO timestamps,
 * rounding up to the nearest whole hour (no decimals).
 */
export function calculateShiftHours(
  timeInIso: string | null,
  timeOutIso: string | null,
  lunchBreakMinutes = 0
): number {
  if (!timeInIso || !timeOutIso) return 0;
  const start = new Date(timeInIso).getTime();
  const end = new Date(timeOutIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;

  // Use whole minutes so seconds past the hour don't inflate an exact 9h shift
  const grossMinutes = Math.floor((end - start) / 60000);
  const deduction = grossMinutes >= 300 ? Math.max(0, lunchBreakMinutes) : 0;
  const netMinutes = Math.max(0, grossMinutes - deduction);
  if (netMinutes === 0) return 0;

  return Math.ceil(netMinutes / 60);
}

export function formatHoursWhole(hours: number): string {
  const rounded = Math.ceil(Math.max(0, Number(hours) || 0));
  return `${rounded}h`;
}

export const formatWholeHours = formatHoursWhole;

export function formatTimeDisplay(isoOrTime: string | null): string {
  if (!isoOrTime) return '--:--';
  const d = new Date(isoOrTime);
  if (Number.isNaN(d.getTime())) return isoOrTime;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats YYYY-MM-DD as "November 11, 2026".
 */
export function formatReportDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(dateStr: string): string {
  return formatReportDate(dateStr);
}

export function formatCompactDate(dateStr: string): string {
  return formatReportDate(dateStr);
}

export function getMonthLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return 'CURRENT MONTH';
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getWeekBounds(dateStr: string): { start: string; end: string; label: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const base = new Date(y, (m || 1) - 1, d || 1);
  const day = base.getDay(); // 0=Sun..6=Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + diffToMon);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const toIsoDate = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

  const start = toIsoDate(monday);
  const end = toIsoDate(friday);

  const monMonth = monday.toLocaleDateString('en-US', { month: 'long' });
  const friMonth = friday.toLocaleDateString('en-US', { month: 'long' });
  const label =
    monMonth === friMonth
      ? `${monMonth} ${monday.getDate()} – ${friday.getDate()}, ${friday.getFullYear()}`
      : `${monMonth} ${monday.getDate()} – ${friMonth} ${friday.getDate()}, ${friday.getFullYear()}`;

  return { start, end, label };
}

export interface MonthlyWeekRollup {
  weekStart: string;
  weekEnd: string;
  dateRangeLabel: string;
  weeklyAccomplishments: string;
  totalHours: number;
}

export function buildMonthlyRollups(logs: AttendanceLog[], yearMonth: string): MonthlyWeekRollup[] {
  const monthLogs = logs
    .filter((l) => l.date.startsWith(yearMonth))
    .sort((a, b) => a.date.localeCompare(b.date));

  const map = new Map<string, { start: string; end: string; label: string; items: AttendanceLog[] }>();
  for (const log of monthLogs) {
    const bounds = getWeekBounds(log.date);
    const existing = map.get(bounds.start);
    if (existing) {
      existing.items.push(log);
    } else {
      map.set(bounds.start, { start: bounds.start, end: bounds.end, label: bounds.label, items: [log] });
    }
  }

  return Array.from(map.values()).map((week) => {
    const bulletSet = new Set<string>();
    let totalHours = 0;

    for (const item of week.items) {
      totalHours += Math.ceil(Number(item.hours_worked) || 0);
      const source = item.ai_summary || item.custom_tasks || item.tasks_selected.join(', ');
      source
        .split('\n')
        .map((line) => line.replace(/^[•\-*]\s*/, '').trim())
        .filter(Boolean)
        .forEach((line) => bulletSet.add(line));
    }

    const bullets = Array.from(bulletSet)
      .slice(0, 6)
      .map((line) => `• ${line}`)
      .join('\n');

    return {
      weekStart: week.start,
      weekEnd: week.end,
      dateRangeLabel: week.label,
      weeklyAccomplishments: bullets || '• Completed assigned weekly internship deliverables.',
      totalHours: Math.ceil(totalHours),
    };
  });
}

export function computeAttendanceTotals(logs: AttendanceLog[], periodDates: string[]) {
  const periodSet = new Set(periodDates);
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const firstPeriodDate = [...periodSet].sort()[0] ?? '9999-12-31';

  let previousTotal = 0;
  let totalThisPeriod = 0;

  for (const log of sorted) {
    const hrs = Math.ceil(Number(log.hours_worked) || 0);
    if (periodSet.has(log.date)) {
      totalThisPeriod += hrs;
    } else if (log.date < firstPeriodDate) {
      previousTotal += hrs;
    }
  }

  const totalHoursServed = previousTotal + totalThisPeriod;

  return { previousTotal, totalThisPeriod, totalHoursServed };
}
