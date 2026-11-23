import React from 'react';

/**
 * Root Loading Skeleton (Next.js App Router loading boundary).
 * Provides immediate grayish placeholder feedback during root and landing page navigation.
 * Matches the root/landing layout geometry (floating navbar, hero text, CTA buttons, 3-card bento grid).
 */
export default function RootLoading() {
  return (
    <div
      className="relative min-h-[100dvh] bg-[#f8f8f8] flex flex-col justify-between overflow-x-clip animate-pulse"
      aria-busy="true"
      aria-label="Loading page"
    >
      {/* Top Floating Pill Navbar Skeleton */}
      <header className="sticky top-3 z-40 px-3 sm:px-6 pt-3">
        <nav className="max-w-6xl mx-auto bg-white/85 backdrop-blur-md border-2 border-gray-200/80 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-sm">
          {/* Logo brandmark placeholder */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gray-300" />
            <div className="h-5 w-24 rounded-lg bg-gray-200" />
          </div>

          {/* Right nav actions placeholder */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-9 w-20 rounded-xl bg-gray-200" />
            <div className="h-9 w-28 rounded-xl bg-gray-300" />
          </div>
        </nav>
      </header>

      {/* Hero Section Skeleton */}
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16">
        {/* Banner Pill Placeholder */}
        <div className="h-10 w-full max-w-md bg-gray-200 rounded-2xl mb-6 sm:mb-8" />

        <div className="max-w-3xl space-y-4">
          {/* Headline Lines */}
          <div className="space-y-2 sm:space-y-3">
            <div className="h-10 sm:h-14 w-3/4 max-w-md bg-gray-300 rounded-2xl" />
            <div className="h-10 sm:h-14 w-2/3 max-w-sm bg-gray-200 rounded-2xl" />
            <div className="h-10 sm:h-14 w-4/5 max-w-lg bg-gray-300 rounded-2xl" />
          </div>

          {/* Subtitle Lines */}
          <div className="pt-2 max-w-xl space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-5/6 bg-gray-200 rounded" />
            <div className="h-4 w-2/3 bg-gray-200 rounded" />
          </div>

          {/* Mobile-First Thumb-Friendly CTA Group Skeleton */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md sm:max-w-[460px]">
            <div className="h-12 rounded-2xl bg-gray-300 shadow-sm" />
            <div className="h-12 rounded-2xl bg-gray-200 border-2 border-gray-300" />
            <div className="sm:col-span-2 h-12 rounded-2xl bg-gray-300" />
          </div>
        </div>

        {/* 3-Card Bento Showcase Skeleton */}
        <section className="mt-12 sm:mt-16">
          <div className="mb-5 space-y-2">
            <div className="h-3 w-32 bg-gray-200 rounded" />
            <div className="h-7 sm:h-9 w-72 sm:w-96 bg-gray-300 rounded-xl" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((card) => (
              <div
                key={card}
                className="border-2 border-gray-200/80 bg-white p-6 rounded-2xl sm:rounded-3xl flex flex-col justify-between gap-6 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-16 bg-gray-200 rounded" />
                    <div className="w-4 h-4 bg-gray-200 rounded" />
                  </div>
                  <div className="h-6 w-3/4 bg-gray-300 rounded-lg mt-3" />
                  <div className="space-y-2 mt-3">
                    <div className="h-3.5 w-full bg-gray-200 rounded" />
                    <div className="h-3.5 w-5/6 bg-gray-200 rounded" />
                    <div className="h-3.5 w-2/3 bg-gray-200 rounded" />
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                  <div className="w-4 h-4 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
