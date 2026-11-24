import type { AttendanceLog } from '../types/ojt';

export function isValidUuid(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

export interface OfflinePunchPayload {
  id?: string;
  date: string;
  time_in: string | null;
  time_out: string | null;
  hours_worked: number;
  tasks_selected: string[];
  custom_tasks: string;
  ai_summary: string;
  ai_provider?: string;
  originalDate?: string;
}

export interface OfflineQueueItem {
  id: string;
  user_id: string;
  internship_id?: string | null;
  action: 'time-in' | 'time-out' | 'save-log';
  payload: OfflinePunchPayload;
  queued_at: string;
  retry_count: number;
}

export const QUEUE_KEY_PREFIX = 'ojt_offline_attendance_queue_';
export const LOCAL_LOGS_PREFIX = 'ojt_local_attendance_logs_';

/**
 * Retrieve the current offline attendance punch queue for a specific user from localStorage.
 */
export function getOfflineQueue(userId: string): OfflineQueueItem[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY_PREFIX + userId);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse offline attendance queue from localStorage:', e);
    return [];
  }
}

/**
 * Persist the offline attendance punch queue for a user to localStorage.
 */
export function saveOfflineQueue(userId: string, queue: OfflineQueueItem[]): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(QUEUE_KEY_PREFIX + userId, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save offline attendance queue to localStorage:', e);
  }
}

/**
 * Append or coalesce an attendance punch into the user's offline FIFO queue.
 * If a queue item for the same date already exists, its fields are merged to avoid duplicate network calls.
 */
export function enqueueOfflinePunch(
  userId: string,
  item: Omit<OfflineQueueItem, 'id' | 'queued_at' | 'retry_count'>
): OfflineQueueItem {
  const queue = getOfflineQueue(userId);
  const existingIdx = queue.findIndex((q) => q.payload.date === item.payload.date);
  const newItem: OfflineQueueItem = {
    ...item,
    id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    queued_at: new Date().toISOString(),
    retry_count: 0,
  };

  let updatedQueue: OfflineQueueItem[];
  if (existingIdx >= 0) {
    const existing = queue[existingIdx];
    newItem.payload.time_in = item.payload.time_in || existing.payload.time_in;
    newItem.payload.id = existing.payload.id || item.payload.id;
    updatedQueue = queue.map((q, i) => (i === existingIdx ? newItem : q));
  } else {
    updatedQueue = [...queue, newItem];
  }

  saveOfflineQueue(userId, updatedQueue);
  return newItem;
}

/**
 * Remove an individual queue item after successful synchronization.
 */
export function removeOfflineQueueItem(userId: string, queueId: string): void {
  const queue = getOfflineQueue(userId);
  const updated = queue.filter((q) => q.id !== queueId);
  saveOfflineQueue(userId, updated);
}

/**
 * Clear the entire offline queue for a user.
 */
export function clearOfflineQueue(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.removeItem(QUEUE_KEY_PREFIX + userId);
  } catch (e) {
    console.error('Failed to clear offline queue:', e);
  }
}

/**
 * Retrieve local cached attendance logs for zero-latency instant mounting.
 */
export function getLocalAttendanceLogs(userId: string): AttendanceLog[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = localStorage.getItem(LOCAL_LOGS_PREFIX + userId);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read local attendance logs from localStorage:', e);
    return [];
  }
}

/**
 * Persist attendance logs cache locally for offline access.
 */
export function saveLocalAttendanceLogs(userId: string, logs: AttendanceLog[]): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(LOCAL_LOGS_PREFIX + userId, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save local attendance logs to localStorage:', e);
  }
}

/**
 * Process pending items in the offline queue and synchronize with Supabase.
 * Respects unique constraint on (user_id, date) and retries without internship_id if DB schema lacks it.
 */
export async function processOfflineQueue(
  userId: string,
  supabase: any,
  onItemSynced?: (syncedLog: AttendanceLog) => void
): Promise<{ successCount: number; failCount: number }> {
  if (typeof window === 'undefined' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return { successCount: 0, failCount: 0 };
  }

  const queue = getOfflineQueue(userId);
  if (queue.length === 0) return { successCount: 0, failCount: 0 };

  let successCount = 0;
  let failCount = 0;

  for (const item of queue) {
    try {
      const { payload } = item;

      // If user changed the date of an existing log, clean up the prior date record
      if (payload.originalDate && payload.originalDate !== payload.date) {
        try {
          await supabase
            .from('attendance_logs')
            .delete()
            .match({ user_id: userId, date: payload.originalDate });
        } catch (delErr) {
          console.warn('Failed to clean up prior date on sync:', delErr);
        }
      }

      const baseRecord: Record<string, any> = {
        user_id: userId,
        date: payload.date,
        time_in: payload.time_in,
        time_out: payload.time_out,
        hours_worked: payload.hours_worked,
        tasks_selected: payload.tasks_selected || [],
        custom_tasks: payload.custom_tasks || '',
        ai_summary: payload.ai_summary || '',
        ai_provider: payload.ai_provider || 'manual',
      };

      if (item.internship_id && isValidUuid(item.internship_id)) {
        baseRecord.internship_id = item.internship_id;
      }

      let { data, error } = await supabase
        .from('attendance_logs')
        .upsert(baseRecord, { onConflict: 'user_id,date' })
        .select()
        .single();

      // Retry without internship_id if upsert failed and internship_id was present
      if (error && baseRecord.internship_id) {
        console.warn('Upsert offline punch with internship_id failed, retrying without internship_id:', error);
        delete baseRecord.internship_id;
        const retry = await supabase
          .from('attendance_logs')
          .upsert(baseRecord, { onConflict: 'user_id,date' })
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error('Failed to sync offline punch to Supabase:', error);
        item.retry_count++;
        failCount++;
      } else if (data) {
        removeOfflineQueueItem(userId, item.id);
        successCount++;
        onItemSynced?.(data as AttendanceLog);
      } else {
        removeOfflineQueueItem(userId, item.id);
        successCount++;
        onItemSynced?.({
          ...baseRecord,
          id: payload.id || `synced_${payload.date}`,
        } as AttendanceLog);
      }
    } catch (err) {
      console.error('Exception syncing offline queue item:', err);
      item.retry_count++;
      failCount++;
    }
  }

  return { successCount, failCount };
}
