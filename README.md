# OJT.SYS — Internship Attendance & Report Tracker

A mobile-first On-the-Job Training (OJT) attendance tracker, smart task logger, and automated document generator built with **Next.js (App Router, TypeScript)**, **Tailwind CSS**, and **Supabase**.

Designed primarily for mobile use on iOS and Android browsers while providing full desktop support, **OJT.SYS** streamlines daily Time-In/Time-Out tracking, automatically converts selected engineering tasks into past-tense accomplishment statements, and produces 1:1 printable **Daily Attendance**, **Weekly Accomplishment**, and **Monthly Accomplishment** reports in `.docx` and `.pdf` formats.

---

## Key Features

- **Mobile-First Punch Clock**
  - Live digital clock (`Roboto Mono`) with Time-In and Time-Out confirmation modals.
  - Automatic whole-hour calculation rounded up cleanly (e.g., `9:00 AM` to `6:00 PM` = `9h`), with configurable lunch break deductions.
  - **Auto Time-Out Engine**: Automatically clocks out at the scheduled shift end time—blocked automatically if no task under *"What did you work on?"* is checked.
- **Automated Past-Tense Accomplishment Pipeline**
  - Select from structured engineering task categories plus custom *"Others"* notes.
  - Automatically summarizes daily tasks into past-tense bullet statements on Time-Out or Save using an AI fallback chain: **Google Gemini Flash** -> **Groq (Llama 3)** -> **OpenRouter** -> deterministic **Rule-Based Regex Converter**.
- **Full Attendance Ledger (CRUD)**
  - View, add, edit, and delete daily OJT logs with confirmation dialogs and `Month DD, YYYY` date formatting.
- **1:1 Official Reports & Preview**
  - **Attendance Report**, **Weekly Report** (Mon–Fri week selector), and **Monthly Report** (rolls up completed weeks with 1st-of-the-month submission readiness tracking).
  - **1:1 PDF Preview Modal** (powered by `pdf-lib` with exact NU Dasmariñas SECA header positioning, tables, cumulative totals, and signature blocks).
  - **DOCX & PDF Downloads** with confirmation dialogs.
- **Authentication & Onboarding**
  - Registration with NU school email validation, `BSIT` / `BSCS` program selection, formatted Student ID (`YYYY-NNNNNN`), and company-standard strong password verification.
  - Post-signup first-login onboarding modal for company, supervisor, and shift configuration.
  - Password recovery and reset flows via Supabase Auth.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 15 (App Router, React 19, TypeScript) |
| **Styling** | Tailwind CSS v4 (`Array`, `Clash Display`, `Inter`, `Roboto Mono`) |
| **Icons** | Lucide React |
| **Backend & Auth** | Supabase (`@supabase/ssr`, `@supabase/supabase-js`, PostgreSQL + RLS) |
| **Document Engine** | `pizzip`, `@xmldom/xmldom`, `pdf-lib` |
| **AI Summarizer** | Google Gemini Flash, Groq Llama 3, OpenRouter, Regex Fallback |

---

## Project Structure

```text
src/
├── app/
│   ├── api/
│   │   ├── ai/summarize/      # AI fallback chain + input sanitization + rate limiting
│   │   └── export/            # 1:1 DOCX injector & PDF generator endpoint
│   ├── auth/callback/         # Supabase PKCE auth code exchange
│   ├── dashboard/             # Main mobile-first workspace (Clock, Logs, Reports, Profile)
│   ├── forgot-password/       # Password reset request page
│   ├── login/                 # Sign in screen
│   ├── register/              # Trainee registration with strict validation
│   ├── reset-password/        # Password update screen
│   ├── layout.tsx             # Fonts, Open Graph, Twitter, and favicon metadata
│   ├── not-found.tsx          # Session-aware 404 page
│   └── page.tsx               # Editorial landing page
├── components/
│   ├── dashboard/             # PunchClockCard, LogsTab, ReportsTab, ProfileTab, InternshipSetupModal
│   ├── BrandMark.tsx          # Navigation brand mark
│   ├── ConfirmModal.tsx       # Reusable portal confirmation modal
│   ├── LandingNavActions.tsx  # Auth-aware navbar actions
│   └── ShapeGrid.tsx          # Static architectural background grid
├── lib/
│   ├── api-security.ts        # API auth verification, payload bounds, and rate limiting
│   ├── ojt-calculations.ts    # Whole-hour rounding, date formatting, weekly/monthly rollups
│   ├── past-tense-regex.ts    # Deterministic offline past-tense converter
│   ├── pdf-generator.ts       # 1:1 bordered PDF table & banner renderer
│   ├── sanitize.ts            # Input sanitization helpers
│   ├── storage.ts             # Local demo fallback persistence
│   ├── supabase/client.ts     # Browser Supabase client
│   └── validation.ts          # Form & password policy validators
├── middleware.ts              # HTTPS enforcement, security headers, Supabase cookie refresh
└── types/ojt.ts               # Shared TypeScript models
supabase/
└── schema.sql                 # PostgreSQL schema, triggers, and Row Level Security policies
```

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional AI keys (falls back to built-in Regex summarizer if omitted)
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key
OPENROUTER_API_KEY=your-openrouter-api-key

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Set Up Supabase Database & Auth

1. Open your Supabase project **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
2. In **Authentication -> URL Configuration**, set:
   - **Site URL**: `http://localhost:3000` (or your production domain)
   - **Redirect URLs**: `http://localhost:3000/auth/callback` and `http://localhost:3000/reset-password`

### 4. Add Official `.docx` Templates (For `.docx` Exports)

Place your three institutional `.docx` templates in the project root (or `templates/`):
- `SECA-CTNTERN-003-ATTENDANCE REPORT.docx`
- `SECA-CTNTERN-004-Weekly Report Template.docx`
- `SECA-CTNTERN-005-Monthly Report Template.docx`

*(Excluded from version control via `.gitignore`.)*

### 5. Run Locally

```bash
npm run dev
```

To test on a mobile device over local Wi-Fi:

```bash
npx next dev -H 0.0.0.0
```

---

## Security & Performance Highlights

- **HTTPS & Security Headers**: Production HTTP->HTTPS redirects, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy` via `src/middleware.ts`.
- **Authenticated & Rate-Limited APIs**: Server-side Supabase session verification, payload size limits, per-IP rate limiting, and strict input sanitization across `/api/ai/summarize` and `/api/export`.
- **Database Isolation**: Row Level Security (RLS) ensures trainees can only read and modify their own profile and attendance logs.
- **Optimized Delivery**: Dynamic lazy loading for dashboard tabs, Lucide tree-shaking (`optimizePackageImports`), gzip/brotli compression, and immutable CDN `Cache-Control` headers for static fonts and assets.

