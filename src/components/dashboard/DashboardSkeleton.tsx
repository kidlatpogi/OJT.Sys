'use client';

import React from 'react';

/**
 * High-fidelity animated pulse skeleton for the OJT Dashboard.
 * Mirrors the exact responsive geometry of PunchClockCard and target stats to prevent layout shifts.
 * Uses the light grayish palette (bg-gray-100, bg-gray-200, bg-gray-300) to match the light theme.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading workspace">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (5 cols on desktop): Clock Card Skeleton */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#141313] rounded-3xl p-5 sm:p-7 border border-slate-800 shadow-sm space-y-5">
            <div className="space-y-2">
              <div className="h-3 w-32 bg-slate-800 rounded" />
              <div className="h-10 w-48 bg-slate-800 rounded-lg" />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[1, 2, 3].map((card) => (
                <div key={card} className="bg-[#201f1f] rounded-2xl p-3 space-y-1.5">
                  <div className="h-2.5 w-12 bg-slate-800 rounded" />
                  <div className="h-4 w-14 bg-slate-700 rounded" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="h-14 rounded-2xl bg-[#C44900]/40" />
              <div className="h-14 rounded-2xl bg-white/10" />
            </div>
          </div>

          <div className="hidden lg:block bg-white border-2 border-slate-200/80 rounded-3xl p-5 space-y-3">
            <div className="h-3 w-28 bg-gray-200 rounded" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-12 bg-gray-100 rounded-xl" />
              <div className="h-12 bg-gray-100 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Right Column (7 cols on desktop): Partitioned into Checklist Card & Deliverables Card */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1 Skeleton: Dedicated "What did you work on?" Checklist */}
          <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="space-y-1.5">
                <div className="h-3 w-32 bg-gray-200 rounded" />
                <div className="h-6 w-52 bg-gray-300 rounded-lg" />
              </div>
              <div className="h-8 w-24 bg-gray-100 rounded-xl" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-2xl bg-gray-50 border border-gray-200 p-3 flex items-center justify-between"
                >
                  <div className="space-y-1 flex-1">
                    <div className="h-3.5 w-3/4 bg-gray-300 rounded" />
                    <div className="h-2 w-1/3 bg-gray-200 rounded" />
                  </div>
                  <div className="w-5 h-5 rounded-md bg-gray-200 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Card 2 Skeleton: Dedicated "Shift Accomplishments & Reports" */}
          <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="space-y-1.5">
                <div className="h-3 w-28 bg-gray-200 rounded" />
                <div className="h-5 w-44 bg-gray-300 rounded-lg" />
              </div>
            </div>

            <div className="h-20 bg-gray-50 border border-gray-200 rounded-2xl" />
            <div className="h-24 bg-gray-50 border border-gray-200 rounded-2xl" />
            <div className="h-12 rounded-2xl bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Universal pulse skeleton for dynamic tabs (Calendar, Logs, Reports, Profile).
 */
export function TabContentSkeleton({ label = 'view' }: { label?: string }) {
  return (
    <div
      className="bg-white border-2 border-gray-200/80 rounded-3xl p-6 sm:p-8 space-y-6 animate-pulse"
      aria-busy="true"
      aria-label={`Loading ${label}`}
    >
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-gray-200 rounded" />
          <div className="h-6 w-44 bg-gray-300 rounded-lg" />
        </div>
        <div className="h-8 w-24 bg-gray-100 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 flex items-center justify-between"
          >
            <div className="space-y-2 flex-1">
              <div className="h-3.5 w-48 bg-gray-300 rounded" />
              <div className="h-2.5 w-28 bg-gray-200 rounded" />
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
