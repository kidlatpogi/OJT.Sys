'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { Internship } from '@/types/ojt';

interface InternshipSelectorProps {
  internships: Internship[];
  activeInternshipId: string | null;
  onSelectInternship: (internshipId: string) => void;
  onAddNewInternship: () => void;
  onEditInternship?: (internship: Internship) => void;
  onDeleteInternship?: (internship: Internship) => void;
  getInternshipHours?: (internshipId: string) => number;
  className?: string;
  variant?: 'header' | 'mobile-strip' | 'compact' | 'railway';
}

export default function InternshipSelector({
  internships,
  activeInternshipId,
  onSelectInternship,
  onAddNewInternship,
  onEditInternship,
  onDeleteInternship,
  getInternshipHours,
  className = '',
  variant = 'header',
}: InternshipSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeInternship =
    internships.find((i) => i.id === activeInternshipId) || internships[0] || null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeHours = activeInternship && getInternshipHours
    ? getInternshipHours(activeInternship.id)
    : null;

  return (
    <div
      ref={containerRef}
      className={`relative ${
        variant === 'mobile-strip' || variant === 'railway' ? 'w-full block' : 'inline-block'
      } text-left ${className}`}
    >
      {/* Selector Trigger Button */}
      <button
        type="button"
        id="internship-selector-btn"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group flex items-center gap-2 rounded-xl transition-all cursor-pointer ${
          variant === 'railway'
            ? 'w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-2xl justify-between shadow-xs'
            : variant === 'mobile-strip'
            ? 'w-full px-3 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 justify-between'
            : 'h-9 px-3 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-left min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-slate-900 truncate max-w-[130px] sm:max-w-[180px]">
                {activeInternship?.title || 'Internship 1'}
              </span>
              {activeInternship?.status === 'completed' ? (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 shrink-0">
                  Done
                </span>
              ) : (
                <span className="relative flex h-2 w-2 shrink-0 ml-0.5" title="Active Program">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C44900] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C44900] ring-2 ring-white" />
                </span>
              )}
            </div>
            {(variant === 'mobile-strip' || variant === 'railway') && activeInternship?.company_name && (
              <p className="font-sans text-[11px] text-slate-500 truncate max-w-[200px]">
                {activeInternship.company_name}
                {activeHours !== null ? ` · ${activeHours}h / ${activeInternship.target_hours}h` : ''}
              </p>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#C44900]' : ''
          }`}
        />
      </button>

      {/* Flyout Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Internship Programs"
          className={`absolute ${
            variant === 'railway' ? 'left-0 mt-1.5 w-72' : 'left-0 sm:left-auto sm:right-0 mt-1.5 w-72 sm:w-80'
          } rounded-2xl bg-white border-2 border-slate-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100`}
        >
          <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Internship Programs ({internships.length})
            </span>
            <span className="font-mono text-[10px] text-slate-400">Switch active</span>
          </div>

          <div className="max-h-60 overflow-y-auto py-1 space-y-1">
            {internships.map((internship) => {
              const isSelected = internship.id === activeInternship?.id;
              const hours = getInternshipHours ? getInternshipHours(internship.id) : null;
              const pct = hours !== null
                ? Math.min(100, Math.round((hours / Math.max(1, internship.target_hours)) * 100))
                : null;

              return (
                <div
                  key={internship.id}
                  className={`w-full px-3.5 py-2.5 text-left flex items-start gap-2 transition-colors ${
                    isSelected
                      ? 'bg-[#C44900]/8 text-slate-900 border-l-4 border-[#C44900]'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectInternship(internship.id);
                      setIsOpen(false);
                    }}
                    className="flex-1 text-left flex items-start gap-2.5 cursor-pointer min-w-0"
                  >
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#C44900] text-white'
                            : 'border border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-bold truncate">
                          {internship.title || 'Internship'}
                        </span>
                        {internship.status === 'completed' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 shrink-0">
                            Completed
                          </span>
                        ) : (
                          <span className="relative flex h-2 w-2 shrink-0 ml-0.5" title="Active Program">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C44900] opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C44900] ring-2 ring-white" />
                          </span>
                        )}
                      </div>

                      <p className="font-sans text-[11px] text-slate-500 truncate mt-0.5">
                        {internship.company_name || 'No company specified'}
                      </p>

                      {hours !== null && pct !== null && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                internship.status === 'completed'
                                  ? 'bg-emerald-500'
                                  : 'bg-[#C44900]'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-slate-500 shrink-0">
                            {hours}/{internship.target_hours}h ({pct}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0 ml-1 mt-0.5">
                    {onEditInternship && (
                      <button
                        type="button"
                        aria-label="Edit internship"
                        title="Edit internship"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          onEditInternship(internship);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-200/70 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDeleteInternship && (
                      <button
                        type="button"
                        aria-label="Delete internship"
                        title="Delete internship"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          onDeleteInternship(internship);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add New Internship Action */}
          <div className="pt-1.5 px-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onAddNewInternship();
              }}
              className="w-full h-9 rounded-xl border border-dashed border-slate-300 hover:border-[#C44900] hover:bg-[#C44900]/5 text-slate-700 hover:text-[#C44900] font-mono text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Internship
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
