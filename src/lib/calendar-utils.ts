/**
 * Calendar Utilities
 * Date matrix generation and formatting using native JavaScript Date.
 */

export interface CalendarDayCell {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * Returns number of days in a given month (1-31).
 * monthIndex is 0-indexed (0 = Jan, 11 = Dec).
 */
export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Returns day of week for the 1st day of month (0 = Sunday, 6 = Saturday).
 */
export function getFirstDayOfWeek(year: number, monthIndex: number): number {
  return new Date(year, monthIndex, 1).getDay();
}

/**
 * Formats year, monthIndex (0-11), and day (1-31) into 'YYYY-MM-DD'.
 */
export function formatDayDateString(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Returns today's date formatted as 'YYYY-MM-DD' in local time.
 */
export function getTodayDateString(): string {
  const now = new Date();
  return formatDayDateString(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Formats a month and year into display title, e.g. "September 2026".
 */
export function formatMonthYearTitle(year: number, monthIndex: number): string {
  const date = new Date(year, monthIndex, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Formats a 'YYYY-MM-DD' string into readable full date, e.g. "Wednesday, September 2, 2026".
 */
export function formatFullDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Builds the 7-column monthly grid array.
 * Sunday is column 0 (Su), Saturday is column 6 (Sa).
 * Returns cells for the current month padded with empty spacer cells or adjacent days.
 * To match the reference layout:
 * - Leading days before the 1st can be empty/padding slots.
 * - Days 1..N of current month.
 */
export function buildMonthGrid(year: number, monthIndex: number): (CalendarDayCell | null)[] {
  const todayStr = getTodayDateString();
  const firstDay = getFirstDayOfWeek(year, monthIndex); // 0 (Sun) to 6 (Sat)
  const totalDays = getDaysInMonth(year, monthIndex);

  const grid: (CalendarDayCell | null)[] = [];

  // Add leading empty slots for days before 1st of month
  for (let i = 0; i < firstDay; i++) {
    grid.push(null);
  }

  // Add all days of current month
  for (let day = 1; day <= totalDays; day++) {
    const dateStr = formatDayDateString(year, monthIndex, day);
    grid.push({
      date: dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  return grid;
}

export const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
