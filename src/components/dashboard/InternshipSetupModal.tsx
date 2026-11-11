'use client';

import React, { useState } from 'react';
import { Building2, Clock } from 'lucide-react';
import { UserProfile } from '@/types/ojt';

interface InternshipSetupModalProps {
  profile: UserProfile;
  onComplete: (updated: UserProfile) => Promise<void>;
}

export default function InternshipSetupModal({
  profile,
  onComplete,
}: InternshipSetupModalProps) {
  const [companyName, setCompanyName] = useState(profile.company_name || '');
  const [branchDept, setBranchDept] = useState(profile.branch_department || '');
  const [supervisorName, setSupervisorName] = useState(profile.supervisor_name || '');
  const [supervisorPosition, setSupervisorPosition] = useState(profile.supervisor_position || '');
  const [trainorName, setTrainorName] = useState(profile.trainor_name || '');
  const [startDate, setStartDate] = useState(
    profile.start_date || new Date().toISOString().slice(0, 10)
  );
  const [targetHours, setTargetHours] = useState(String(profile.target_hours || 500));
  const [dailyStart, setDailyStart] = useState(profile.daily_start_time?.slice(0, 5) || '09:00');
  const [dailyEnd, setDailyEnd] = useState(profile.daily_end_time?.slice(0, 5) || '18:00');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    setSaving(true);
    await onComplete({
      ...profile,
      company_name: companyName.trim(),
      branch_department: branchDept.trim(),
      supervisor_name: supervisorName.trim(),
      supervisor_position: supervisorPosition.trim(),
      trainor_name: trainorName.trim(),
      start_date: startDate,
      target_hours: Number(targetHours) || 500,
      daily_start_time: dailyStart,
      daily_end_time: dailyEnd,
      lunch_break_minutes: profile.lunch_break_minutes ?? 0,
      auto_time_out: profile.auto_time_out !== false,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 border-t-2 sm:border-2 border-slate-200 max-h-[92dvh] overflow-y-auto safe-bottom shadow-xl">
        <div className="mb-5">
          <span className="font-array-semibold text-xs uppercase tracking-[0.2em] text-[#334155]">
            First-Time Setup
          </span>
          <h2 className="font-clash-semibold text-2xl sm:text-3xl font-bold tracking-tight text-black mt-0.5">
            Internship Details
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Fill this in once so your Attendance, Weekly, and Monthly reports auto-populate accurately.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
              Company Name
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Software Corp."
                className="w-full h-12 pl-10 pr-4 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                Branch / Dept
              </label>
              <input
                type="text"
                value={branchDept}
                onChange={(e) => setBranchDept(e.target.value)}
                placeholder="IT Dept."
                className="w-full h-12 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                Required Hours
              </label>
              <input
                type="number"
                required
                min={100}
                max={1000}
                value={targetHours}
                onChange={(e) => setTargetHours(e.target.value)}
                className="w-full h-12 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                Supervisor Name
              </label>
              <input
                type="text"
                required
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                placeholder="Engr. Santos"
                className="w-full h-12 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                Position
              </label>
              <input
                type="text"
                value={supervisorPosition}
                onChange={(e) => setSupervisorPosition(e.target.value)}
                placeholder="Tech Lead"
                className="w-full h-12 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
              Trainor Name (Optional)
            </label>
            <input
              type="text"
              value={trainorName}
              onChange={(e) => setTrainorName(e.target.value)}
              placeholder="Immediate Trainor"
              className="w-full h-12 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-12 px-2.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-xs"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                Shift In
              </label>
              <input
                type="time"
                value={dailyStart}
                onChange={(e) => setDailyStart(e.target.value)}
                className="w-full h-12 px-2.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-xs"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                Shift Out
              </label>
              <input
                type="time"
                value={dailyEnd}
                onChange={(e) => setDailyEnd(e.target.value)}
                className="w-full h-12 px-2.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] disabled:opacity-60 text-white font-clash-semibold text-base inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            {saving ? 'Saving Setup...' : 'Save & Start OJT'}
          </button>
        </form>
      </div>
    </div>
  );
}

