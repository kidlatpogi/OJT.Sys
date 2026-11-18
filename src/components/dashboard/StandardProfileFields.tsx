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

export default function StandardProfileFields({
  formData,
  onChange,
  readOnly = false,
  errors = {},
}: StandardProfileFieldsProps) {
  return (
    <div className="space-y-4">
      {/* 1. Full Name (2 separate fields: First Name and Last Name) */}
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

      {/* 2. Student ID & Program */}
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
            className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-sm text-slate-900 transition-colors disabled:bg-slate-100"
          >
            <option value="BSIT">BSIT</option>
            <option value="BSCS">BSCS</option>
          </select>
          {errors.program && (
            <p className="mt-1 text-xs text-red-600 font-mono">{errors.program}</p>
          )}
        </div>
      </div>

      {/* 3. Company Name */}
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
          placeholder="Acme Software Corp."
          className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-sm text-slate-900 transition-colors disabled:bg-slate-100"
        />
        {errors.companyName && (
          <p className="mt-1 text-xs text-red-600 font-mono">{errors.companyName}</p>
        )}
      </div>

      {/* 4. Branch / Department */}
      <div>
        <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
          Branch / Department
        </label>
        <input
          type="text"
          disabled={readOnly}
          value={formData.branchDepartment}
          onChange={(e) => onChange('branchDepartment', e.target.value)}
          placeholder="e.g. IT Dept. / Solutions Engineering"
          className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-sm text-slate-900 transition-colors disabled:bg-slate-100"
        />
        {errors.branchDepartment && (
          <p className="mt-1 text-xs text-red-600 font-mono">{errors.branchDepartment}</p>
        )}
      </div>

      {/* 5. Supervisor Name */}
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
          placeholder="e.g. Engr. Santos"
          className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-sm text-slate-900 transition-colors disabled:bg-slate-100"
        />
        {errors.supervisorName && (
          <p className="mt-1 text-xs text-red-600 font-mono">{errors.supervisorName}</p>
        )}
      </div>

      {/* 6. Trainor Name (Optional) */}
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

      {/* 7. Required OJT Hours & 8. Lunch Break Deduction (Minutes) */}
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
            className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-sm text-slate-900 transition-colors disabled:bg-slate-100"
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
            className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-sm text-slate-900 transition-colors disabled:bg-slate-100"
          />
          {errors.lunchBreakMinutes && (
            <p className="mt-1 text-xs text-red-600 font-mono">{errors.lunchBreakMinutes}</p>
          )}
        </div>
      </div>

      {/* 9. Shift Start and End Time */}
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
    </div>
  );
}
