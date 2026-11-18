'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, X } from 'lucide-react';
import { Internship, UserProfile } from '@/types/ojt';
import StandardProfileFields, {
  combineFullName,
  splitFullName,
  StandardProfileFormData,
} from '@/components/dashboard/StandardProfileFields';

interface InternshipSetupModalProps {
  profile: UserProfile;
  initialData?: Partial<Internship> | null;
  mode?: 'setup' | 'create' | 'edit';
  defaultTitle?: string;
  onComplete?: (updated: UserProfile) => Promise<void>;
  onCreateInternship?: (internship: Partial<Internship>) => Promise<void>;
  onUpdateInternship?: (updated: Partial<Internship>) => Promise<void>;
  onClose?: () => void;
}

export default function InternshipSetupModal({
  profile,
  initialData,
  mode = 'setup',
  defaultTitle,
  onComplete,
  onCreateInternship,
  onUpdateInternship,
  onClose,
}: InternshipSetupModalProps) {
  const [title, setTitle] = useState(
    initialData?.title || defaultTitle || (mode === 'create' ? 'Internship 2' : 'Internship 1')
  );
  const [startDate, setStartDate] = useState(
    initialData?.start_date ||
      (mode === 'setup' ? profile.start_date : '') ||
      new Date().toISOString().slice(0, 10)
  );
  const [academicTerm, setAcademicTerm] = useState(
    initialData?.academic_term || profile.academic_term || 'TERM 2 AY 2025 - 2026'
  );

  const [formData, setFormData] = useState<StandardProfileFormData>(() => {
    const { firstName, lastName } = splitFullName(profile.full_name);
    return {
      firstName,
      lastName,
      studentId: profile.student_id || '',
      program: profile.program || 'BSIT',
      companyName:
        initialData?.company_name || (mode === 'setup' ? profile.company_name : '') || '',
      branchDepartment:
        initialData?.branch_department ||
        (mode === 'setup' ? profile.branch_department : '') ||
        '',
      supervisorName:
        initialData?.supervisor_name ||
        (mode === 'setup' ? profile.supervisor_name : '') ||
        '',
      trainorName:
        initialData?.trainor_name || (mode === 'setup' ? profile.trainor_name : '') || '',
      targetHours:
        initialData?.target_hours ||
        (mode === 'setup' ? profile.target_hours : 500) ||
        500,
      lunchBreakMinutes:
        initialData?.lunch_break_minutes ??
        (mode === 'setup' ? profile.lunch_break_minutes ?? 0 : 0),
      dailyStartTime: (
        initialData?.daily_start_time ||
        (mode === 'setup' ? profile.daily_start_time : '09:00') ||
        '09:00'
      ).slice(0, 5),
      dailyEndTime: (
        initialData?.daily_end_time ||
        (mode === 'setup' ? profile.daily_end_time : '18:00') ||
        '18:00'
      ).slice(0, 5),
    };
  });

  const [saving, setSaving] = useState(false);

  const handleFieldChange = (field: keyof StandardProfileFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) return;
    setSaving(true);

    try {
      if (mode === 'create' && onCreateInternship) {
        await onCreateInternship({
          title: title.trim() || 'Internship Program',
          company_name: formData.companyName.trim(),
          branch_department: formData.branchDepartment.trim(),
          supervisor_name: formData.supervisorName.trim(),
          supervisor_position: initialData?.supervisor_position || '',
          trainor_name: formData.trainorName.trim(),
          start_date: startDate,
          target_hours: Number(formData.targetHours) || 500,
          daily_start_time: formData.dailyStartTime,
          daily_end_time: formData.dailyEndTime,
          lunch_break_minutes: Number(formData.lunchBreakMinutes) || 0,
          auto_time_out: profile.auto_time_out !== false,
          academic_term: academicTerm.trim(),
          status: 'active',
        });
        if (onClose) onClose();
      } else if (mode === 'edit' && onUpdateInternship) {
        await onUpdateInternship({
          title: title.trim() || initialData?.title || 'Internship Program',
          company_name: formData.companyName.trim(),
          branch_department: formData.branchDepartment.trim(),
          supervisor_name: formData.supervisorName.trim(),
          supervisor_position: initialData?.supervisor_position || '',
          trainor_name: formData.trainorName.trim(),
          start_date: startDate,
          target_hours: Number(formData.targetHours) || 500,
          daily_start_time: formData.dailyStartTime,
          daily_end_time: formData.dailyEndTime,
          lunch_break_minutes: Number(formData.lunchBreakMinutes) || 0,
          academic_term: academicTerm.trim(),
        });
        if (onClose) onClose();
      } else if (onComplete) {
        await onComplete({
          ...profile,
          full_name: combineFullName(formData.firstName, formData.lastName),
          student_id: formData.studentId,
          program: formData.program,
          company_name: formData.companyName.trim(),
          branch_department: formData.branchDepartment.trim(),
          supervisor_name: formData.supervisorName.trim(),
          supervisor_position: initialData?.supervisor_position || profile.supervisor_position || '',
          trainor_name: formData.trainorName.trim(),
          start_date: startDate,
          target_hours: Number(formData.targetHours) || 500,
          daily_start_time: formData.dailyStartTime,
          daily_end_time: formData.dailyEndTime,
          lunch_break_minutes: Number(formData.lunchBreakMinutes) || 0,
          auto_time_out: profile.auto_time_out !== false,
          academic_term: academicTerm.trim(),
        });
        if (onClose) onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[105] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-8 border-2 border-slate-200 max-h-[84dvh] overflow-y-auto shadow-2xl relative">
        {onClose && (
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-black hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="mb-5 pr-8">
          <span className="font-array-semibold text-xs uppercase tracking-[0.2em] text-[#334155]">
            {mode === 'create'
              ? 'Multiple Programs'
              : mode === 'edit'
              ? 'Edit Program'
              : 'First-Time Setup'}
          </span>
          <h2 className="font-clash-semibold text-2xl sm:text-3xl font-bold tracking-tight text-black mt-0.5">
            {mode === 'create'
              ? 'New Internship Program'
              : mode === 'edit'
              ? 'Edit Internship Details'
              : 'Internship Details'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {mode === 'create'
              ? 'Add a new internship program. All logs and reports from prior internships will be preserved.'
              : mode === 'edit'
              ? 'Update details for this internship program. Associated attendance logs and records will remain intact.'
              : 'Fill this in once so your Attendance, Weekly, and Monthly reports auto-populate accurately.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(mode === 'create' || mode === 'edit') && (
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                Program Title / Label
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Internship 2 (Acme)"
                className="w-full h-12 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-sm text-slate-900"
              />
            </div>
          )}

          <StandardProfileFields formData={formData} onChange={handleFieldChange} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                Academic Term
              </label>
              <input
                type="text"
                value={academicTerm}
                onChange={(e) => setAcademicTerm(e.target.value)}
                placeholder="TERM 2 AY 2025 - 2026"
                className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-xs"
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-12 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-mono text-sm font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex-2 h-12 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] disabled:opacity-60 text-white font-clash-semibold text-base inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              {saving
                ? mode === 'create'
                  ? 'Creating Program...'
                  : mode === 'edit'
                  ? 'Saving Changes...'
                  : 'Saving Setup...'
                : mode === 'create'
                ? 'Create Program'
                : mode === 'edit'
                ? 'Save Changes'
                : 'Save & Start OJT'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
