'use client';

import React from 'react';

/**
 * High-fidelity animated pulse skeleton for the OJT Dashboard.
 * Mirrors the exact geometry of PunchClockCard and target stats to prevent layout shifts.
 * Uses the light grayish palette (bg-gray-100, bg-gray-200, bg-gray-300) to match the light theme.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-pulse" aria-busy="true" aria-label="Loading workspace">
      {/* Punch Clock Main Card Skeleton */}
      <div className="bg-white border-2 border-gray-200/80 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
        {/* Date, Time, and Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-gray-100">
          <div className="space-y-2">
            <div className="h-3 w-32 bg-gray-200 rounded" />
            <div className="h-8 w-44 bg-gray-300 rounded-lg" />
          </div>
          <div className="h-7 w-28 bg-gray-200 rounded-full self-start sm:self-auto" />
        </div>

        {/* 3 Metric Mini-Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((card) => (
            <div
              key={card}
              className="bg-gray-50 border border-gray-200 rounded-2xl p-3 space-y-2"
            >
              <div className="h-2.5 w-14 bg-gray-200 rounded" />
              <div className="h-5 w-16 bg-gray-300 rounded" />
            </div>
          ))}
        </div>

        {/* Main Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="h-14 sm:h-16 rounded-2xl bg-gray-300" />
          <div className="h-14 sm:h-16 rounded-2xl bg-gray-200 border border-gray-300" />
        </div>

        {/* Task Checklist Skeleton */}
        <div className="pt-4 border-t border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-36 bg-gray-300 rounded" />
            <div className="h-3 w-20 bg-gray-200 rounded" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 rounded-2xl bg-gray-50 border border-gray-200 p-3 flex items-center gap-3"
              >
                <div className="w-5 h-5 rounded-lg bg-gray-200 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-3/4 bg-gray-300 rounded" />
                  <div className="h-2.5 w-1/3 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
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

      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-16 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 flex items-center justify-between"
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
