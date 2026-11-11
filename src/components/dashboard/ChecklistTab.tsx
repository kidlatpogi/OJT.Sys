'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, FileCheck2, RotateCcw } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import ConfirmModal from '@/components/ConfirmModal';

type ChecklistPhase = 'Pre-OJT' | 'During OJT' | 'Post-OJT';

interface ChecklistRequirement {
  id: string;
  stepNumber: string;
  phase: ChecklistPhase;
  title: string;
  description: string;
  requiredFile?: string;
}

const INTERNSHIP_REQUIREMENTS: ChecklistRequirement[] = [
  {
    id: 'step-1-company',
    stepNumber: '01',
    phase: 'Pre-OJT',
    title: 'Select an Internship Company',
    description: 'Choose a company from NU Industry Partners or explore approved external opportunities.',
  },
  {
    id: 'step-2-company-reqs',
    stepNumber: '02',
    phase: 'Pre-OJT',
    title: 'Submit Company Requirements',
    description: 'Once accepted, submit the job description and company profile to your Internship Coordinator.',
    requiredFile: 'Job Description & Company Profile',
  },
  {
    id: 'step-3-recommendation',
    stepNumber: '03',
    phase: 'Pre-OJT',
    title: 'Secure a Recommendation Letter',
    description: 'Obtain an official recommendation letter from your Internship Coordinator.',
    requiredFile: 'Recommendation Letter',
  },
  {
    id: 'step-4-application',
    stepNumber: '04',
    phase: 'Pre-OJT',
    title: 'Submit Your Application',
    description: 'Forward your recommendation letter and resume to your chosen industry partner.',
    requiredFile: 'Resume / CV & Recommendation Letter',
  },
  {
    id: 'step-5-enroll',
    stepNumber: '05',
    phase: 'Pre-OJT',
    title: 'Enroll in the Internship Course',
    description: 'Verify that you are officially enrolled in the internship course offered for the term.',
    requiredFile: 'Course Enrollment Verification',
  },
  {
    id: 'step-6-agreement-plan',
    stepNumber: '06',
    phase: 'Pre-OJT',
    title: 'Prepare Internship Agreement & Internship Plan',
    description: 'Once accepted, secure and prepare the required agreement and plan documents from the company.',
    requiredFile: 'Internship Agreement & Internship Plan',
  },
  {
    id: 'step-7-signatures',
    stepNumber: '07',
    phase: 'Pre-OJT',
    title: 'Complete Required Signatures',
    description: 'Ensure the Internship Agreement and Internship Plan are signed by all parties and submitted to your Coordinator.',
    requiredFile: 'Signed Agreement & Plan',
  },
  {
    id: 'step-8-medical',
    stepNumber: '08',
    phase: 'Pre-OJT',
    title: 'Secure a Medical Certificate',
    description: 'Obtain your official medical clearance certificate from the University Clinic.',
    requiredFile: 'Medical Certificate',
  },
  {
    id: 'step-9-consent',
    stepNumber: '09',
    phase: 'Pre-OJT',
    title: 'Submit Parent/Guardian Consent Form',
    description: 'Ensure the Parent/Guardian Consent Form is properly signed and submitted.',
    requiredFile: 'Signed Parent/Guardian Consent Form',
  },
  {
    id: 'step-10-begin',
    stepNumber: '10',
    phase: 'During OJT',
    title: 'Begin Your Internship',
    description: 'Report to your assigned company based on the schedule in your Internship Agreement.',
  },
  {
    id: 'step-11-war',
    stepNumber: '11',
    phase: 'During OJT',
    title: 'Submit Weekly Activity Reports (WAR)',
    description: 'Submit your Weekly Activity Report to your Industry Supervisor at the beginning of each workweek.',
    requiredFile: 'Weekly Activity Report (WAR)',
  },
  {
    id: 'step-12-attendance',
    stepNumber: '12',
    phase: 'During OJT',
    title: 'Maintain Your Attendance Report',
    description: 'Keep an accurate record of your daily attendance and ensure it is signed by your Industry Supervisor.',
    requiredFile: 'Signed Daily Attendance Report',
  },
  {
    id: 'step-13a-final-eval',
    stepNumber: '13a',
    phase: 'Post-OJT',
    title: 'Final Evaluation from Industry Supervisor',
    description: 'Secure the completed and signed final performance evaluation from your Industry Supervisor.',
    requiredFile: 'Supervisor Final Evaluation',
  },
  {
    id: 'step-13b-certificate',
    stepNumber: '13b',
    phase: 'Post-OJT',
    title: 'Certificate of Completion',
    description: 'Obtain your official Certificate of Completion issued by the partner company.',
    requiredFile: 'Certificate of Completion',
  },
  {
    id: 'step-13c-onsite-reports',
    stepNumber: '13c',
    phase: 'Post-OJT',
    title: 'Submit WAR & Attendance Report Onsite',
    description: 'Submit all signed Weekly Activity Reports (WAR) and Daily Attendance Reports onsite.',
    requiredFile: 'Signed WAR & Attendance Reports',
  },
  {
    id: 'step-13d-student-eval',
    stepNumber: '13d',
    phase: 'Post-OJT',
    title: 'Student Internship Evaluation Form',
    description: 'Accomplish and submit the Student Internship Evaluation Form to evaluate the program.',
    requiredFile: 'Student Evaluation Form',
  },
  {
    id: 'step-14-portfolio',
    stepNumber: '14',
    phase: 'Post-OJT',
    title: 'Submit Your Internship Portfolio',
    description: 'Submit your completed Internship Portfolio to your Internship Coordinator.',
    requiredFile: 'Internship Portfolio',
  },
  {
    id: 'step-15-grade',
    stepNumber: '15',
    phase: 'Post-OJT',
    title: 'Receive Your Final Grade',
    description: 'Final internship grade processed upon completion and submission of all required documents.',
  },
];

interface ChecklistTabProps {
  userId: string;
}

export default function ChecklistTab({ userId }: ChecklistTabProps) {
  const storageKey = `ojt_requirements_checklist_${userId}`;
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [phaseFilter, setPhaseFilter] = useState<'All' | ChecklistPhase>('All');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  useEffect(() => {
    const loadChecklist = async () => {
      try {
        const localRaw = localStorage.getItem(storageKey);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed)) setCheckedIds(parsed);
        }
      } catch {
        // ignore localStorage parse error
      }

      if (isSupabaseConfigured()) {
        try {
          const supabase = createClient();
          const { data } = await supabase.auth.getUser();
          const metaList = data?.user?.user_metadata?.ojt_checklist;
          if (Array.isArray(metaList)) {
            setCheckedIds(metaList);
            localStorage.setItem(storageKey, JSON.stringify(metaList));
          }
        } catch {
          // ignore network error
        }
      }
    };
    loadChecklist();
  }, [storageKey]);

  const persistChecklist = async (next: string[]) => {
    setCheckedIds(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore storage quota
    }
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.auth.updateUser({ data: { ojt_checklist: next } });
      } catch {
        // ignore sync error
      }
    }
  };

  const toggleItem = (id: string) => {
    const next = checkedIds.includes(id)
      ? checkedIds.filter((item) => item !== id)
      : [...checkedIds, id];
    persistChecklist(next);
  };

  const visibleItems = useMemo(
    () =>
      phaseFilter === 'All'
        ? INTERNSHIP_REQUIREMENTS
        : INTERNSHIP_REQUIREMENTS.filter((item) => item.phase === phaseFilter),
    [phaseFilter]
  );

  const completedCount = checkedIds.length;
  const totalCount = INTERNSHIP_REQUIREMENTS.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="font-array-semibold text-xs uppercase tracking-[0.2em] text-[#334155]">
            Internship Process &amp; Files
          </span>
          <h2 className="font-clash-semibold text-2xl sm:text-3xl font-bold text-black">
            Requirements Checklist
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setConfirmResetOpen(true)}
          className="h-10 px-3 rounded-xl border-2 border-slate-200 hover:border-red-500 hover:text-red-600 font-mono text-xs font-bold text-slate-600 inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* Progress Summary Card */}
      <section className="bg-[#141313] text-white rounded-3xl p-5 border border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Document Clearance Progress
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-clash-semibold text-3xl font-bold text-[#C44900]">
                {completedCount}
              </span>
              <span className="font-mono text-xs text-slate-300">
                / {totalCount} completed ({progressPct}%)
              </span>
            </div>
          </div>
          <FileCheck2 className="w-7 h-7 text-[#C44900] shrink-0" />
        </div>

        <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-[#C44900] rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </section>

      {/* Phase Filter Tabs */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-200/80 rounded-2xl">
        {(['All', 'Pre-OJT', 'During OJT', 'Post-OJT'] as const).map((phase) => (
          <button
            key={phase}
            type="button"
            onClick={() => setPhaseFilter(phase)}
            className={`py-2 px-1 rounded-xl font-mono text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
              phaseFilter === phase
                ? 'bg-white text-[#C44900] shadow-xs'
                : 'text-slate-600 hover:text-black'
            }`}
          >
            {phase}
          </button>
        ))}
      </div>

      {/* Checklist Cards */}
      <div className="space-y-2.5">
        {visibleItems.map((item) => {
          const checked = checkedIds.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleItem(item.id)}
              className={`w-full text-left p-4 rounded-2xl sm:rounded-3xl border-2 transition-all flex items-start gap-3.5 cursor-pointer ${
                checked
                  ? 'bg-orange-50/70 border-[#C44900]'
                  : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <span
                className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  checked
                    ? 'bg-[#C44900] text-white'
                    : 'bg-slate-50 border-2 border-slate-300'
                }`}
              >
                {checked && <Check className="w-3.5 h-3.5" />}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    STEP {item.stepNumber}
                  </span>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#C44900]">
                    {item.phase}
                  </span>
                </div>

                <h3
                  className={`font-clash-semibold text-base sm:text-lg font-bold mt-1 leading-snug ${
                    checked ? 'line-through text-slate-500' : 'text-slate-900'
                  }`}
                >
                  {item.title}
                </h3>

                <p className="font-sans text-xs sm:text-sm text-slate-600 leading-relaxed mt-1">
                  {item.description}
                </p>

                {item.requiredFile && (
                  <span className="inline-block mt-2 font-mono text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                    File: {item.requiredFile}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <ConfirmModal
        isOpen={confirmResetOpen}
        variant="danger"
        title="Reset Requirements Checklist"
        description="Uncheck all completed internship files and process steps? You can re-check them anytime."
        confirmLabel="Reset All"
        onConfirm={() => {
          persistChecklist([]);
          setConfirmResetOpen(false);
        }}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  );
}

