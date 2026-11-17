import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { CalendarEntry } from '@/types/ojt';

const CALENDAR_STORAGE_BUCKET = 'calendar-images';
const DEMO_CALENDAR_KEY = 'ojt_demo_calendar_entries_v1';

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
export async function fetchCalendarEntries(userId: string): Promise<CalendarEntry[]> {
  if (isSupabaseConfigured() && userId && userId !== 'demo-trainee-001') {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('calendar_entries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching calendar entries from Supabase:', error);
        return [];
      }
      return (data as CalendarEntry[]) || [];
    } catch (err) {
      console.error('Unexpected error fetching calendar entries:', err);
      return [];
    }
  }

  // Demo mode fallback
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DEMO_CALENDAR_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Fetch a single calendar entry by user ID and date (YYYY-MM-DD).
 */
export async function fetchCalendarEntryByDate(
  userId: string,
  date: string
): Promise<CalendarEntry | null> {
  if (isSupabaseConfigured() && userId && userId !== 'demo-trainee-001') {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('calendar_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

      if (error) {
        console.error('Error fetching calendar entry by date:', error);
        return null;
      }
      return (data as CalendarEntry) || null;
    } catch (err) {
      console.error('Unexpected error fetching calendar entry by date:', err);
      return null;
    }
  }

  // Demo mode fallback
  const entries = await fetchCalendarEntries(userId);
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

  if (isSupabaseConfigured() && userId && userId !== 'demo-trainee-001') {
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
  title = 'What did you work on?'
): Promise<CalendarEntry> {
  const trimmedDesc = description.trim();
  const trimmedTitle = title.trim() || 'What did you work on?';

  if (isSupabaseConfigured() && userId && userId !== 'demo-trainee-001') {
    const supabase = createClient();
    const payload = {
      user_id: userId,
      date,
      image_url: imageUrl,
      title: trimmedTitle,
      description: trimmedDesc,
    };

    const { data, error } = await supabase
      .from('calendar_entries')
      .upsert(payload, { onConflict: 'user_id,date' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save calendar entry: ${error.message}`);
    }

    return data as CalendarEntry;
  }

  // Demo mode fallback
  const existing = await fetchCalendarEntries(userId);
  const newEntry: CalendarEntry = {
    id: `demo-cal-${Date.now()}`,
    user_id: userId,
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
  if (isSupabaseConfigured() && userId && userId !== 'demo-trainee-001') {
    const supabase = createClient();

    // 1. Delete database row
    const { error: dbError } = await supabase
      .from('calendar_entries')
      .delete()
      .match({ user_id: userId, date });

    if (dbError) {
      console.error('Error deleting calendar row:', dbError);
    }

    // 2. Delete storage file if path matches our bucket
    if (imageUrl && imageUrl.includes(`/${CALENDAR_STORAGE_BUCKET}/`)) {
      try {
        const parts = imageUrl.split(`/${CALENDAR_STORAGE_BUCKET}/`);
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
