import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Smartphone,
} from 'lucide-react';
import ShapeGrid from '@/components/ShapeGrid';
import BrandMark from '@/components/BrandMark';
import LandingNavActions from '@/components/LandingNavActions';

const reportCards = [
  {
    step: '01 / DAILY',
    title: 'Daily Attendance Report',
    desc: 'One-tap Time-In and Time-Out from your phone. Automatically computes daily shift hours, lunch breaks, and running cumulative totals.',
    icon: Clock,
  },
  {
    step: '02 / WEEKLY',
    title: 'Weekly Accomplishment',
    desc: 'Pick completed tasks from structured engineering checkboxes or add custom notes. Automatically formats concise past-tense action statements.',
    icon: CalendarDays,
  },
  {
    step: '03 / MONTHLY',
    title: 'Monthly Consolidation',
    desc: 'Rolls up weekly logs into clean date-range summaries and injects directly into your official internship report templates.',
    icon: FileCheck2,
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-between overflow-x-clip">
      <ShapeGrid />

      {/* Top Floating Pill Navbar */}
      <header className="sticky top-3 z-40 px-3 sm:px-6 pt-3">
        <nav className="max-w-6xl mx-auto bg-white/85 backdrop-blur-md border-2 border-slate-200/80 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-sm">
          <BrandMark href="/" />

          <LandingNavActions />
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16">
        <div className="max-w-3xl">
          <h1 className="font-clash-semibold text-[2.5rem] leading-[0.95] sm:text-6xl md:text-7xl font-bold tracking-tighter text-black">
            Track Daily OJT.
            <br />
            Automate{' '}
            <span className="text-[#C44900]">Reports</span>
            <br />
            From Your Phone.
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
            Built for mobile-first daily punch-ins. Log your Time-In, check off technical tasks, generate clean past-tense accomplishments, and export ready-to-sign{' '}
            <span className="font-mono text-xs sm:text-sm px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800">
              .docx
            </span>{' '}
            reports in one tap.
          </p>

          {/* Mobile-First Thumb-Friendly CTA Group */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/dashboard"
              className="h-12 px-6 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-clash-semibold text-base tracking-tight inline-flex items-center justify-center gap-2 transition-all shadow-[0_12px_28px_-8px_rgba(196,73,0,0.4)] active:scale-[0.99]"
            >
              <Clock className="w-4 h-4" />
              Open OJT Workspace
            </Link>
            <Link
              href="/register"
              className="h-12 px-6 rounded-2xl bg-white hover:border-[#C44900] border-2 border-slate-200/90 text-slate-900 font-clash-semibold text-base tracking-tight inline-flex items-center justify-center gap-2 transition-all"
            >
              Create Trainee Account
              <ArrowRight className="w-4 h-4 text-[#C44900]" />
            </Link>
            <a
              href="/downloads/ojt-sys.apk"
              download="ojt-sys.apk"
              className="h-12 px-6 rounded-2xl bg-[#141313] hover:bg-slate-800 text-white font-clash-semibold text-base tracking-tight inline-flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Download className="w-4 h-4 text-[#C44900]" />
              Download Android App
            </a>
          </div>
        </div>

        {/* 3-Card Bento Showcase */}
        <section className="mt-12 sm:mt-16">
          <div className="flex items-end justify-between mb-5">
            <div>
              <span className="font-array-semibold text-xs sm:text-sm uppercase tracking-[0.2em] text-[#334155]">
                Automated Pipeline
              </span>
              <h2 className="font-clash-semibold text-2xl sm:text-4xl font-bold tracking-tight text-black mt-1">
                One Punch Cascade, Three Official Forms
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {reportCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.step}
                  className="border-2 border-slate-200/80 bg-white p-6 rounded-2xl sm:rounded-3xl flex flex-col justify-between gap-4 hover:border-[#C44900] hover:shadow-[0_12px_28px_-8px_rgba(196,73,0,0.12)] transition-all duration-300 group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                        {card.step}
                      </span>
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-[#C44900] transition-colors" />
                    </div>
                    <h3 className="font-clash-semibold text-xl sm:text-2xl font-bold text-slate-900 leading-tight mt-2 group-hover:text-[#C44900] transition-colors">
                      {card.title}
                    </h3>
                    <p className="font-sans text-sm text-slate-600 leading-relaxed mt-2.5">
                      {card.desc}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-slate-400 group-hover:text-[#C44900] transition-colors">
                    <span className="font-mono text-[11px] uppercase tracking-wider font-semibold">
                      Auto-Formatted
                    </span>
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Compact Dark Bento Workflow Strip */}
        <section className="mt-10 bg-[#141313] text-white rounded-3xl p-6 sm:p-8 border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-lg">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#C44900] font-bold">
                Daily Workflow
              </span>
              <h2 className="font-clash-semibold text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                Designed for 15-Second Check-Ins
              </h2>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Tap Time-In when you arrive at work, tap Time-Out before leaving, check off what you built, and let OJT.SYS populate every internship report automatically.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-mono">
              {[
                { label: '01. Tap Time-In / Time-Out', icon: Clock },
                { label: '02. Check Tasks + Others', icon: CheckCircle2 },
                { label: '03. Past-Tense Formatting', icon: FileText },
                { label: '04. Export Report Files', icon: FileSpreadsheet },
              ].map((step) => {
                const StepIcon = step.icon;
                return (
                  <div
                    key={step.label}
                    className="flex items-center gap-2 bg-[#201f1f] border border-white/10 rounded-xl px-3.5 py-2.5 text-slate-200"
                  >
                    <StepIcon className="w-4 h-4 text-[#C44900] shrink-0" />
                    <span className="text-xs">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Dedicated Android Mobile App Download Section */}
        <section
          id="android-download"
          className="mt-8 border-2 border-slate-200/80 bg-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm"
        >
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[#C44900] font-mono text-[11px] font-bold uppercase tracking-wider">
              <Smartphone className="w-3.5 h-3.5" />
              Android App • Capacitor
            </div>
            <h2 className="font-clash-semibold text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-3">
              Install OJT.SYS on Your Android Device
            </h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Get the dedicated Android APK for quick home-screen access to your daily Time-In/Time-Out punch clock, engineering task checklist, and 1:1 report exports.
            </p>
            <p className="font-mono text-[11px] text-slate-400 mt-2.5">
              Direct APK package • Allow &ldquo;Install unknown apps&rdquo; if prompted by Android.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-2.5 shrink-0">
            <a
              href="/downloads/ojt-sys.apk"
              download="ojt-sys.apk"
              className="h-12 px-6 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] text-white font-clash-semibold text-base tracking-tight inline-flex items-center justify-center gap-2.5 transition-all shadow-[0_12px_28px_-8px_rgba(196,73,0,0.4)] active:scale-[0.99]"
            >
              <Download className="w-4 h-4" />
              Download for Android (.apk)
            </a>
            <span className="font-mono text-[11px] text-slate-500 text-center md:text-right">
              v1.0.0 • Android 7.0+ (APK)
            </span>
          </div>
        </section>
      </main>

      {/* Burnt Orange Minimalist Footer */}
      <footer className="relative z-10 bg-[#C44900] text-white py-8 px-4 sm:px-6 border-t border-[#C44900]/20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="font-clash-semibold text-lg font-bold tracking-tight">
              OJT.SYS
            </p>
            <p className="font-mono text-[11px] text-orange-100/85 uppercase tracking-wider mt-0.5">
              Daily Attendance &amp; Accomplishment Tracker
            </p>
          </div>
          <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-wider">
            <Link href="/login" className="hover:text-slate-950 transition-colors">
              Login
            </Link>
            <Link href="/register" className="hover:text-slate-950 transition-colors">
              Register
            </Link>
            <Link href="/dashboard" className="hover:text-slate-950 transition-colors font-bold">
              Dashboard →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
