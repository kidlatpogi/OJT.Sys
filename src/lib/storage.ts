import { AttendanceLog, UserProfile } from '@/types/ojt';

const PROFILE_KEY = 'ojt_demo_profile_v1';
const LOGS_KEY = 'ojt_demo_logs_v1';
const SESSION_KEY = 'ojt_demo_session_v1';

export const DEFAULT_DEMO_PROFILE: UserProfile = {
  id: 'demo-trainee-001',
  email: 'bautistaz@students.nu-dasma.edu.ph',
  full_name: 'Zeus Angelo Bautista',
  student_id: '2024-100001',
  program: 'BSIT',
  company_name: 'Tech Innovations Inc.',
  branch_department: 'Software Engineering Dept.',
  supervisor_name: 'Engr. Maria Clara Santos',
  supervisor_position: 'Senior Engineering Lead',
  trainor_name: 'Mark Anthony Reyes',
  start_date: '2026-08-03',
  target_hours: 500,
  daily_start_time: '09:00',
  daily_end_time: '18:00',
  lunch_break_minutes: 0,
  auto_time_out: true,
  academic_term: 'TERM 2 AY 2025 - 2026',
};

function seedInitialLogs(): AttendanceLog[] {
  const today = new Date();
  const fmt = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() - offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const d1 = fmt(3);
  const d2 = fmt(2);
  const d3 = fmt(1);

  return [
    {
      id: 'seed-1',
      user_id: 'demo-trainee-001',
      date: d1,
      time_in: `${d1}T09:00:00`,
      time_out: `${d1}T18:00:00`,
      hours_worked: 9,
      tasks_selected: ['Frontend UI Implementation', 'Team Standup & Code Review'],
      custom_tasks: 'Scaffold mobile punch clock view',
      ai_summary:
        '• Implemented responsive frontend user interface components and layouts.\n• Participated in daily team standups and peer code reviews.\n• Scaffolded the mobile punch clock view.',
      ai_provider: 'seed',
    },
    {
      id: 'seed-2',
      user_id: 'demo-trainee-001',
      date: d2,
      time_in: `${d2}T09:00:00`,
      time_out: `${d2}T18:00:00`,
      hours_worked: 9,
      tasks_selected: ['API Integration & Endpoints', 'Database Schema & Queries'],
      custom_tasks: 'Test Supabase attendance log queries',
      ai_summary:
        '• Integrated backend API endpoints and handled asynchronous data responses.\n• Updated database schemas, queries, and relational data records.\n• Tested Supabase attendance log queries.',
      ai_provider: 'seed',
    },
    {
      id: 'seed-3',
      user_id: 'demo-trainee-001',
      date: d3,
      time_in: `${d3}T09:00:00`,
      time_out: `${d3}T18:00:00`,
      hours_worked: 9,
      tasks_selected: ['Debugging & QA Testing', 'Technical Documentation'],
      custom_tasks: 'Verify report exports',
      ai_summary:
        '• Debugged application issues and performed quality assurance testing.\n• Prepared and updated technical documentation for system workflows.\n• Verified report exports.',
      ai_provider: 'seed',
    },
  ];
}

export function getDemoSession(): { email: string; full_name: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setDemoSession(session: { email: string; full_name: string } | null) {
  if (typeof window === 'undefined') return;
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
  } else {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

export function loadDemoProfile(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_DEMO_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(DEFAULT_DEMO_PROFILE));
      return DEFAULT_DEMO_PROFILE;
    }
    return { ...DEFAULT_DEMO_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_DEMO_PROFILE;
  }
}

export function saveDemoProfile(profile: UserProfile) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadDemoLogs(): AttendanceLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    if (!raw) {
      const seeded = seedInitialLogs();
      localStorage.setItem(LOGS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveDemoLogs(logs: AttendanceLog[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

