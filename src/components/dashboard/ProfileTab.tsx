'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { LogOut, Save } from 'lucide-react';
import { UserProfile } from '@/types/ojt';
import ConfirmModal from '@/components/ConfirmModal';
import StandardProfileFields, {
  combineFullName,
  splitFullName,
  StandardProfileFormData,
} from '@/components/dashboard/StandardProfileFields';

interface ProfileTabProps {
  profile: UserProfile;
  onSaveProfile: (updated: UserProfile) => Promise<void>;
  onSignOut: () => Promise<void>;
  navLayout?: 'top' | 'rail';
}

const ProfileTab = React.memo(function ProfileTab({
  profile,
  onSaveProfile,
  onSignOut,
  navLayout = 'top',
}: ProfileTabProps) {
  const [formData, setFormData] = useState<StandardProfileFormData>(() => {
    const { firstName, lastName } = splitFullName(profile.full_name);
    return {
      firstName,
      lastName,
      studentId: profile.student_id || '',
      program: profile.program || 'BSIT',
      companyName: profile.company_name || '',
      branchDepartment: profile.branch_department || '',
      supervisorName: profile.supervisor_name || '',
      trainorName: profile.trainor_name || '',
      targetHours: profile.target_hours || 500,
      lunchBreakMinutes: profile.lunch_break_minutes ?? 0,
      dailyStartTime: (profile.daily_start_time || '09:00').slice(0, 5),
      dailyEndTime: (profile.daily_end_time || '18:00').slice(0, 5),
    };
  });
  const [autoTimeOut, setAutoTimeOut] = useState(profile.auto_time_out !== false);
  const [offlineSync, setOfflineSync] = useState(profile.offline_sync !== false);
  const [sideRailNav, setSideRailNav] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    try {
      setSideRailNav(localStorage.getItem('ojt_nav_layout') === 'rail');
    } catch {
      setSideRailNav(false);
    }
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleToggleSideRail = () => {
    if (isMobile) return;
    const next = !sideRailNav;
    setSideRailNav(next);
    try {
      localStorage.setItem('ojt_nav_layout', next ? 'rail' : 'top');
      setTimeout(() => {
        window.dispatchEvent(new Event('ojt_nav_layout_change'));
      }, 0);
    } catch (err) {
      console.warn('Failed to save nav layout preference:', err);
    }
  };

  useEffect(() => {
    const { firstName, lastName } = splitFullName(profile.full_name);
    setFormData({
      firstName,
      lastName,
      studentId: profile.student_id || '',
      program: profile.program || 'BSIT',
      companyName: profile.company_name || '',
      branchDepartment: profile.branch_department || '',
      supervisorName: profile.supervisor_name || '',
      trainorName: profile.trainor_name || '',
      targetHours: profile.target_hours || 500,
      lunchBreakMinutes: profile.lunch_break_minutes ?? 0,
      dailyStartTime: (profile.daily_start_time || '09:00').slice(0, 5),
      dailyEndTime: (profile.daily_end_time || '18:00').slice(0, 5),
    });
    setAutoTimeOut(profile.auto_time_out !== false);
    setOfflineSync(profile.offline_sync !== false);
  }, [profile]);

  const handleFieldChange = useCallback((field: keyof StandardProfileFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const updatedProfile: UserProfile = {
      ...profile,
      full_name: combineFullName(formData.firstName, formData.lastName),
      student_id: formData.studentId,
      program: formData.program,
      company_name: formData.companyName.trim(),
      branch_department: formData.branchDepartment.trim(),
      supervisor_name: formData.supervisorName.trim(),
      trainor_name: formData.trainorName.trim(),
      target_hours: Number(formData.targetHours) || 500,
      lunch_break_minutes: Number(formData.lunchBreakMinutes) || 0,
      daily_start_time: formData.dailyStartTime,
      daily_end_time: formData.dailyEndTime,
      auto_time_out: autoTimeOut,
      offline_sync: offlineSync,
    };
    await onSaveProfile(updatedProfile);
    setSaving(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2400);
  };

  return (
    <div className="space-y-6 pb-36 sm:pb-36 lg:pb-6 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] lg:pb-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#C44900] font-bold">
            Account &amp; Internship Settings
          </span>
          <h2 className="font-clash-semibold text-2xl sm:text-3xl font-bold text-black mt-0.5">
            Trainee Profile
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setConfirmSignOut(true)}
          className={`h-10 px-4 rounded-xl border-2 border-slate-200 hover:border-red-500 hover:text-red-600 font-mono text-xs font-bold text-slate-700 inline-flex items-center gap-2 cursor-pointer transition-colors self-start sm:self-auto ${
            navLayout === 'rail' ? 'sm:hidden' : ''
          }`}
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Profile Fields: Sectioned into Academic, Company & Shift Cards */}
        <StandardProfileFields formData={formData} onChange={handleFieldChange} />

        {/* SECTION 4: Shift Automation & Preferences Card */}
        <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 sm:p-7 space-y-4 shadow-xs">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="font-clash-semibold text-base sm:text-lg font-bold text-slate-900">
              Shift Automation &amp; Preferences
            </h3>
            <p className="font-mono text-[10.5px] text-slate-500 uppercase tracking-wider mt-0.5">
              Hands-Free Daily Attendance Processing
            </p>
          </div>

          {/* Toggle Switch Row with Info button */}
          <div className="flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border-2 border-slate-200/90 bg-slate-50/70 hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-sans text-sm font-bold text-slate-900">
                Enable Auto Time-Out at Shift End
              </span>

              {/* Active / Disabled badge: Placed directly after label */}
              <span
                className={`font-mono text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                  autoTimeOut
                    ? 'bg-orange-50 text-[#C44900] border border-[#C44900]/40'
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}
              >
                {autoTimeOut ? 'Active' : 'Disabled'}
              </span>

              {/* Info "i" Hover Tooltip: Placed to the right side of the Active / Disabled badge */}
              <div className="relative group inline-flex items-center">
                <button
                  type="button"
                  tabIndex={0}
                  aria-label="What is Auto Time-Out?"
                  title="Automatically clocks you out when your scheduled shift end time arrives, only if at least one task under 'What did you work on?' is checked. Hours round up to whole numbers (e.g. 9h)."
                  className="w-5 h-5 rounded-full border border-slate-300 bg-white hover:border-[#C44900] hover:text-[#C44900] text-slate-500 flex items-center justify-center font-mono text-[11px] font-bold cursor-help transition-colors"
                >
                  i
                </button>
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 max-w-[85vw] p-2.5 bg-slate-900 text-white rounded-xl shadow-xl font-mono text-[10.5px] leading-relaxed opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50">
                  Automatically clocks you out when your scheduled shift end time arrives, only if at least one task under &ldquo;What did you work on?&rdquo; is checked. Hours round up to whole numbers (e.g. 9h).
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                </div>
              </div>
            </div>

            {/* Toggle Switch Button */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                role="switch"
                aria-checked={autoTimeOut}
                aria-label="Enable Auto Time-Out at Shift End"
                onClick={() => setAutoTimeOut((prev) => !prev)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#C44900] focus:ring-offset-2 ${
                  autoTimeOut ? 'bg-[#C44900]' : 'bg-slate-300'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    autoTimeOut ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Toggle Switch Row 2: Local Save and Cloud Sync */}
          <div className="flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border-2 border-slate-200/90 bg-slate-50/70 hover:border-slate-300 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-sans text-sm font-bold text-slate-900">
                  Local Save and Cloud Sync
                </span>

                {/* Active / Disabled badge: Placed directly after label */}
                <span
                  className={`font-mono text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    offlineSync
                      ? 'bg-orange-50 text-[#C44900] border border-[#C44900]/40'
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}
                >
                  {offlineSync ? 'Active' : 'Disabled'}
                </span>

                {/* Info "i" Hover Tooltip */}
                <div className="relative group inline-flex items-center">
                  <button
                    type="button"
                    tabIndex={0}
                    aria-label="What is Local Save and Cloud Sync?"
                    title="Stores your attendance punches locally with 0ms latency for seamless offline attendance, then automatically synchronizes with Supabase cloud when your connection is restored."
                    className="w-5 h-5 rounded-full border border-slate-300 bg-white hover:border-[#C44900] hover:text-[#C44900] text-slate-500 flex items-center justify-center font-mono text-[11px] font-bold cursor-help transition-colors"
                  >
                    i
                  </button>
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 max-w-[85vw] p-2.5 bg-slate-900 text-white rounded-xl shadow-xl font-mono text-[10.5px] leading-relaxed opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50">
                    Stores your attendance punches locally with 0ms latency for seamless offline attendance, then automatically synchronizes with Supabase cloud when your connection is restored.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                  </div>
                </div>
              </div>
              <p className="font-mono text-[10.5px] text-slate-500">
                Offline Attendance &amp; Auto-Sync
              </p>
            </div>

            {/* Toggle Switch Button */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                role="switch"
                aria-checked={offlineSync}
                aria-label="Local Save and Cloud Sync"
                onClick={() => setOfflineSync((prev) => !prev)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#C44900] focus:ring-offset-2 ${
                  offlineSync ? 'bg-[#C44900]' : 'bg-slate-300'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    offlineSync ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Toggle Switch Row 3: Desktop Side Railway Navigation */}
          <div className="flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border-2 border-slate-200/90 bg-slate-50/70 hover:border-slate-300 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-sans text-sm font-bold text-slate-900">
                  Desktop Side Railway Navigation
                </span>

                {/* Active / Disabled / Desktop Only badge */}
                <span
                  className={`font-mono text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    isMobile
                      ? 'bg-slate-200/80 text-slate-600 border border-slate-300'
                      : sideRailNav
                      ? 'bg-orange-50 text-[#C44900] border border-[#C44900]/40'
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}
                >
                  {isMobile ? 'Desktop Only' : sideRailNav ? 'Active' : 'Disabled'}
                </span>

                {/* Info "i" Hover Tooltip */}
                <div className="relative group inline-flex items-center">
                  <button
                    type="button"
                    tabIndex={0}
                    aria-label="What is Desktop Side Railway Navigation?"
                    title="Switches the desktop navigation bar from a top header menu into a left-side vertical navigation rail for quick access and multi-tasking."
                    className="w-5 h-5 rounded-full border border-slate-300 bg-white hover:border-[#C44900] hover:text-[#C44900] text-slate-500 flex items-center justify-center font-mono text-[11px] font-bold cursor-help transition-colors"
                  >
                    i
                  </button>
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 max-w-[85vw] p-2.5 bg-slate-900 text-white rounded-xl shadow-xl font-mono text-[10.5px] leading-relaxed opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50">
                    Switches the desktop navigation bar from a top header menu into a left-side vertical navigation rail for quick access and multi-tasking. Disabled on mobile viewports.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                  </div>
                </div>
              </div>
              <p className="font-mono text-[11px] text-slate-500">
                {isMobile
                  ? 'Disabled on mobile viewports. This layout feature is only active on desktop screens (≥1024px).'
                  : 'Display navigation menu as a vertical side rail along the left side of the screen on desktop viewports.'}
              </p>
            </div>

            {/* Toggle Switch Button */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                role="switch"
                aria-checked={!isMobile && sideRailNav}
                aria-label="Desktop Side Railway Navigation"
                disabled={isMobile}
                onClick={handleToggleSideRail}
                className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#C44900] focus:ring-offset-2 ${
                  isMobile
                    ? 'opacity-40 cursor-not-allowed bg-slate-300'
                    : sideRailNav
                    ? 'cursor-pointer bg-[#C44900]'
                    : 'cursor-pointer bg-slate-300'
                }`}
                title={isMobile ? 'Desktop Side Railway Navigation is disabled on mobile devices' : undefined}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    !isMobile && sideRailNav ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Submit Action Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto min-w-[200px] h-12 px-6 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-clash-semibold text-base inline-flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.99] disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Profile...' : savedNotice ? 'Profile Saved ✓' : 'Save Settings'}
          </button>
        </div>
      </form>

      <ConfirmModal
        isOpen={confirmSignOut}
        loading={signingOut}
        variant="danger"
        title="Sign Out"
        description="Are you sure you want to sign out of OJT.SYS? Your saved attendance logs and calendar records will remain safely stored."
        confirmLabel="Sign Out"
        onConfirm={async () => {
          setSigningOut(true);
          await onSignOut();
          setSigningOut(false);
          setConfirmSignOut(false);
        }}
        onCancel={() => setConfirmSignOut(false)}
      />
    </div>
  );
});

export default ProfileTab;
