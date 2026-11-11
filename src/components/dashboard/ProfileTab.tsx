'use client';

import React, { useEffect, useState } from 'react';
import { Clock, LogOut, Save } from 'lucide-react';
import { UserProfile } from '@/types/ojt';
import { formatStudentIdInput } from '@/lib/validation';
import ConfirmModal from '@/components/ConfirmModal';

interface ProfileTabProps {
  profile: UserProfile;
  onSaveProfile: (updated: UserProfile) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export default function ProfileTab({ profile, onSaveProfile, onSignOut }: ProfileTabProps) {
  const [form, setForm] = useState<UserProfile>(profile);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const updateField = <K extends keyof UserProfile>(key: K, val: UserProfile[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSaveProfile(form);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Trainee Full Name
            </label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 focus:border-[#C44900] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Student ID &amp; Program
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                maxLength={11}
                pattern="\d{4}-\d{6}"
                value={form.student_id}
                onChange={(e) => updateField('student_id', formatStudentIdInput(e.target.value))}
                placeholder="2024-100001"
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 focus:border-[#C44900] focus:outline-none font-mono text-sm"
              />
              <select
                value={form.program === 'BSCS' ? 'BSCS' : 'BSIT'}
                onChange={(e) => updateField('program', e.target.value)}
                className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 focus:border-[#C44900] focus:outline-none"
              >
                <option value="BSIT">BSIT</option>
                <option value="BSCS">BSCS</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Company Name
            </label>
            <input
              type="text"
              required
              value={form.company_name}
              onChange={(e) => updateField('company_name', e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 focus:border-[#C44900] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Branch / Department
            </label>
            <input
              type="text"
              value={form.branch_department}
              onChange={(e) => updateField('branch_department', e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 focus:border-[#C44900] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Supervisor Name
            </label>
            <input
              type="text"
              value={form.supervisor_name}
              onChange={(e) => updateField('supervisor_name', e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 focus:border-[#C44900] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Trainor Name
            </label>
            <input
              type="text"
              value={form.trainor_name}
              onChange={(e) => updateField('trainor_name', e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 focus:border-[#C44900] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Required OJT Hours
            </label>
            <input
              type="number"
              min={50}
              max={1500}
              value={form.target_hours}
              onChange={(e) => updateField('target_hours', Number(e.target.value) || 500)}
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 focus:border-[#C44900] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Lunch Break Deduction (Minutes)
            </label>
            <input
              type="number"
              min={0}
              max={180}
              value={form.lunch_break_minutes}
              onChange={(e) => updateField('lunch_break_minutes', Math.max(0, Number(e.target.value) || 0))}
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 focus:border-[#C44900] focus:outline-none"
            />
          </div>
        </div>

        {/* Shift Schedule & Auto Time-Out Configuration */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#C44900]" />
            <span className="font-mono text-xs uppercase tracking-wider font-bold text-slate-800">
              Shift Schedule &amp; Auto Time-Out
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                Shift Start Time
              </label>
              <input
                type="time"
                value={(form.daily_start_time || '09:00').slice(0, 5)}
                onChange={(e) => updateField('daily_start_time', e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 focus:border-[#C44900] focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                Shift End Time
              </label>
              <input
                type="time"
                value={(form.daily_end_time || '18:00').slice(0, 5)}
                onChange={(e) => updateField('daily_end_time', e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 focus:border-[#C44900] focus:outline-none font-mono"
              />
            </div>
          </div>

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
              checked={form.auto_time_out !== false}
              onChange={(e) => updateField('auto_time_out', e.target.checked)}
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
