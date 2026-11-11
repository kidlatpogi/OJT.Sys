'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, FileCheck2, RotateCcw } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import ConfirmModal from '@/components/ConfirmModal';

type ChecklistPhase = 'Preliminary' | 'Ongoing' | 'Post-Internship';

interface DocumentChecklistItem {
  id: string;
  phase: ChecklistPhase;
  phaseLabel: string;
  title: string;
  description: string;
}

const DOCUMENT_CHECKLIST: DocumentChecklistItem[] = [
  // 1. Preliminary Documents (Pre-Internship)
  {
    id: 'prelim-internship-agreement',
    phase: 'Preliminary',
    phaseLabel: '1. Preliminary Documents (Pre-Internship)',
    title: 'Internship Agreement (SECA-CTNTERN-001)',
    description:
      'Fully signed by Student Intern, Parent/Guardian, Company Representative, and Internship Coordinator.',
  },
  {
    id: 'prelim-internship-plan',
    phase: 'Preliminary',
    phaseLabel: '1. Preliminary Documents (Pre-Internship)',
    title: 'Internship Plan (SECA-CTNTERN-002)',
    description:
      'Filled with job role, daily schedule, tasks, and signed by Supervisor and Coordinator.',
  },
  {
    id: 'prelim-medical-certificate',
    phase: 'Preliminary',
    phaseLabel: '1. Preliminary Documents (Pre-Internship)',
    title: 'Medical Certificate',
    description: 'Issued by the University Clinic.',
  },
  {
    id: 'prelim-parent-consent',
    phase: 'Preliminary',
    phaseLabel: '1. Preliminary Documents (Pre-Internship)',
    title: 'Parent/Guardian Consent Form',
    description: 'Signed by parent or legal guardian.',
  },

  // 2. Ongoing Documents (Weekly & Monthly Tracking)
  {
    id: 'ongoing-daily-attendance',
    phase: 'Ongoing',
    phaseLabel: '2. Ongoing Documents (Weekly & Monthly Tracking)',
    title: 'Daily Attendance Report (SECA-CTNTERN-003)',
    description:
      'Tracked daily with Time-In, Time-Out, calculated hours, and supervisor signature.',
  },
  {
    id: 'ongoing-weekly-report',
    phase: 'Ongoing',
    phaseLabel: '2. Ongoing Documents (Weekly & Monthly Tracking)',
    title: 'Weekly Activity Report / WAR (SECA-CTNTERN-004)',
    description:
      'Compiled at the start/end of each workweek and signed by Trainer/Supervisor.',
  },
  {
    id: 'ongoing-monthly-report',
    phase: 'Ongoing',
    phaseLabel: '2. Ongoing Documents (Weekly & Monthly Tracking)',
    title: 'Monthly Activity Report (SECA-CTNTERN-005)',
    description:
      'Summary of weekly accomplishments starting with past-tense action verbs.',
  },

  // 3. Post-Internship Documents (Final Submission)
  {
    id: 'post-supervisor-evaluation',
    phase: 'Post-Internship',
    phaseLabel: '3. Post-Internship Documents (Final Submission)',
    title: 'Final Industry Supervisor Evaluation',
    description: 'Completed and signed by your immediate supervisor.',
  },
  {
    id: 'post-certificate-completion',
    phase: 'Post-Internship',
    phaseLabel: '3. Post-Internship Documents (Final Submission)',
    title: 'Certificate of Completion',
    description: 'Issued by the company upon completing required hours.',
  },
  {
    id: 'post-student-evaluation',
    phase: 'Post-Internship',
    phaseLabel: '3. Post-Internship Documents (Final Submission)',
    title: 'Student Internship Evaluation Form',
    description: 'Your feedback evaluating the company and program.',
  },
  {
    id: 'post-internship-portfolio',
    phase: 'Post-Internship',
    phaseLabel: '3. Post-Internship Documents (Final Submission)',
    title: 'Internship Portfolio / Narrative Report',
    description: 'Final compiled portfolio submitted to your Internship Coordinator.',
  },
];

const VALID_IDS = new Set(DOCUMENT_CHECKLIST.map((d) => d.id));

function sanitizeIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === 'string' && VALID_IDS.has(id));
}

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
          setCheckedIds(sanitizeIdList(JSON.parse(localRaw)));
        }
      } catch {
        // ignore localStorage parse error
      }

      if (isSupabaseConfigured()) {
        try {
          const supabase = createClient();

          // 1. Primary source: public.profiles.document_checklist in Supabase PostgreSQL
          const { data: profData } = await supabase
            .from('profiles')
            .select('document_checklist')
            .eq('id', userId)
            .single();

          if (profData && Array.isArray(profData.document_checklist)) {
            const clean = sanitizeIdList(profData.document_checklist);
            setCheckedIds(clean);
            localStorage.setItem(storageKey, JSON.stringify(clean));
            return;
          }

          // 2. Fallback: auth user_metadata if column isn't migrated yet
          const { data } = await supabase.auth.getUser();
          const metaList = data?.user?.user_metadata?.ojt_checklist;
          if (Array.isArray(metaList)) {
            const clean = sanitizeIdList(metaList);
            setCheckedIds(clean);
            localStorage.setItem(storageKey, JSON.stringify(clean));
          }
        } catch {
          // ignore network error
        }
      }
    };
    loadChecklist();
  }, [storageKey, userId]);

  const persistChecklist = async (next: string[]) => {
    const clean = sanitizeIdList(next);
    setCheckedIds(clean);
    try {
      localStorage.setItem(storageKey, JSON.stringify(clean));
    } catch {
      // ignore storage quota
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        // Save to PostgreSQL profiles table (cross-device primary persistence)
        const { error: dbErr } = await supabase
          .from('profiles')
          .update({ document_checklist: clean })
          .eq('id', userId);

        // Also mirror to user_metadata as fallback if SQL column hasn't been added yet
        if (dbErr) {
          await supabase.auth.updateUser({ data: { ojt_checklist: clean } });
        }
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

  const visibleGroups = useMemo(() => {
    const phases: ChecklistPhase[] =
      phaseFilter === 'All'
        ? ['Preliminary', 'Ongoing', 'Post-Internship']
        : [phaseFilter];

    return phases.map((phase) => {
      const items = DOCUMENT_CHECKLIST.filter((d) => d.phase === phase);
      return {
        phase,
        label: items[0]?.phaseLabel || phase,
        items,
      };
    });
  }, [phaseFilter]);

  const completedCount = checkedIds.length;
  const totalCount = DOCUMENT_CHECKLIST.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="font-array-semibold text-xs uppercase tracking-[0.2em] text-[#334155]">
            Required Files
          </span>
          <h2 className="font-clash-semibold text-2xl sm:text-3xl font-bold text-black">
            OJT Document Checklist
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
              Document Completion
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-clash-semibold text-3xl font-bold text-[#C44900]">
                {completedCount}
              </span>
              <span className="font-mono text-xs text-slate-300">
                / {totalCount} documents ({progressPct}%)
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
        {(
          [
            { key: 'All', label: 'All' },
            { key: 'Preliminary', label: 'Pre-OJT' },
            { key: 'Ongoing', label: 'Ongoing' },
            { key: 'Post-Internship', label: 'Final' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setPhaseFilter(tab.key)}
            className={`py-2 px-1 rounded-xl font-mono text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
              phaseFilter === tab.key
                ? 'bg-white text-[#C44900] shadow-xs'
                : 'text-slate-600 hover:text-black'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grouped Checklist Sections */}
      <div className="space-y-5">
        {visibleGroups.map((group) => (
          <section key={group.phase} className="space-y-2.5">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-700 px-1">
              {group.label}
            </h3>

            {group.items.map((item) => {
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
                    <h4
                      className={`font-clash-semibold text-base sm:text-lg font-bold leading-snug ${
                        checked ? 'line-through text-slate-500' : 'text-slate-900'
                      }`}
                    >
                      {item.title}
                    </h4>

                    <p className="font-sans text-xs sm:text-sm text-slate-600 leading-relaxed mt-1">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </section>
        ))}
      </div>

      <ConfirmModal
        isOpen={confirmResetOpen}
        variant="danger"
        title="Reset Document Checklist"
        description="Uncheck all 11 internship documents? You can re-check them anytime."
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
