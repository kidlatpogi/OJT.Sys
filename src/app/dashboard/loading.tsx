import React from 'react';

/**
 * Dashboard Loading Skeleton (Next.js App Router loading boundary).
 * Matches the dashboard layout geometry (hidden sm:block sticky header, mobile selector,
 * progress strip, PunchClockCard with 3 mini-cards, action buttons, checklist items).
 * Built with a high-fidelity grayish palette (bg-gray-100, bg-gray-200, bg-gray-300, animate-pulse).
 */
export default function DashboardLoading() {
  return (
    <div
      className="min-h-[100dvh] bg-[#f8f8f8] pb-24 sm:pb-16 animate-pulse"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      {/* Top Desktop Sticky Header (hidden sm:block safe-top) */}
      <header className="hidden sm:block sticky top-0 z-30 bg-[#f8f8f8]/90 backdrop-blur-md border-b border-gray-200/80 px-4 py-3 safe-top">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Brand mark & program selector placeholder */}
          <div className="flex items-center gap-3">
            <div className="h-7 w-24 bg-gray-300 rounded-lg" />
            <div className="h-9 w-44 bg-gray-200 rounded-xl" />
          </div>

          {/* Desktop Navigation Tabs (6 pills) */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-9 w-20 rounded-xl bg-gray-200" />
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="max-w-4xl mx-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-6 space-y-4">
        {/* Mobile Program Switcher (sm:hidden) */}
        <div className="sm:hidden h-10 w-full bg-gray-200 rounded-2xl" />

        {/* Announcement / What's New Banner Placeholder */}
        <div className="h-12 w-full bg-gray-200 rounded-2xl" />

        {/* Cumulative OJT Hours Progress Strip Skeleton */}
        <section className="bg-white border-2 border-gray-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1.5">
              <div className="h-3.5 w-36 bg-gray-200 rounded" />
              <div className="h-8 w-28 bg-gray-300 rounded-lg" />
            </div>
            <div className="h-7 w-24 bg-gray-200 rounded-full" />
          </div>

          <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden mt-3">
            <div className="h-full w-2/5 bg-gray-300 rounded-full" />
          </div>
        </section>

        {/* Main Punch Clock Card Skeleton (Grayish Palette) */}
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
      </main>

      {/* Mobile Bottom Navigation Bar Placeholder (sm:hidden) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-3 py-2 flex items-center justify-around safe-bottom">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-8 w-8 rounded-xl bg-gray-200" />
        ))}
      </nav>
    </div>
  );
}
