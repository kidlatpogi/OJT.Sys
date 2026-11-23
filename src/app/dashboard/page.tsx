'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  ClipboardCheck,
  Clock,
  FileText,
  ListChecks,
  UserCog,
} from 'lucide-react';
import ShapeGrid from '@/components/ShapeGrid';
import BrandMark from '@/components/BrandMark';
import PunchClockCard from '@/components/dashboard/PunchClockCard';
import InternshipSelector from '@/components/dashboard/InternshipSelector';
import ConfirmModal from '@/components/ConfirmModal';
import ProtectedDeleteModal from '@/components/dashboard/ProtectedDeleteModal';
import { DashboardSkeleton, TabContentSkeleton } from '@/components/dashboard/DashboardSkeleton';
import WhatsNewBanner from '@/components/WhatsNewBanner';

const CalendarTab = dynamic(() => import('@/components/dashboard/CalendarTab'), {
  loading: () => <TabContentSkeleton label="Calendar" />,
});
const LogsTab = dynamic(() => import('@/components/dashboard/LogsTab'), {
  loading: () => <TabContentSkeleton label="Logs" />,
});
const ReportsTab = dynamic(() => import('@/components/dashboard/ReportsTab'), {
  loading: () => <TabContentSkeleton label="Reports" />,
});
const ChecklistTab = dynamic(() => import('@/components/dashboard/ChecklistTab'), {
  loading: () => <TabContentSkeleton label="Checklist" />,
});
const ProfileTab = dynamic(() => import('@/components/dashboard/ProfileTab'), {
  loading: () => <TabContentSkeleton label="Profile" />,
});
const InternshipSetupModal = dynamic(
  () => import('@/components/dashboard/InternshipSetupModal')
);
import { AttendanceLog, CalendarEntry, ChecklistItem, Internship, UserProfile } from '@/types/ojt';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { deleteCalendarEntry, fetchCalendarEntries } from '@/lib/calendar-service';
import {
  DEFAULT_DEMO_PROFILE,
  getDemoSession,
  loadDemoLogs,
  loadDemoProfile,
  saveDemoLogs,
  saveDemoProfile,
  setDemoSession,
} from '@/lib/storage';
import {
  createInternshipRecord,
  deleteInternshipRecord,
  fetchUserInternships,
  getInitialDemoInternship,
  isValidUuid,
  loadDemoActiveInternshipId,
  loadDemoInternships,
  loadLocalWorkChecklist,
  saveWorkChecklist,
  setActiveInternshipRecord,
  updateInternshipRecord,
} from '@/lib/internship-service';
import { calculateShiftHours, formatHoursWhole, getTodayDateString } from '@/lib/ojt-calculations';

type TabKey = 'clock' | 'calendar' | 'logs' | 'reports' | 'checklist' | 'profile';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('clock');
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_DEMO_PROFILE);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [activeInternshipId, setActiveInternshipId] = useState<string | null>(null);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'supabase' | 'demo'>('demo');

  // Modals for multiple internships
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [showCreateInternshipModal, setShowCreateInternshipModal] = useState(false);
  const [editingInternship, setEditingInternship] = useState<Internship | null>(null);
  const [deletingInternship, setDeletingInternship] = useState<Internship | null>(null);
  const [isDeletingInternship, setIsDeletingInternship] = useState(false);

  const supabaseReady = isSupabaseConfigured();

  useEffect(() => {
    const init = async () => {
      if (supabaseReady) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        setMode('supabase');

        const { data: profData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        let loadedProfile: UserProfile;
        if (profData) {
          loadedProfile = {
            ...DEFAULT_DEMO_PROFILE,
            ...profData,
            email: user.email,
            company_name: profData.company_name || '',
            supervisor_name: profData.supervisor_name || '',
          };
        } else {
          loadedProfile = {
            ...DEFAULT_DEMO_PROFILE,
            id: user.id,
            email: user.email,
            full_name: (user.user_metadata?.full_name as string) || 'OJT Trainee',
            student_id: (user.user_metadata?.student_id as string) || '',
            program: (user.user_metadata?.program as string) || 'BSIT',
            company_name: (user.user_metadata?.company_name as string) || '',
            supervisor_name: (user.user_metadata?.supervisor_name as string) || '',
          };
        }

        // Restore local checklist if empty on remote
        const localChecklist = loadLocalWorkChecklist(user.id);
        if (localChecklist && (!loadedProfile.work_checklist || loadedProfile.work_checklist.length === 0)) {
          loadedProfile.work_checklist = localChecklist;
        }

        setProfile(loadedProfile);

        // Fetch user internships & logs in parallel
        const [userInternships, logRes, calData] = await Promise.all([
          fetchUserInternships(user.id),
          supabase
            .from('attendance_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false }),
          fetchCalendarEntries(user.id),
        ]);

        let resolvedInternships = userInternships;
        // If user already has company info but no internship row in database yet, create initial one
        if (resolvedInternships.length === 0 && loadedProfile.company_name?.trim()) {
          const initial = await createInternshipRecord({
            user_id: user.id,
            title: `Internship 1 (${loadedProfile.company_name})`,
            company_name: loadedProfile.company_name,
            branch_department: loadedProfile.branch_department || '',
            supervisor_name: loadedProfile.supervisor_name || '',
            supervisor_position: loadedProfile.supervisor_position || '',
            trainor_name: loadedProfile.trainor_name || '',
            start_date: loadedProfile.start_date || new Date().toISOString().slice(0, 10),
            target_hours: loadedProfile.target_hours || 500,
            daily_start_time: loadedProfile.daily_start_time || '09:00',
            daily_end_time: loadedProfile.daily_end_time || '18:00',
            lunch_break_minutes: loadedProfile.lunch_break_minutes || 0,
            auto_time_out: loadedProfile.auto_time_out !== false,
            academic_term: loadedProfile.academic_term || 'TERM 2 AY 2025 - 2026',
            status: 'active',
          });
          resolvedInternships = [initial];
        }

        setInternships(resolvedInternships);

        // Determine active internship id
        const resolvedActiveId =
          loadedProfile.active_internship_id &&
          resolvedInternships.some((i) => i.id === loadedProfile.active_internship_id)
            ? loadedProfile.active_internship_id
            : resolvedInternships[0]?.id || null;

        setActiveInternshipId(resolvedActiveId);

        setLogs((logRes.data as AttendanceLog[]) || []);
        setCalendarEntries(calData || []);
        setLoading(false);
        return;
      }

      // Demo localStorage fallback
      const session = getDemoSession();
      const loadedProf = loadDemoProfile();
      if (session?.email && loadedProf.email !== session.email) {
        loadedProf.email = session.email;
      }

      const localChecklist = loadLocalWorkChecklist(loadedProf.id);
      if (localChecklist && (!loadedProf.work_checklist || loadedProf.work_checklist.length === 0)) {
        loadedProf.work_checklist = localChecklist;
      }

      setProfile(loadedProf);

      const demoInternships = loadDemoInternships(loadedProf.id);
      setInternships(demoInternships);

      const demoActiveId = loadDemoActiveInternshipId();
      const resolvedActiveId =
        demoActiveId && demoInternships.some((i) => i.id === demoActiveId)
          ? demoActiveId
          : demoInternships[0]?.id || null;

      setActiveInternshipId(resolvedActiveId);

      const [demoLogsData, demoCalData] = await Promise.all([
        Promise.resolve(loadDemoLogs()),
        fetchCalendarEntries(loadedProf.id),
      ]);
      setLogs(demoLogsData);
      setCalendarEntries(demoCalData || []);
      setMode('demo');
      setLoading(false);
    };

    init();
  }, [router, supabaseReady]);

  // Active internship resolution
  const activeInternship = useMemo(
    () => internships.find((i) => i.id === activeInternshipId) || internships[0] || null,
    [internships, activeInternshipId]
  );

  // Effective profile overlay
  const effectiveProfile = useMemo(
    () => ({
      ...profile,
      ...(activeInternship
        ? {
            company_name: activeInternship.company_name,
            branch_department: activeInternship.branch_department,
            supervisor_name: activeInternship.supervisor_name,
            supervisor_position: activeInternship.supervisor_position,
            trainor_name: activeInternship.trainor_name,
            start_date: activeInternship.start_date,
            target_hours: activeInternship.target_hours,
            daily_start_time: activeInternship.daily_start_time,
            daily_end_time: activeInternship.daily_end_time,
            lunch_break_minutes: activeInternship.lunch_break_minutes,
            auto_time_out: activeInternship.auto_time_out,
            document_checklist: activeInternship.document_checklist || profile.document_checklist,
            academic_term: activeInternship.academic_term,
            active_internship_id: activeInternship.id,
          }
        : {}),
    }),
    [profile, activeInternship]
  );

  // Filter logs for active internship (Data Isolation)
  const activeLogs = useMemo(() => {
    if (!activeInternshipId) return logs;
    const firstInternship = internships[0];
    return logs.filter((l) => {
      if (l.internship_id) {
        return l.internship_id === activeInternshipId;
      }
      // If legacy log has no internship_id, treat it as belonging to the first internship
      return firstInternship ? firstInternship.id === activeInternshipId : true;
    });
  }, [logs, activeInternshipId, internships]);

  // Filter calendar entries for active internship
  const activeCalendarEntries = useMemo(() => {
    if (!activeInternshipId) return calendarEntries;
    const firstInternship = internships[0];
    return calendarEntries.filter((e) => {
      if (e.internship_id) {
        return e.internship_id === activeInternshipId;
      }
      return firstInternship ? firstInternship.id === activeInternshipId : true;
    });
  }, [calendarEntries, activeInternshipId, internships]);

  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    // Live ticker every 30 seconds to keep in-progress hours dynamically updated
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const todayLog = useMemo(
    () => activeLogs.find((l) => l.date === getTodayDateString()) || null,
    [activeLogs]
  );

  // Dynamic in-progress hours for current shift while timed in
  const liveInProgressHours = useMemo(() => {
    if (!todayLog?.time_in || todayLog?.time_out || !currentTime) return 0;
    return calculateShiftHours(
      todayLog.time_in,
      currentTime.toISOString(),
      effectiveProfile.lunch_break_minutes
    );
  }, [todayLog?.time_in, todayLog?.time_out, currentTime, effectiveProfile.lunch_break_minutes]);

  const totalHoursServed = useMemo(() => {
    const completedHours = activeLogs.reduce((acc, item) => {
      // If item is todayLog without time_out, item.hours_worked is 0
      return acc + Math.round(Number(item.hours_worked) || 0);
    }, 0);
    return completedHours + liveInProgressHours;
  }, [activeLogs, liveInProgressHours]);

  const progressPct = Math.min(
    100,
    Math.round((totalHoursServed / Math.max(1, effectiveProfile.target_hours || 500)) * 100)
  );

  const isCurrentInternshipIncomplete = useMemo(() => {
    if (!activeInternship) return false;
    return (
      totalHoursServed < (activeInternship.target_hours || 500) &&
      activeInternship.status !== 'completed'
    );
  }, [activeInternship, totalHoursServed]);

  const getInternshipHours = useCallback(
    (internshipId: string) => {
      const firstInternship = internships[0];
      const matched = logs.filter((l) => {
        if (l.internship_id) return l.internship_id === internshipId;
        return firstInternship ? firstInternship.id === internshipId : false;
      });
      const completed = matched.reduce((acc, item) => acc + Math.round(Number(item.hours_worked) || 0), 0);
      const isCurrentlyActive = (activeInternship?.id === internshipId) || (activeInternshipId === internshipId);
      return completed + (isCurrentlyActive ? liveInProgressHours : 0);
    },
    [internships, logs, activeInternship?.id, activeInternshipId, liveInProgressHours]
  );

  const needsOnboarding =
    !loading && (!profile.company_name?.trim() || internships.length === 0);

  const refreshCalendarEntries = useCallback(async () => {
    if (!profile.id) return;
    try {
      const data = await fetchCalendarEntries(profile.id);
      setCalendarEntries(data || []);
    } catch (e) {
      console.error('Failed to refresh calendar entries:', e);
    }
  }, [profile.id]);

  const handleSelectInternship = async (internshipId: string) => {
    setActiveInternshipId(internshipId);
    setProfile((prev) => ({ ...prev, active_internship_id: internshipId }));
    await setActiveInternshipRecord(profile.id, internshipId, mode === 'demo');
  };

  const handleRequestAddInternship = () => {
    if (isCurrentInternshipIncomplete) {
      setShowIncompleteWarning(true);
    } else {
      setShowCreateInternshipModal(true);
    }
  };

  const handleCreateInternship = async (newInternshipData: Partial<Internship>) => {
    const created = await createInternshipRecord(
      {
        ...newInternshipData,
        user_id: profile.id,
        title: newInternshipData.title || `Internship ${internships.length + 1}`,
        company_name: newInternshipData.company_name || '',
      },
      mode === 'demo'
    );

    setInternships((prev) => [...prev, created]);
    setActiveInternshipId(created.id);
    setProfile((prev) => ({
      ...prev,
      active_internship_id: created.id,
    }));
    setShowCreateInternshipModal(false);
  };

  const handleUpdateInternship = async (updatedData: Partial<Internship>) => {
    if (!editingInternship) return;
    const res = await updateInternshipRecord(
      editingInternship.id,
      profile.id,
      updatedData,
      mode === 'demo'
    );
    if (res) {
      setInternships((prev) =>
        prev.map((i) => (i.id === editingInternship.id ? res : i))
      );
      if (activeInternshipId === editingInternship.id) {
        setProfile((prev) => ({
          ...prev,
          company_name: res.company_name,
          branch_department: res.branch_department,
          supervisor_name: res.supervisor_name,
          supervisor_position: res.supervisor_position,
          trainor_name: res.trainor_name,
          target_hours: res.target_hours,
          daily_start_time: res.daily_start_time,
          daily_end_time: res.daily_end_time,
          lunch_break_minutes: res.lunch_break_minutes,
        }));
      }
    }
    setEditingInternship(null);
  };

  const handleConfirmedDeleteInternship = async (_password: string) => {
    if (!deletingInternship) return;
    setIsDeletingInternship(true);
    const targetId = deletingInternship.id;
    try {
      await deleteInternshipRecord(targetId, profile.id, mode === 'demo');

      const remaining = internships.filter((i) => i.id !== targetId);
      setInternships(remaining);

      // Cascade delete logs associated with this internship
      const remainingLogs = logs.filter((l) =>
        l.internship_id ? l.internship_id !== targetId : targetId !== internships[0]?.id
      );
      setLogs(remainingLogs);
      if (mode === 'demo') {
        saveDemoLogs(remainingLogs);
      }

      // Cascade delete calendar entries associated with this internship
      const remainingCalEntries = calendarEntries.filter((e) =>
        e.internship_id ? e.internship_id !== targetId : targetId !== internships[0]?.id
      );
      setCalendarEntries(remainingCalEntries);

      // Active selection switching
      if (activeInternshipId === targetId) {
        if (remaining.length > 0) {
          const nextActive = remaining[0].id;
          setActiveInternshipId(nextActive);
          setProfile((prev) => ({
            ...prev,
            active_internship_id: nextActive,
            company_name: remaining[0].company_name,
            branch_department: remaining[0].branch_department,
            supervisor_name: remaining[0].supervisor_name,
            supervisor_position: remaining[0].supervisor_position,
            trainor_name: remaining[0].trainor_name,
            target_hours: remaining[0].target_hours,
            daily_start_time: remaining[0].daily_start_time,
            daily_end_time: remaining[0].daily_end_time,
            lunch_break_minutes: remaining[0].lunch_break_minutes,
          }));
          await setActiveInternshipRecord(profile.id, nextActive, mode === 'demo');
        } else {
          setActiveInternshipId(null);
          setProfile((prev) => ({
            ...prev,
            active_internship_id: null,
            company_name: '',
          }));
        }
      }
      setDeletingInternship(null);
    } finally {
      setIsDeletingInternship(false);
    }
  };

  const handleUpdateChecklist = async (items: ChecklistItem[]) => {
    setProfile((prev) => ({ ...prev, work_checklist: items }));
    await saveWorkChecklist(profile.id, items, mode === 'demo');
  };

  const handleSaveLog = async (
    payload: Omit<AttendanceLog, 'id' | 'user_id'> & { id?: string }
  ) => {
    const currentInternshipId = activeInternship?.id || activeInternshipId || null;
    const validInternshipUuid = isValidUuid(currentInternshipId) ? currentInternshipId : null;

    if (mode === 'supabase') {
      const supabase = createClient();
      const baseRecord: Record<string, any> = {
        user_id: profile.id,
        date: payload.date,
        time_in: payload.time_in,
        time_out: payload.time_out,
        hours_worked: payload.hours_worked,
        tasks_selected: payload.tasks_selected,
        custom_tasks: payload.custom_tasks,
        ai_summary: payload.ai_summary,
        ai_provider: payload.ai_provider || 'manual',
      };

      const record: Record<string, any> = { ...baseRecord };
      if (validInternshipUuid) {
        record.internship_id = validInternshipUuid;
      }

      let { data, error } = await supabase
        .from('attendance_logs')
        .upsert(record, { onConflict: 'user_id,date' })
        .select()
        .single();

      // If upsert failed with internship_id, retry without internship_id
      if (error && record.internship_id) {
        console.warn('Upsert attendance log with internship_id failed, retrying without internship_id:', error);
        const retry = await supabase
          .from('attendance_logs')
          .upsert(baseRecord, { onConflict: 'user_id,date' })
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error('Error saving attendance log to Supabase:', error);
        // Resilient fallback to local state so user's time-in is NEVER blocked
        const fallbackLog: AttendanceLog = {
          id: payload.id || `local-log-${Date.now()}`,
          user_id: profile.id,
          internship_id: currentInternshipId,
          date: payload.date,
          time_in: payload.time_in,
          time_out: payload.time_out,
          hours_worked: payload.hours_worked,
          tasks_selected: payload.tasks_selected,
          custom_tasks: payload.custom_tasks,
          ai_summary: payload.ai_summary,
          ai_provider: payload.ai_provider,
        };
        setLogs((prev) => {
          const filtered = prev.filter((l) => l.date !== payload.date);
          return [fallbackLog, ...filtered];
        });
        refreshCalendarEntries();
        return;
      }

      if (data) {
        setLogs((prev) => {
          const filtered = prev.filter((l) => l.date !== data.date);
          return [data as AttendanceLog, ...filtered];
        });
        refreshCalendarEntries();
      }
      return;
    }

    // Demo persistence
    setLogs((prev) => {
      const existing = prev.find((l) => l.id === payload.id || l.date === payload.date);
      const nextLog: AttendanceLog = {
        id: existing?.id || `log-${Date.now()}`,
        user_id: profile.id,
        internship_id: currentInternshipId,
        date: payload.date,
        time_in: payload.time_in,
        time_out: payload.time_out,
        hours_worked: payload.hours_worked,
        tasks_selected: payload.tasks_selected,
        custom_tasks: payload.custom_tasks,
        ai_summary: payload.ai_summary,
        ai_provider: payload.ai_provider,
      };
      const updated = [nextLog, ...prev.filter((l) => l.date !== payload.date && l.id !== existing?.id)];
      saveDemoLogs(updated);
      return updated;
    });
    refreshCalendarEntries();
  };

  const handleDeleteLog = async (id: string) => {
    const targetLog = logs.find((l) => l.id === id);
    if (targetLog && profile.id) {
      const calEntry = calendarEntries.find((e) => e.date === targetLog.date);
      try {
        await deleteCalendarEntry(profile.id, targetLog.date, calEntry?.image_url);
        setCalendarEntries((prev) => prev.filter((e) => e.date !== targetLog.date));
      } catch (calErr) {
        console.error('Failed to delete calendar entry on log deletion:', calErr);
      }
    }

    if (mode === 'supabase') {
      if (isValidUuid(id)) {
        const supabase = createClient();
        await supabase.from('attendance_logs').delete().eq('id', id);
      }
      setLogs((prev) => prev.filter((l) => l.id !== id));
      return;
    }

    setLogs((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      saveDemoLogs(updated);
      return updated;
    });
  };

  const handleSaveProfile = async (updated: UserProfile) => {
    setProfile(updated);

    // Also synchronize current active internship record
    if (activeInternshipId) {
      const internshipUpdates = {
        company_name: updated.company_name,
        branch_department: updated.branch_department,
        supervisor_name: updated.supervisor_name,
        supervisor_position: updated.supervisor_position,
        trainor_name: updated.trainor_name,
        start_date: updated.start_date || new Date().toISOString().slice(0, 10),
        target_hours: updated.target_hours,
        daily_start_time: updated.daily_start_time,
        daily_end_time: updated.daily_end_time,
        lunch_break_minutes: updated.lunch_break_minutes,
        auto_time_out: updated.auto_time_out !== false,
        academic_term: updated.academic_term,
      };
      await updateInternshipRecord(
        activeInternshipId,
        updated.id,
        internshipUpdates,
        mode === 'demo'
      );
      setInternships((prev) =>
        prev.map((i) => (i.id === activeInternshipId ? { ...i, ...internshipUpdates } : i))
      );
    } else if (updated.company_name?.trim()) {
      // Create first internship if none existed
      const created = await createInternshipRecord(
        {
          user_id: updated.id,
          title: `Internship 1 (${updated.company_name})`,
          company_name: updated.company_name,
          branch_department: updated.branch_department,
          supervisor_name: updated.supervisor_name,
          supervisor_position: updated.supervisor_position,
          trainor_name: updated.trainor_name,
          start_date: updated.start_date,
          target_hours: updated.target_hours,
          daily_start_time: updated.daily_start_time,
          daily_end_time: updated.daily_end_time,
          lunch_break_minutes: updated.lunch_break_minutes,
          auto_time_out: updated.auto_time_out !== false,
          academic_term: updated.academic_term,
          status: 'active',
        },
        mode === 'demo'
      );
      setInternships([created]);
      setActiveInternshipId(created.id);
    }

    if (mode === 'supabase' && isValidUuid(updated.id)) {
      const supabase = createClient();
      const baseRecord: Record<string, any> = {
        id: updated.id,
        full_name: updated.full_name,
        student_id: updated.student_id,
        program: updated.program,
        company_name: updated.company_name,
        branch_department: updated.branch_department,
        supervisor_name: updated.supervisor_name,
        supervisor_position: updated.supervisor_position,
        trainor_name: updated.trainor_name,
        start_date: updated.start_date || null,
        target_hours: updated.target_hours,
        daily_start_time: updated.daily_start_time,
        daily_end_time: updated.daily_end_time,
        lunch_break_minutes: updated.lunch_break_minutes,
        academic_term: updated.academic_term,
      };

      const targetInternshipId = activeInternshipId || updated.active_internship_id;
      if (targetInternshipId && isValidUuid(targetInternshipId)) {
        baseRecord.active_internship_id = targetInternshipId;
      }

      let { error } = await supabase.from('profiles').upsert({
        ...baseRecord,
        auto_time_out: updated.auto_time_out !== false,
      });

      if (error) {
        // Fallback: strip optional columns if schema migration hasn't been applied yet
        const safeRecord = { ...baseRecord };
        delete safeRecord.active_internship_id;
        delete safeRecord.auto_time_out;
        await supabase.from('profiles').upsert(safeRecord);
      }
      return;
    }
    saveDemoProfile(updated);
  };

  const handleSignOut = async () => {
    if (mode === 'supabase') {
      const supabase = createClient();
      await supabase.auth.signOut();
    } else {
      setDemoSession(null);
    }
    router.push('/login');
  };

  const navItems: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'clock', label: 'Clock', icon: <Clock className="w-5 h-5" /> },
    { key: 'calendar', label: 'Calendar', icon: <CalendarDays className="w-5 h-5" /> },
    { key: 'logs', label: 'Logs', icon: <ListChecks className="w-5 h-5" /> },
    { key: 'reports', label: 'Reports', icon: <FileText className="w-5 h-5" /> },
    { key: 'checklist', label: 'Checklist', icon: <ClipboardCheck className="w-5 h-5" /> },
    { key: 'profile', label: 'Profile', icon: <UserCog className="w-5 h-5" /> },
  ];

  return (
    <div className="relative min-h-[100dvh] pb-24 sm:pb-12">
      <div className="no-print">
        <ShapeGrid />
      </div>

      {/* Top Sticky Header (hidden on mobile preview / Capacitor APK view per R1) */}
      <header className="no-print hidden sm:block sticky top-0 z-30 bg-[#f8f8f8]/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 safe-top">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandMark href="/dashboard" onClick={() => setActiveTab('clock')} />
            {internships.length > 0 && (
              <div className="hidden sm:flex items-center border-l border-slate-200 pl-3">
                <InternshipSelector
                  internships={internships}
                  activeInternshipId={activeInternshipId}
                  onSelectInternship={handleSelectInternship}
                  onAddNewInternship={handleRequestAddInternship}
                  onEditInternship={(i) => setEditingInternship(i)}
                  onDeleteInternship={(i) => setDeletingInternship(i)}
                  getInternshipHours={getInternshipHours}
                  variant="header"
                />
              </div>
            )}
          </div>

          {/* Desktop Navigation Pills */}
          <nav className="hidden sm:flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === item.key
                    ? 'bg-[#C44900] text-white'
                    : 'text-slate-600 hover:text-black'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-6 space-y-4">
        {/* Mobile Program Switcher (shown on mobile since header is hidden per R1) */}
        {internships.length > 0 && (
          <div className="sm:hidden">
            <InternshipSelector
              internships={internships}
              activeInternshipId={activeInternshipId}
              onSelectInternship={handleSelectInternship}
              onAddNewInternship={handleRequestAddInternship}
              onEditInternship={(i) => setEditingInternship(i)}
              onDeleteInternship={(i) => setDeletingInternship(i)}
              getInternshipHours={getInternshipHours}
              variant="mobile-strip"
            />
          </div>
        )}

        {/* Announcement / What's New Banner (dismissable, 1-time display) */}
        <WhatsNewBanner className="mb-2" />

        {/* Compact Cumulative OJT Hours Progress Strip */}
        <section className="no-print bg-white border-2 border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-bold truncate">
                {effectiveProfile.full_name}
                {effectiveProfile.company_name ? ` · ${effectiveProfile.company_name}` : ''}
              </p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-clash-semibold text-2xl sm:text-3xl font-bold text-[#C44900]">
                  {formatHoursWhole(totalHoursServed)}
                </span>
                <span className="font-mono text-xs text-slate-500">
                  / {effectiveProfile.target_hours}h ({progressPct}%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {todayLog?.time_in && !todayLog?.time_out && liveInProgressHours > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  +{liveInProgressHours}h active
                </span>
              )}
              <span className="font-mono text-[11px] px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 font-semibold shrink-0">
                {Math.max(0, effectiveProfile.target_hours - totalHoursServed)}h left
              </span>
            </div>
          </div>

          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-[#C44900] rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </section>

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <div className={activeTab === 'clock' ? 'block' : 'hidden'}>
              <PunchClockCard
                profile={effectiveProfile}
                todayLog={todayLog}
                onSaveLog={handleSaveLog}
                onCalendarUpdated={refreshCalendarEntries}
                onUpdateChecklist={handleUpdateChecklist}
              />
            </div>
            {activeTab === 'calendar' && (
              <CalendarTab
                profile={effectiveProfile}
                logs={activeLogs}
                calendarEntries={activeCalendarEntries}
                onCalendarUpdated={refreshCalendarEntries}
                onSaveLog={handleSaveLog}
                mode={mode}
              />
            )}
            {activeTab === 'logs' && (
              <LogsTab
                profile={effectiveProfile}
                logs={activeLogs}
                calendarEntries={activeCalendarEntries}
                onSaveLog={handleSaveLog}
                onDeleteLog={handleDeleteLog}
              />
            )}
            {activeTab === 'reports' && (
              <ReportsTab profile={effectiveProfile} logs={activeLogs} />
            )}
            {activeTab === 'checklist' && <ChecklistTab userId={effectiveProfile.id} />}
            {activeTab === 'profile' && (
              <ProfileTab
                profile={effectiveProfile}
                onSaveProfile={handleSaveProfile}
                onSignOut={handleSignOut}
              />
            )}
          </>
        )}
      </main>

      {/* First-Time Onboarding Modal (Step 2 shown after signup & first sign-in) */}
      {needsOnboarding && (
        <InternshipSetupModal
          profile={effectiveProfile}
          onComplete={handleSaveProfile}
        />
      )}

      {/* Warning Dialog when creating new internship while current is incomplete */}
      <ConfirmModal
        isOpen={showIncompleteWarning}
        title="Current Internship Incomplete"
        description={`You have completed only ${totalHoursServed} of ${effectiveProfile.target_hours} required hours (${Math.max(0, effectiveProfile.target_hours - totalHoursServed)}h remaining) for "${activeInternship?.title || effectiveProfile.company_name}". Are you sure you want to create a new internship record now?`}
        confirmLabel="Proceed to Create"
        cancelLabel="Stay on Current"
        variant="primary"
        onConfirm={() => {
          setShowIncompleteWarning(false);
          setShowCreateInternshipModal(true);
        }}
        onCancel={() => setShowIncompleteWarning(false)}
      />

      {/* Modal for Creating a New Internship Program */}
      {showCreateInternshipModal && (
        <InternshipSetupModal
          mode="create"
          defaultTitle={`Internship ${internships.length + 1}`}
          profile={effectiveProfile}
          onCreateInternship={handleCreateInternship}
          onClose={() => setShowCreateInternshipModal(false)}
        />
      )}

      {/* Modal for Editing an Internship Program */}
      {editingInternship && (
        <InternshipSetupModal
          mode="edit"
          initialData={editingInternship}
          profile={effectiveProfile}
          onUpdateInternship={handleUpdateInternship}
          onClose={() => setEditingInternship(null)}
        />
      )}

      {/* Modal for Password-Protected Internship Deletion */}
      <ProtectedDeleteModal
        isOpen={deletingInternship !== null}
        title="Delete Internship Program"
        targetLabel="Target Program:"
        targetValue={
          deletingInternship
            ? `${deletingInternship.title} (${deletingInternship.company_name})`
            : ''
        }
        description="Deleting this internship program will permanently delete all associated attendance logs and calendar entries. This action cannot be undone. Please confirm your identity with your account password."
        userEmail={profile.email}
        loading={isDeletingInternship}
        onConfirm={handleConfirmedDeleteInternship}
        onCancel={() => setDeletingInternship(null)}
      />

      {/* Mobile Sticky Bottom Tab Bar */}
      <nav
        aria-label="Mobile navigation"
        className="no-print sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1.5 pt-2 pb-1 safe-bottom"
      >
        <div className="grid grid-cols-6 gap-0.5 max-w-lg mx-auto">
          {navItems.map((item) => {
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`py-1.5 px-0.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                  active ? 'text-[#C44900] bg-[#C44900]/8' : 'text-slate-500'
                }`}
              >
                {item.icon}
                <span className="font-mono text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-tight truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
