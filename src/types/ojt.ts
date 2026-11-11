export interface UserProfile {
  id: string;
  email?: string;
  full_name: string;
  student_id: string;
  program: string;
  company_name: string;
  branch_department: string;
  supervisor_name: string;
  supervisor_position: string;
  trainor_name: string;
  start_date: string;
  target_hours: number;
  daily_start_time: string;
  daily_end_time: string;
  lunch_break_minutes: number;
  auto_time_out?: boolean;
  academic_term: string;
}

export interface AttendanceLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  time_in: string | null; // ISO timestamp
  time_out: string | null; // ISO timestamp
  hours_worked: number;
  tasks_selected: string[];
  custom_tasks: string;
  ai_summary: string;
  ai_provider?: string;
}

export interface WeeklySummary {
  id: string;
  user_id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  consolidated_text: string;
  total_weekly_hours: number;
}

export const PRESET_OJT_TASKS: { id: string; label: string; category: string }[] = [
  { id: 'frontend_ui', label: 'Frontend UI Implementation', category: 'Engineering' },
  { id: 'api_integration', label: 'API Integration & Endpoints', category: 'Engineering' },
  { id: 'database_migration', label: 'Database Schema & Queries', category: 'Data' },
  { id: 'debugging_testing', label: 'Debugging & QA Testing', category: 'Quality' },
  { id: 'server_maintenance', label: 'Server & Deployment Ops', category: 'DevOps' },
  { id: 'documentation', label: 'Technical Documentation', category: 'Docs' },
  { id: 'standup_review', label: 'Team Standup & Code Review', category: 'Collab' },
  { id: 'data_encoding', label: 'System Records & Archival', category: 'Ops' },
];

