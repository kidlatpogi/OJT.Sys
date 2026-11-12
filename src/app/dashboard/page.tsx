'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, Clock, FileText, ListChecks, UserCog } from 'lucide-react';
import ShapeGrid from '@/components/ShapeGrid';
import BrandMark from '@/components/BrandMark';
import PunchClockCard from '@/components/dashboard/PunchClockCard';

const TabSkeleton = () => (
  <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-8 text-center font-mono text-xs text-slate-400">
    Loading view...
  </div>
);

const LogsTab = dynamic(() => import('@/components/dashboard/LogsTab'), {
  loading: TabSkeleton,
});
const ReportsTab = dynamic(() => import('@/components/dashboard/ReportsTab'), {
  loading: TabSkeleton,
});
const ChecklistTab = dynamic(() => import('@/components/dashboard/ChecklistTab'), {
  loading: TabSkeleton,
});
const ProfileTab = dynamic(() => import('@/components/dashboard/ProfileTab'), {
  loading: TabSkeleton,
});
const InternshipSetupModal = dynamic(
  () => import('@/components/dashboard/InternshipSetupModal')
);
import { AttendanceLog, UserProfile } from '@/types/ojt';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  DEFAULT_DEMO_PROFILE,
  getDemoSession,
  loadDemoLogs,
  loadDemoProfile,
  saveDemoLogs,
  saveDemoProfile,
  setDemoSession,
} from '@/lib/storage';
import { formatHoursWhole, getTodayDateString } from '@/lib/ojt-calculations';

type TabKey = 'clock' | 'logs' | 'reports' | 'checklist' | 'profile';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('clock');
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_DEMO_PROFILE);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'supabase' | 'demo'>('demo');

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

        if (profData) {
          setProfile({
            ...DEFAULT_DEMO_PROFILE,
            ...profData,
            email: user.email,
            company_name: profData.company_name || '',
            supervisor_name: profData.supervisor_name || '',
          });
        } else {
          setProfile({
            ...DEFAULT_DEMO_PROFILE,
            id: user.id,
            email: user.email,
            full_name: (user.user_metadata?.full_name as string) || 'OJT Trainee',
            student_id: (user.user_metadata?.student_id as string) || '',
            program: (user.user_metadata?.program as string) || 'BSIT',
            company_name: (user.user_metadata?.company_name as string) || '',
            supervisor_name: (user.user_metadata?.supervisor_name as string) || '',
          });
        }

        const { data: logData } = await supabase
          .from('attendance_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        setLogs((logData as AttendanceLog[]) || []);
        setLoading(false);
        return;
      }

      // Demo localStorage fallback
      const session = getDemoSession();
      const loadedProf = loadDemoProfile();
      if (session?.email && loadedProf.email !== session.email) {
        loadedProf.email = session.email;
      }
      setProfile(loadedProf);
      setLogs(loadDemoLogs());
      setMode('demo');
      setLoading(false);
    };

    init();
  }, [router, supabaseReady]);

  const totalHoursServed = useMemo(
    () => logs.reduce((acc, item) => acc + Math.round(Number(item.hours_worked) || 0), 0),
    [logs]
  );

  const progressPct = Math.min(
    100,
    Math.round((totalHoursServed / Math.max(1, profile.target_hours || 500)) * 100)
  );

  const todayLog = useMemo(
    () => logs.find((l) => l.date === getTodayDateString()) || null,
    [logs]
  );

  const needsOnboarding = !loading && !profile.company_name?.trim();

  const handleSaveLog = async (
    payload: Omit<AttendanceLog, 'id' | 'user_id'> & { id?: string }
  ) => {
    if (mode === 'supabase') {
      const supabase = createClient();
      const record = {
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

      const { data, error } = await supabase
        .from('attendance_logs')
        .upsert(record, { onConflict: 'user_id,date' })
        .select()
        .single();

      if (!error && data) {
        setLogs((prev) => {
          const filtered = prev.filter((l) => l.date !== data.date);
          return [data as AttendanceLog, ...filtered];
        });
      }
      return;
    }

    // Demo persistence
    setLogs((prev) => {
      const existing = prev.find((l) => l.id === payload.id || l.date === payload.date);
      const nextLog: AttendanceLog = {
        id: existing?.id || `log-${Date.now()}`,
        user_id: profile.id,
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
  };

  const handleDeleteLog = async (id: string) => {
    if (mode === 'supabase') {
      const supabase = createClient();
      await supabase.from('attendance_logs').delete().eq('id', id);
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
    if (mode === 'supabase') {
      const supabase = createClient();
      const baseRecord = {
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
      const { error } = await supabase.from('profiles').upsert({
        ...baseRecord,
        auto_time_out: updated.auto_time_out !== false,
      });
      if (error) {
        // Fallback if auto_time_out column has not been added yet
        await supabase.from('profiles').upsert(baseRecord);
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

      {/* Top Sticky Header */}
      <header className="no-print sticky top-0 z-30 bg-[#f8f8f8]/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 safe-top">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <BrandMark href="/dashboard" onClick={() => setActiveTab('clock')} />

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
      <main className="relative z-10 max-w-4xl mx-auto px-4 pt-4 sm:pt-6 space-y-4">
        {/* Compact Cumulative OJT Hours Progress Strip */}
        <section className="no-print bg-white border-2 border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-bold truncate">
                {profile.full_name}
                {profile.company_name ? ` · ${profile.company_name}` : ''}
              </p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-clash-semibold text-2xl sm:text-3xl font-bold text-[#C44900]">
                  {formatHoursWhole(totalHoursServed)}
                </span>
                <span className="font-mono text-xs text-slate-500">
                  / {profile.target_hours}h ({progressPct}%)
                </span>
              </div>
            </div>

            <span className="font-mono text-[11px] px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 font-semibold shrink-0">
              {Math.max(0, profile.target_hours - totalHoursServed)}h left
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-[#C44900] rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </section>

        {loading ? (
          <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-8 text-center font-mono text-xs text-slate-500">
            Loading OJT Workspace...
          </div>
        ) : (
          <>
            <div className={activeTab === 'clock' ? 'block' : 'hidden'}>
              <PunchClockCard
                profile={profile}
                todayLog={todayLog}
                onSaveLog={handleSaveLog}
              />
            </div>
            {activeTab === 'logs' && (
              <LogsTab
                profile={profile}
                logs={logs}
                onSaveLog={handleSaveLog}
                onDeleteLog={handleDeleteLog}
              />
            )}
            {activeTab === 'reports' && <ReportsTab profile={profile} logs={logs} />}
            {activeTab === 'checklist' && <ChecklistTab userId={profile.id} />}
            {activeTab === 'profile' && (
              <ProfileTab
                profile={profile}
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
          profile={profile}
          onComplete={handleSaveProfile}
        />
      )}

      {/* Mobile Sticky Bottom Tab Bar */}
      <nav
        aria-label="Mobile navigation"
        className="no-print sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 pt-2 safe-bottom"
      >
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          {navItems.map((item) => {
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`py-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                  active ? 'text-[#C44900] bg-[#C44900]/8' : 'text-slate-500'
                }`}
              >
                {item.icon}
                <span className="font-mono text-[9.5px] font-bold uppercase tracking-tight">
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
