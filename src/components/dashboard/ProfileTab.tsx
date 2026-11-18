'use client';

import React, { useEffect, useState } from 'react';
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
}

export default function ProfileTab({ profile, onSaveProfile, onSignOut }: ProfileTabProps) {
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
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
  }, [profile]);

  const handleFieldChange = (field: keyof StandardProfileFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
    };
    await onSaveProfile(updatedProfile);
    setSaving(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2400);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-array-semibold text-xs uppercase tracking-[0.2em] text-[#334155]">
            Onboarding &amp; Settings
          </span>
          <h2 className="font-clash-semibold text-2xl sm:text-3xl font-bold text-black">
            Trainee Profile
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setConfirmSignOut(true)}
          className="h-10 px-3.5 rounded-xl border-2 border-slate-200 hover:border-red-500 hover:text-red-600 font-mono text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-5"
      >
        <StandardProfileFields formData={formData} onChange={handleFieldChange} />

        {/* Auto Time-Out Configuration */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <label className="flex items-start justify-between gap-4 p-4 rounded-2xl border-2 border-slate-200/90 bg-slate-50/70 cursor-pointer hover:border-[#C44900]/50 transition-colors">
            <div>
              <span className="block font-sans text-sm font-bold text-slate-900">
                Enable Auto Time-Out at Shift End
              </span>
              <span className="block font-mono text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Automatically clocks you out when your shift end time arrives, only if at least one task under &ldquo;What did you work on?&rdquo; is checked. Hours round up to whole numbers (e.g. 9h).
              </span>
            </div>
            <input
              type="checkbox"
              checked={autoTimeOut}
              onChange={(e) => setAutoTimeOut(e.target.checked)}
              className="mt-1 w-5 h-5 accent-[#C44900] rounded cursor-pointer shrink-0"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full h-12 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-clash-semibold text-base inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving Profile...' : savedNotice ? 'Profile Saved' : 'Save Settings'}
        </button>
      </form>

      <ConfirmModal
        isOpen={confirmSignOut}
        loading={signingOut}
        variant="danger"
        title="Sign Out"
        description="Are you sure you want to sign out of OJT.SYS? Your saved attendance logs will remain safely stored."
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
}
