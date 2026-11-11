import { AttendanceLog, UserProfile } from '@/types/ojt';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const YEAR_MONTH_RE = /^\d{4}-\d{2}$/;

/**
 * Strips control characters, null bytes, and angle brackets to neutralize HTML/XSS/prompt control vectors.
 */
export function sanitizePlainText(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Preserves newlines for multi-line bullet lists while removing control chars and HTML brackets.
 */
export function sanitizeMultilineText(input: unknown, maxLength = 2000): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeIsoDate(input: unknown, fallback = ''): string {
  if (typeof input !== 'string') return fallback;
  const trimmed = input.trim();
  return ISO_DATE_RE.test(trimmed) ? trimmed : fallback;
}

export function sanitizeYearMonth(input: unknown, fallback = ''): string {
  if (typeof input !== 'string') return fallback;
  const trimmed = input.trim();
  return YEAR_MONTH_RE.test(trimmed) ? trimmed : fallback;
}

export function sanitizeProfilePayload(raw: Partial<UserProfile> | undefined): UserProfile {
  return {
    id: sanitizePlainText(raw?.id, 64),
    email: sanitizePlainText(raw?.email, 160),
    full_name: sanitizePlainText(raw?.full_name, 120),
    student_id: sanitizePlainText(raw?.student_id, 20),
    program: raw?.program === 'BSCS' ? 'BSCS' : 'BSIT',
    company_name: sanitizePlainText(raw?.company_name, 160),
    branch_department: sanitizePlainText(raw?.branch_department, 120),
    supervisor_name: sanitizePlainText(raw?.supervisor_name, 120),
    supervisor_position: sanitizePlainText(raw?.supervisor_position, 100),
    trainor_name: sanitizePlainText(raw?.trainor_name, 120),
    start_date: sanitizeIsoDate(raw?.start_date, ''),
    target_hours: Math.min(2000, Math.max(1, Math.round(Number(raw?.target_hours) || 500))),
    daily_start_time: sanitizePlainText(raw?.daily_start_time, 10) || '09:00',
    daily_end_time: sanitizePlainText(raw?.daily_end_time, 10) || '18:00',
    lunch_break_minutes: Math.min(180, Math.max(0, Math.round(Number(raw?.lunch_break_minutes) || 0))),
    auto_time_out: raw?.auto_time_out !== false,
    academic_term: sanitizePlainText(raw?.academic_term, 60) || 'TERM 2 AY 2025 - 2026',
  };
}

export function sanitizeLogsPayload(rawLogs: unknown): AttendanceLog[] {
  if (!Array.isArray(rawLogs)) return [];
  return rawLogs.slice(0, 400).flatMap((item): AttendanceLog[] => {
    if (!item || typeof item !== 'object') return [];
    const rec = item as Record<string, unknown>;
    const date = sanitizeIsoDate(rec.date);
    if (!date) return [];

    const tasks = Array.isArray(rec.tasks_selected)
      ? rec.tasks_selected.slice(0, 20).map((t) => sanitizePlainText(t, 120)).filter(Boolean)
      : [];

    return [
      {
        id: sanitizePlainText(rec.id, 64) || `log-${date}`,
        user_id: sanitizePlainText(rec.user_id, 64),
        date,
        time_in: typeof rec.time_in === 'string' ? sanitizePlainText(rec.time_in, 40) : null,
        time_out: typeof rec.time_out === 'string' ? sanitizePlainText(rec.time_out, 40) : null,
        hours_worked: Math.min(24, Math.max(0, Math.ceil(Number(rec.hours_worked) || 0))),
        tasks_selected: tasks,
        custom_tasks: sanitizeMultilineText(rec.custom_tasks, 600),
        ai_summary: sanitizeMultilineText(rec.ai_summary, 1500),
        ai_provider: sanitizePlainText(rec.ai_provider, 40),
      },
    ];
  });
}

