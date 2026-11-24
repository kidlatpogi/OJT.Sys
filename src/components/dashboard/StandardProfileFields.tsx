'use client';

import React from 'react';
import { formatStudentIdInput } from '@/lib/validation';

export interface StandardProfileFormData {
  firstName: string;
  lastName: string;
  studentId: string;
  program: 'BSIT' | 'BSCS' | string;
  companyName: string;
  branchDepartment: string;
  supervisorName: string;
  trainorName: string;
  targetHours: number | string;
  lunchBreakMinutes: number | string;
  dailyStartTime: string;
  dailyEndTime: string;
}

export interface StandardProfileFieldsProps {
  formData: StandardProfileFormData;
  onChange: (field: keyof StandardProfileFormData, value: any) => void;
  readOnly?: boolean;
  errors?: Partial<Record<keyof StandardProfileFormData, string>>;
}

export function splitFullName(fullName: string | undefined | null): { firstName: string; lastName: string } {
  if (!fullName) return { firstName: '', lastName: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { firstName: parts[0] || '', lastName: '' };
  const lastName = parts.pop() || '';
  const firstName = parts.join(' ');
  return { firstName, lastName };
}

export function combineFullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
}

const StandardProfileFields = React.memo(function StandardProfileFields({
  formData,
  onChange,
  readOnly = false,
  errors = {},
}: StandardProfileFieldsProps) {
  return (
    <div className="space-y-6">
      {/* SECTION 1: Trainee Identity & Academics Card */}
      <section className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="pb-2 border-b border-slate-100">
          <h3 className="font-clash-semibold text-base sm:text-lg font-bold text-slate-900">
            Trainee Identity &amp; Academics
          </h3>
          <p className="font-mono text-[10.5px] text-slate-500 uppercase tracking-wider mt-0.5">
            Personal &amp; University Record
          </p>
        </div>

        {/* Full Name (First & Last) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              First Name
            </label>
            <input
              type="text"
              required
              disabled={readOnly}
              value={formData.firstName}
              onChange={(e) => onChange('firstName', e.target.value)}
              placeholder="e.g. Juan"
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-sm text-slate-900 transition-colors disabled:bg-slate-100"
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-600 font-mono">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Last Name
            </label>
            <input
              type="text"
              required
              disabled={readOnly}
              value={formData.lastName}
              onChange={(e) => onChange('lastName', e.target.value)}
              placeholder="e.g. Dela Cruz"
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-sm text-slate-900 transition-colors disabled:bg-slate-100"
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-600 font-mono">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Student ID & Program */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Student ID
            </label>
            <input
              type="text"
              maxLength={11}
              pattern="\d{4}-\d{6}"
              disabled={readOnly}
              value={formData.studentId}
              onChange={(e) => onChange('studentId', formatStudentIdInput(e.target.value))}
              placeholder="2024-100001"
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none font-mono text-sm text-slate-900 transition-colors disabled:bg-slate-100"
            />
            {errors.studentId && (
              <p className="mt-1 text-xs text-red-600 font-mono">{errors.studentId}</p>
            )}
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Program
            </label>
            <select
              disabled={readOnly}
              value={formData.program === 'BSCS' ? 'BSCS' : 'BSIT'}
              onChange={(e) => onChange('program', e.target.value)}
              className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-sm text-slate-900 transition-colors disabled:bg-slate-100 cursor-pointer"
            >
              <option value="BSIT">BSIT - Bachelor of Science in Information Technology</option>
              <option value="BSCS">BSCS - Bachelor of Science in Computer Science</option>
            </select>
            {errors.program && (
              <p className="mt-1 text-xs text-red-600 font-mono">{errors.program}</p>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 2: Placement & Company Card */}
      <section className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="pb-2 border-b border-slate-100">
          <h3 className="font-clash-semibold text-base sm:text-lg font-bold text-slate-900">
            Placement &amp; Company
          </h3>
          <p className="font-mono text-[10.5px] text-slate-500 uppercase tracking-wider mt-0.5">
            Host Training Establishment
          </p>
        </div>

        {/* Company Name & Department */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Company Name
            </label>
            <input
              type="text"
              required
              disabled={readOnly}
              value={formData.companyName}
              onChange={(e) => onChange('companyName', e.target.value)}
              placeholder="e.g. Analog Devices Inc."
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-sm text-slate-900 transition-colors disabled:bg-slate-100"
            />
            {errors.companyName && (
              <p className="mt-1 text-xs text-red-600 font-mono">{errors.companyName}</p>
            )}
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Branch / Department
            </label>
            <input
              type="text"
              disabled={readOnly}
              value={formData.branchDepartment}
              onChange={(e) => onChange('branchDepartment', e.target.value)}
              placeholder="e.g. IT Solutions / Engineering"
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-sm text-slate-900 transition-colors disabled:bg-slate-100"
            />
            {errors.branchDepartment && (
              <p className="mt-1 text-xs text-red-600 font-mono">{errors.branchDepartment}</p>
            )}
          </div>
        </div>

        {/* Supervisor & Trainor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Supervisor Name
            </label>
            <input
              type="text"
              required
              disabled={readOnly}
              value={formData.supervisorName}
              onChange={(e) => onChange('supervisorName', e.target.value)}
              placeholder="e.g. Engr. Arnold Bautista"
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-sm text-slate-900 transition-colors disabled:bg-slate-100"
            />
            {errors.supervisorName && (
              <p className="mt-1 text-xs text-red-600 font-mono">{errors.supervisorName}</p>
            )}
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Trainor Name (Optional)
            </label>
            <input
              type="text"
              disabled={readOnly}
              value={formData.trainorName}
              onChange={(e) => onChange('trainorName', e.target.value)}
              placeholder="e.g. Immediate Trainer (optional)"
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-sm text-slate-900 transition-colors disabled:bg-slate-100"
            />
            {errors.trainorName && (
              <p className="mt-1 text-xs text-red-600 font-mono">{errors.trainorName}</p>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 3: Shift Schedule & Hours Policy Card */}
      <section className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="pb-2 border-b border-slate-100">
          <h3 className="font-clash-semibold text-base sm:text-lg font-bold text-slate-900">
            Shift Schedule &amp; Hours Policy
          </h3>
          <p className="font-mono text-[10.5px] text-slate-500 uppercase tracking-wider mt-0.5">
            Required Hours &amp; Daily Schedule
          </p>
        </div>

        {/* Required Hours & Lunch Break */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Required OJT Hours
            </label>
            <input
              type="number"
              min={50}
              max={1500}
              required
              disabled={readOnly}
              value={formData.targetHours}
              onChange={(e) => onChange('targetHours', Number(e.target.value) || 0)}
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none font-mono text-sm text-slate-900 transition-colors disabled:bg-slate-100"
            />
            {errors.targetHours && (
              <p className="mt-1 text-xs text-red-600 font-mono">{errors.targetHours}</p>
            )}
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Lunch Break Deduction (Minutes)
            </label>
            <input
              type="number"
              min={0}
              max={180}
              required
              disabled={readOnly}
              value={formData.lunchBreakMinutes}
              onChange={(e) => onChange('lunchBreakMinutes', Math.max(0, Number(e.target.value) || 0))}
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none font-mono text-sm text-slate-900 transition-colors disabled:bg-slate-100"
            />
            {errors.lunchBreakMinutes && (
              <p className="mt-1 text-xs text-red-600 font-mono">{errors.lunchBreakMinutes}</p>
            )}
          </div>
        </div>

        {/* Shift Start & Shift End */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Shift Start Time
            </label>
            <input
              type="time"
              required
              disabled={readOnly}
              value={(formData.dailyStartTime || '09:00').slice(0, 5)}
              onChange={(e) => onChange('dailyStartTime', e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none font-mono text-sm text-slate-900 transition-colors disabled:bg-slate-100"
            />
            {errors.dailyStartTime && (
              <p className="mt-1 text-xs text-red-600 font-mono">{errors.dailyStartTime}</p>
            )}
          </div>

          <div>
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Shift End Time
            </label>
            <input
              type="time"
              required
              disabled={readOnly}
              value={(formData.dailyEndTime || '18:00').slice(0, 5)}
              onChange={(e) => onChange('dailyEndTime', e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none font-mono text-sm text-slate-900 transition-colors disabled:bg-slate-100"
            />
            {errors.dailyEndTime && (
              <p className="mt-1 text-xs text-red-600 font-mono">{errors.dailyEndTime}</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
});

export default StandardProfileFields;
