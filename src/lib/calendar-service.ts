import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { CalendarEntry } from '@/types/ojt';
import { isValidUuid } from '@/lib/internship-service';

const CALENDAR_STORAGE_BUCKET = 'calendar-images';
const DEMO_CALENDAR_KEY = 'ojt_demo_calendar_entries_v1';
export const LOCAL_CALENDAR_PREFIX = 'ojt_local_calendar_entries_';

export function getLocalCalendarEntries(userId: string): CalendarEntry[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_CALENDAR_PREFIX}${userId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse local calendar entries cache:', err);
    return [];
  }
}

export function saveLocalCalendarEntries(userId: string, entries: CalendarEntry[]): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(`${LOCAL_CALENDAR_PREFIX}${userId}`, JSON.stringify(entries));
  } catch (err) {
    console.warn('Failed to persist local calendar entries cache:', err);
  }
}

function isAuthError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const status = Number(error.status || 0);
  const msg = String(error.message || '').toLowerCase();
  return (
    code === 'PGRST301' ||
    status === 401 ||
    msg.includes('401') ||
    msg.includes('jwt') ||
    msg.includes('unauthorized') ||
    msg.includes('token expired')
  );
}

/**
 * Client-side canvas image compressor.
 * Downscales images to max 1600px width/height and compresses to 0.85 JPEG quality.
 */
export async function compressImage(file: File): Promise<Blob> {
  // If file is not an image or running on server/test without DOM
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let { width, height } = img;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            resolve(blob || file);
          },
          'image/jpeg',
          0.85
        );
      };

      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

/**
 * Fetch all calendar entries for a given user.
 */
export async function fetchCalendarEntries(
  userId: string,
  internshipId?: string | null
): Promise<CalendarEntry[]> {
  // If offline, return immediately from local storage cache
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const local = getLocalCalendarEntries(userId);
    if (internshipId) {
      return local.filter((e) => e.internship_id === internshipId);
    }
    return local;
  }

  if (isSupabaseConfigured() && isValidUuid(userId)) {
    try {
      const supabase = createClient();

      // Proactive session check: verify session validity before querying
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session || (session.expires_at && session.expires_at * 1000 - Date.now() < 60000)) {
          await supabase.auth.refreshSession();
        }
      } catch (authCheckErr) {
        console.warn('Proactive auth check failed:', authCheckErr);
      }

      let query = supabase
        .from('calendar_entries')
        .select('*')
        .eq('user_id', userId);

      if (internshipId && isValidUuid(internshipId)) {
        query = query.eq('internship_id', internshipId);
      }

      let { data, error } = await query.order('date', { ascending: false });

      // If 401 / PGRST301 error, attempt ONE session refresh and retry query
      if (error && isAuthError(error)) {
        console.warn('Received 401 Unauthorized from calendar_entries, attempting session refresh and retry...');
        try {
          const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
          if (!refreshErr && refreshData?.session) {
            let retryQuery = supabase
              .from('calendar_entries')
              .select('*')
              .eq('user_id', userId);
            if (internshipId && isValidUuid(internshipId)) {
              retryQuery = retryQuery.eq('internship_id', internshipId);
            }
            const retryRes = await retryQuery.order('date', { ascending: false });
            data = retryRes.data;
            error = retryRes.error;
          }
        } catch (refreshCatchErr) {
          console.warn('Session refresh retry attempt failed:', refreshCatchErr);
        }
      }

      if (error && internshipId && !isAuthError(error)) {
        console.warn('Calendar entries query with internship_id failed, falling back:', error);
        const fallback = await supabase
          .from('calendar_entries')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false });
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.warn('Gracefully handling calendar entries query error, falling back to local cache:', error.message || error);
        const local = getLocalCalendarEntries(userId);
        if (local.length > 0) {
          if (internshipId) {
            return local.filter((e) => e.internship_id === internshipId);
          }
          return local;
        }
        return [];
      }

      const results = (data as CalendarEntry[]) || [];
      // On successful network query, update local cache
      if (results.length > 0) {
        saveLocalCalendarEntries(userId, results);
      }
      return results;
    } catch (err) {
      console.warn('Unexpected error fetching calendar entries, falling back to local cache:', err);
      const local = getLocalCalendarEntries(userId);
      if (local.length > 0) {
        if (internshipId) {
          return local.filter((e) => e.internship_id === internshipId);
        }
        return local;
      }
      return [];
    }
  }

  // Demo mode fallback
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEMO_CALENDAR_KEY);
    const entries: CalendarEntry[] = raw ? JSON.parse(raw) : [];
    if (internshipId) {
      return entries.filter((e) => e.internship_id === internshipId);
    }
    return entries;
  } catch {
    return [];
  }
}

/**
 * Fetch a single calendar entry by user ID and date (YYYY-MM-DD).
 */
export async function fetchCalendarEntryByDate(
  userId: string,
  date: string,
  internshipId?: string | null
): Promise<CalendarEntry | null> {
  // If offline, check local cache first
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const local = getLocalCalendarEntries(userId);
    return local.find((e) => e.date === date && (!internshipId || e.internship_id === internshipId)) || null;
  }

  if (isSupabaseConfigured() && isValidUuid(userId)) {
    try {
      const supabase = createClient();

      // Proactive session check
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session || (session.expires_at && session.expires_at * 1000 - Date.now() < 60000)) {
          await supabase.auth.refreshSession();
        }
      } catch {}

      let query = supabase
        .from('calendar_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date);

      if (internshipId && isValidUuid(internshipId)) {
        query = query.eq('internship_id', internshipId);
      }

      let { data, error } = await query.maybeSingle();

      if (error && isAuthError(error)) {
        try {
          const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
          if (!refreshErr && refreshData?.session) {
            let retryQuery = supabase
              .from('calendar_entries')
              .select('*')
              .eq('user_id', userId)
              .eq('date', date);
            if (internshipId && isValidUuid(internshipId)) {
              retryQuery = retryQuery.eq('internship_id', internshipId);
            }
            const retryRes = await retryQuery.maybeSingle();
            data = retryRes.data;
            error = retryRes.error;
          }
        } catch {}
      }

      if (error && internshipId && !isAuthError(error)) {
        console.warn('Calendar single query with internship_id failed, retrying without filter:', error);
        const fallback = await supabase
          .from('calendar_entries')
          .select('*')
          .eq('user_id', userId)
          .eq('date', date)
          .maybeSingle();
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.warn('Error fetching calendar entry by date, falling back to local cache:', error.message || error);
        const local = getLocalCalendarEntries(userId);
        return local.find((e) => e.date === date && (!internshipId || e.internship_id === internshipId)) || null;
      }
      return (data as CalendarEntry) || null;
    } catch (err) {
      console.warn('Unexpected error fetching calendar entry by date, falling back to local cache:', err);
      const local = getLocalCalendarEntries(userId);
      return local.find((e) => e.date === date && (!internshipId || e.internship_id === internshipId)) || null;
    }
  }

  // Demo mode fallback
  const entries = await fetchCalendarEntries(userId, internshipId);
  return entries.find((e) => e.date === date) || null;
}

/**
 * Upload calendar activity image to Supabase Storage bucket 'calendar-images'.
 * Falls back to base64 Data URL in demo mode.
 */
export async function uploadCalendarImage(
  userId: string,
  date: string,
  file: File
): Promise<string> {
  const compressedBlob = await compressImage(file);

  if (isSupabaseConfigured() && isValidUuid(userId)) {
    const supabase = createClient();
    const timestamp = Date.now();
    const filePath = `${userId}/${date}_${timestamp}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(CALENDAR_STORAGE_BUCKET)
      .upload(filePath, compressedBlob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(CALENDAR_STORAGE_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  }

  // Demo mode: Return compressed base64 data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(compressedBlob);
  });
}

/**
 * Save or update calendar entry for a user and date.
 */
export async function saveCalendarEntry(
  userId: string,
  date: string,
  imageUrl: string,
  description = '',
  title = 'What did you work on?',
  internshipId?: string | null
): Promise<CalendarEntry> {
  const trimmedDesc = description.trim();
  const trimmedTitle = title.trim() || 'What did you work on?';

  // Optimistic local cache update for fast offline reactivity
  const existingLocal = getLocalCalendarEntries(userId);
  const optimisticLocalEntry: CalendarEntry = {
    id: `local-cal-${Date.now()}`,
    user_id: userId,
    internship_id: internshipId || null,
    date,
    image_url: imageUrl,
    title: trimmedTitle,
    description: trimmedDesc,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  saveLocalCalendarEntries(userId, [
    optimisticLocalEntry,
    ...existingLocal.filter((item) => item.date !== date),
  ]);

  if (isSupabaseConfigured() && isValidUuid(userId)) {
    const supabase = createClient();
    const payload: Record<string, any> = {
      user_id: userId,
      date,
      image_url: imageUrl,
      title: trimmedTitle,
      description: trimmedDesc,
    };
    if (internshipId && isValidUuid(internshipId)) {
      payload.internship_id = internshipId;
    }

    let { data, error } = await supabase
      .from('calendar_entries')
      .upsert(payload, { onConflict: 'user_id,date' })
      .select()
      .single();

    if (error && payload.internship_id) {
      console.warn('Calendar upsert with internship_id failed, retrying without internship_id:', error);
      delete payload.internship_id;
      const retry = await supabase
        .from('calendar_entries')
        .upsert(payload, { onConflict: 'user_id,date' })
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      throw new Error(`Failed to save calendar entry: ${error.message}`);
    }

    const saved = data as CalendarEntry;
    // Persist confirmed server record to local cache
    const currentLocal = getLocalCalendarEntries(userId);
    saveLocalCalendarEntries(userId, [
      saved,
      ...currentLocal.filter((item) => item.date !== date),
    ]);

    return saved;
  }

  // Demo mode fallback
  const existing = await fetchCalendarEntries(userId);
  const newEntry: CalendarEntry = {
    id: `demo-cal-${Date.now()}`,
    user_id: userId,
    internship_id: internshipId || null,
    date,
    image_url: imageUrl,
    title: trimmedTitle,
    description: trimmedDesc,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const filtered = existing.filter((item) => item.date !== date);
  const updated = [newEntry, ...filtered];

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(DEMO_CALENDAR_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage quota warning for calendar entries:', e);
    }
  }

  return newEntry;
}

/**
 * Delete a calendar entry and cleanup its storage image.
 */
export async function deleteCalendarEntry(
  userId: string,
  date: string,
  imageUrl?: string
): Promise<void> {
  // Optimistically remove from local cache
  const localList = getLocalCalendarEntries(userId);
  saveLocalCalendarEntries(
    userId,
    localList.filter((item) => item.date !== date)
  );

  if (isSupabaseConfigured() && isValidUuid(userId)) {
    const supabase = createClient();

    let fileUrlToDelete = imageUrl;
    if (!fileUrlToDelete) {
      try {
        const { data } = await supabase
          .from('calendar_entries')
          .select('image_url')
          .match({ user_id: userId, date })
          .maybeSingle();
        fileUrlToDelete = data?.image_url;
      } catch (e) {
        console.warn('Could not query calendar_entries image_url prior to deletion:', e);
      }
    }

    // 1. Delete database row
    const { error: dbError } = await supabase
      .from('calendar_entries')
      .delete()
      .match({ user_id: userId, date });

    if (dbError) {
      console.error('Error deleting calendar row:', dbError);
    }

    // 2. Delete storage file if path matches our bucket
    if (fileUrlToDelete && fileUrlToDelete.includes(`/${CALENDAR_STORAGE_BUCKET}/`)) {
      try {
        const parts = fileUrlToDelete.split(`/${CALENDAR_STORAGE_BUCKET}/`);
        if (parts[1]) {
          const objectPath = parts[1].split('?')[0];
          await supabase.storage.from(CALENDAR_STORAGE_BUCKET).remove([objectPath]);
        }
      } catch (storageErr) {
        console.warn('Failed to delete image object from storage:', storageErr);
      }
    }

    return;
  }

  // Demo mode fallback
  if (typeof window === 'undefined') return;
  try {
    const existing = await fetchCalendarEntries(userId);
    const updated = existing.filter((item) => item.date !== date);
    localStorage.setItem(DEMO_CALENDAR_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete demo calendar entry:', e);
  }
}
