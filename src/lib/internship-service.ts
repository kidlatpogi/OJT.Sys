import { ChecklistItem, Internship, PRESET_OJT_TASKS } from '@/types/ojt';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

const DEMO_INTERNSHIPS_KEY = 'ojt_demo_internships_v1';
const DEMO_ACTIVE_INTERNSHIP_ID_KEY = 'ojt_demo_active_internship_id_v1';
const DEMO_CHECKLIST_KEY_PREFIX = 'ojt_work_checklist_';

export function getInitialDemoInternship(userId: string): Internship {
  return {
    id: 'demo-internship-001',
    user_id: userId || 'demo-trainee-001',
    title: 'Internship 1 (Tech Innovations Inc.)',
    company_name: 'Tech Innovations Inc.',
    branch_department: 'Software Engineering Dept.',
    supervisor_name: 'Engr. Maria Clara Santos',
    supervisor_position: 'Senior Engineering Lead',
    trainor_name: 'Mark Anthony Reyes',
    start_date: '2026-08-03',
    target_hours: 500,
    daily_start_time: '09:00',
    daily_end_time: '18:00',
    lunch_break_minutes: 0,
    auto_time_out: true,
    document_checklist: [],
    academic_term: 'TERM 2 AY 2025 - 2026',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function loadDemoInternships(userId: string): Internship[] {
  if (typeof window === 'undefined') return [getInitialDemoInternship(userId)];
  try {
    const raw = localStorage.getItem(DEMO_INTERNSHIPS_KEY);
    if (!raw) {
      const initial = [getInitialDemoInternship(userId)];
      localStorage.setItem(DEMO_INTERNSHIPS_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : [getInitialDemoInternship(userId)];
  } catch {
    return [getInitialDemoInternship(userId)];
  }
}

export function saveDemoInternships(internships: Internship[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_INTERNSHIPS_KEY, JSON.stringify(internships));
}

export function loadDemoActiveInternshipId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DEMO_ACTIVE_INTERNSHIP_ID_KEY);
}

export function saveDemoActiveInternshipId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_ACTIVE_INTERNSHIP_ID_KEY, id);
}

export async function fetchUserInternships(
  userId: string,
  isDemo = false
): Promise<Internship[]> {
  if (isDemo || !isSupabaseConfigured()) {
    return loadDemoInternships(userId);
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('internships')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      // Graceful fallback if table does not exist or empty
      return loadDemoInternships(userId);
    }

    return data as Internship[];
  } catch (err) {
    console.error('Error fetching user internships:', err);
    return loadDemoInternships(userId);
  }
}

export async function createInternshipRecord(
  payload: Partial<Internship> & { user_id: string; title: string; company_name: string },
  isDemo = false
): Promise<Internship> {
  const newRecord: Internship = {
    id: payload.id || `internship-${Date.now()}`,
    user_id: payload.user_id,
    title: payload.title,
    company_name: payload.company_name,
    branch_department: payload.branch_department || '',
    supervisor_name: payload.supervisor_name || '',
    supervisor_position: payload.supervisor_position || '',
    trainor_name: payload.trainor_name || '',
    start_date: payload.start_date || new Date().toISOString().slice(0, 10),
    target_hours: Number(payload.target_hours) || 500,
    daily_start_time: payload.daily_start_time || '09:00',
    daily_end_time: payload.daily_end_time || '18:00',
    lunch_break_minutes: payload.lunch_break_minutes ?? 0,
    auto_time_out: payload.auto_time_out !== false,
    document_checklist: payload.document_checklist || [],
    academic_term: payload.academic_term || 'TERM 2 AY 2025 - 2026',
    status: payload.status || 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isDemo || !isSupabaseConfigured()) {
    const current = loadDemoInternships(payload.user_id);
    const updated = [...current, newRecord];
    saveDemoInternships(updated);
    saveDemoActiveInternshipId(newRecord.id);
    return newRecord;
  }

  try {
    const supabase = createClient();
    const dbPayload = {
      user_id: newRecord.user_id,
      title: newRecord.title,
      company_name: newRecord.company_name,
      branch_department: newRecord.branch_department,
      supervisor_name: newRecord.supervisor_name,
      supervisor_position: newRecord.supervisor_position,
      trainor_name: newRecord.trainor_name,
      start_date: newRecord.start_date || null,
      target_hours: newRecord.target_hours,
      daily_start_time: newRecord.daily_start_time,
      daily_end_time: newRecord.daily_end_time,
      lunch_break_minutes: newRecord.lunch_break_minutes,
      auto_time_out: newRecord.auto_time_out,
      document_checklist: newRecord.document_checklist,
      academic_term: newRecord.academic_term,
      status: newRecord.status,
    };

    const { data, error } = await supabase
      .from('internships')
      .insert(dbPayload)
      .select()
      .single();

    if (error || !data) {
      console.warn('Supabase internship insert failed, falling back to local:', error);
      const current = loadDemoInternships(payload.user_id);
      const updated = [...current, newRecord];
      saveDemoInternships(updated);
      saveDemoActiveInternshipId(newRecord.id);
      return newRecord;
    }

    const created = data as Internship;
    // Set active_internship_id on profiles
    await supabase
      .from('profiles')
      .update({ active_internship_id: created.id })
      .eq('id', newRecord.user_id);

    return created;
  } catch (err) {
    console.error('Exception creating internship:', err);
    return newRecord;
  }
}

export async function updateInternshipRecord(
  id: string,
  userId: string,
  updates: Partial<Internship>,
  isDemo = false
): Promise<Internship | null> {
  if (isDemo || !isSupabaseConfigured()) {
    const current = loadDemoInternships(userId);
    const idx = current.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const updatedRecord = { ...current[idx], ...updates, updated_at: new Date().toISOString() };
    current[idx] = updatedRecord;
    saveDemoInternships(current);
    return updatedRecord;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('internships')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('Failed to update remote internship, falling back to local:', error);
      return null;
    }

    return data as Internship;
  } catch (err) {
    console.error('Exception updating internship:', err);
    return null;
  }
}

export async function setActiveInternshipRecord(
  userId: string,
  internshipId: string,
  isDemo = false
): Promise<void> {
  if (isDemo || !isSupabaseConfigured()) {
    saveDemoActiveInternshipId(internshipId);
    return;
  }

  try {
    const supabase = createClient();
    await supabase
      .from('profiles')
      .update({ active_internship_id: internshipId })
      .eq('id', userId);
  } catch (err) {
    console.error('Exception setting active internship:', err);
    saveDemoActiveInternshipId(internshipId);
  }
}

export async function saveWorkChecklist(
  userId: string,
  checklist: ChecklistItem[],
  isDemo = false
): Promise<void> {
  // Always update local cache
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${DEMO_CHECKLIST_KEY_PREFIX}${userId}`, JSON.stringify(checklist));
  }

  if (isDemo || !isSupabaseConfigured()) {
    return;
  }

  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ work_checklist: checklist })
      .eq('id', userId);

    if (error) {
      console.warn('Failed to save work_checklist to Supabase:', error);
    }
  } catch (err) {
    console.error('Exception saving work_checklist:', err);
  }
}

export function loadLocalWorkChecklist(userId: string): ChecklistItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${DEMO_CHECKLIST_KEY_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export async function deleteInternshipRecord(
  internshipId: string,
  userId: string,
  isDemo = false
): Promise<boolean> {
  if (typeof window !== 'undefined') {
    const current = loadDemoInternships(userId);
    const updated = current.filter((i) => i.id !== internshipId);
    saveDemoInternships(updated);

    const activeId = loadDemoActiveInternshipId();
    if (activeId === internshipId) {
      if (updated.length > 0) {
        saveDemoActiveInternshipId(updated[0].id);
      } else {
        localStorage.removeItem(DEMO_ACTIVE_INTERNSHIP_ID_KEY);
      }
    }
  }

  if (isDemo || !isSupabaseConfigured()) {
    return true;
  }

  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('internships')
      .delete()
      .eq('id', internshipId)
      .eq('user_id', userId);

    if (error) {
      console.warn('Failed to delete remote internship:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception deleting internship:', err);
    return false;
  }
}
