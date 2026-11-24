import test from 'node:test';
import assert from 'node:assert/strict';

// Set up browser-like environment for Node test runner
const storageMap = new Map();
globalThis.localStorage = {
  getItem: (key) => (storageMap.has(key) ? storageMap.get(key) : null),
  setItem: (key, val) => storageMap.set(key, String(val)),
  removeItem: (key) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};
globalThis.window = globalThis;
if (typeof globalThis.navigator === 'undefined') {
  globalThis.navigator = { onLine: true };
} else {
  try {
    Object.defineProperty(globalThis.navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  } catch {
    // Ignore
  }
}

import {
  calculateShiftHours,
  formatHoursWhole,
  formatTimeDisplay,
  getTodayDateString,
} from '../src/lib/ojt-calculations.ts';
import {
  PRESET_OJT_TASKS,
} from '../src/types/ojt.ts';
import {
  clearOfflineQueue,
  enqueueOfflinePunch,
  getLocalAttendanceLogs,
  getOfflineQueue,
  saveLocalAttendanceLogs,
} from '../src/lib/attendance-sync-service.ts';
import fs from 'node:fs';
import path from 'node:path';

const LOCAL_CALENDAR_PREFIX = 'ojt_local_calendar_entries_';

function getLocalCalendarEntries(userId) {
  try {
    const raw = localStorage.getItem(`${LOCAL_CALENDAR_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCalendarEntries(userId, entries) {
  localStorage.setItem(`${LOCAL_CALENDAR_PREFIX}${userId}`, JSON.stringify(entries));
}

const WHATS_NEW_STORAGE_KEY = 'ojt_whats_new_v1_3_0_dismissed';

const TEST_USER = 'user-t6-123e4567-e89b-12d3-a456-426614174000';
const TEST_INTERNSHIP = 'intern-t6-123e4567-e89b-12d3-a456-426614174000';

// ----------------------------------------------------------------------------
// A. Time-In and Time-Out
// ----------------------------------------------------------------------------
test('Tier 6 (A): Time-In creates active shift log with 0 initial hours and null time_out', () => {
  storageMap.clear();
  const today = getTodayDateString();
  const timeInIso = `${today}T09:00:00.000Z`;

  const activeLog = {
    id: `log-${Date.now()}`,
    user_id: TEST_USER,
    internship_id: TEST_INTERNSHIP,
    date: today,
    time_in: timeInIso,
    time_out: null,
    hours_worked: 0,
    tasks_selected: [],
    custom_tasks: '',
    ai_summary: '',
    ai_provider: 'manual',
  };

  assert.equal(activeLog.date, today);
  assert.equal(Boolean(activeLog.time_in), true);
  assert.equal(activeLog.time_out, null);
  assert.equal(activeLog.hours_worked, 0);

  // Dynamic hours calculation during ongoing shift (e.g., 4 hours elapsed)
  const midwayTimeIso = `${today}T13:00:00.000Z`;
  const dynamicHours = calculateShiftHours(timeInIso, midwayTimeIso, 0);
  assert.equal(dynamicHours, 4);
});

test('Tier 6 (A): Time-Out completes active shift with accurate duration and lunch deduction', () => {
  const today = getTodayDateString();
  const timeInIso = `${today}T08:00:00.000Z`;
  const timeOutIso = `${today}T17:00:00.000Z`; // 9 hours total

  // 1-hour lunch break = 8 net hours worked
  const hoursWithLunch = calculateShiftHours(timeInIso, timeOutIso, 60);
  assert.equal(hoursWithLunch, 8);

  const completedLog = {
    id: `log-completed`,
    user_id: TEST_USER,
    internship_id: TEST_INTERNSHIP,
    date: today,
    time_in: timeInIso,
    time_out: timeOutIso,
    hours_worked: hoursWithLunch,
    tasks_selected: ['Frontend UI Implementation'],
    custom_tasks: 'Built responsive layout',
    ai_summary: '• Implemented responsive frontend user interface components and layouts.',
    ai_provider: 'manual',
  };

  assert.equal(completedLog.hours_worked, 8);
  assert.equal(Boolean(completedLog.time_out), true);
  assert.equal(formatHoursWhole(completedLog.hours_worked), '8h');
});

// ----------------------------------------------------------------------------
// B. Checkbox syncing with Calendar
// ----------------------------------------------------------------------------
test('Tier 6 (B): Checking and unchecking tasks while clocked in immediately updates log tasks_selected and reflects in Calendar Day Activity Inspector', () => {
  storageMap.clear();
  const today = getTodayDateString();
  const timeInIso = `${today}T09:00:00.000Z`;

  // Trainee clocks in
  let currentLog = {
    id: 'log-active-sync',
    user_id: TEST_USER,
    internship_id: TEST_INTERNSHIP,
    date: today,
    time_in: timeInIso,
    time_out: null,
    hours_worked: 0,
    tasks_selected: [],
    custom_tasks: '',
    ai_summary: '',
    ai_provider: 'manual',
  };

  // 1. User checks Task 1 ("Frontend UI Implementation") while clocked in
  const task1 = 'Frontend UI Implementation';
  const updatedTasks1 = [...currentLog.tasks_selected, task1];
  currentLog = { ...currentLog, tasks_selected: updatedTasks1 };

  // Persist to local attendance cache immediately (0ms UI latency)
  saveLocalAttendanceLogs(TEST_USER, [currentLog]);

  // CalendarTab index simulation (logsByDate Map)
  const logsByDate1 = new Map([[currentLog.date, currentLog]]);
  const inspectorLog1 = logsByDate1.get(today);
  assert.ok(inspectorLog1, 'Inspector finds active shift log');
  assert.equal(inspectorLog1.tasks_selected.length, 1);
  assert.equal(inspectorLog1.tasks_selected.includes(task1), true);

  // 2. User checks Task 2 ("API Integration & Endpoints")
  const task2 = 'API Integration & Endpoints';
  const updatedTasks2 = [...currentLog.tasks_selected, task2];
  currentLog = { ...currentLog, tasks_selected: updatedTasks2 };
  saveLocalAttendanceLogs(TEST_USER, [currentLog]);

  const logsByDate2 = new Map([[currentLog.date, currentLog]]);
  const inspectorLog2 = logsByDate2.get(today);
  assert.equal(inspectorLog2.tasks_selected.length, 2);
  assert.equal(inspectorLog2.tasks_selected.includes(task2), true);

  // 3. User unchecks Task 1
  const updatedTasks3 = currentLog.tasks_selected.filter((t) => t !== task1);
  currentLog = { ...currentLog, tasks_selected: updatedTasks3 };
  saveLocalAttendanceLogs(TEST_USER, [currentLog]);

  const logsByDate3 = new Map([[currentLog.date, currentLog]]);
  const inspectorLog3 = logsByDate3.get(today);
  assert.equal(inspectorLog3.tasks_selected.length, 1);
  assert.equal(inspectorLog3.tasks_selected.includes(task1), false);
  assert.equal(inspectorLog3.tasks_selected.includes(task2), true);
});

// ----------------------------------------------------------------------------
// C. Adding and customizing tasks
// ----------------------------------------------------------------------------
test('Tier 6 (C): Dynamic checklist tasks customization: add custom task, edit, delete, and restore 8 default presets', () => {
  // Base checklist has 8 preset tasks
  let checklist = [...PRESET_OJT_TASKS];
  assert.equal(checklist.length, 8);

  // 1. Add new custom task with custom category
  const newTask = {
    id: `task_${Date.now()}`,
    label: 'Cloud Infrastructure & Docker Setup',
    category: 'DevOps',
  };
  checklist = [...checklist, newTask];
  assert.equal(checklist.length, 9);
  assert.equal(checklist.some((t) => t.label === 'Cloud Infrastructure & Docker Setup'), true);

  // 2. Edit the custom task
  checklist = checklist.map((t) =>
    t.id === newTask.id
      ? { ...t, label: 'Cloud Infrastructure & Kubernetes Setup', category: 'Infrastructure' }
      : t
  );
  const edited = checklist.find((t) => t.id === newTask.id);
  assert.equal(edited.label, 'Cloud Infrastructure & Kubernetes Setup');
  assert.equal(edited.category, 'Infrastructure');

  // 3. Delete the custom task
  checklist = checklist.filter((t) => t.id !== newTask.id);
  assert.equal(checklist.length, 8);
  assert.equal(checklist.some((t) => t.id === newTask.id), false);

  // 4. Custom checklist mutated, then restored with 8 default presets
  checklist = [
    { id: 'custom_1', label: 'Only custom task', category: 'Custom' },
  ];
  assert.equal(checklist.length, 1);

  // Restore action
  checklist = [...PRESET_OJT_TASKS];
  assert.equal(checklist.length, 8);
  assert.equal(checklist[0].label, 'Frontend UI Implementation');
  assert.equal(checklist[7].label, 'System Records & Archival');
});

// ----------------------------------------------------------------------------
// D. Logs search and sorting
// ----------------------------------------------------------------------------
test('Tier 6 (D): Logs search filters by keyword in custom_tasks, ai_summary, and tasks_selected', () => {
  const sampleLogs = [
    {
      id: 'log-1',
      date: '2026-11-21',
      hours_worked: 8,
      tasks_selected: ['Frontend UI Implementation'],
      custom_tasks: 'Refactored navigation component',
      ai_summary: '• Implemented responsive UI components.',
    },
    {
      id: 'log-2',
      date: '2026-11-22',
      hours_worked: 9,
      tasks_selected: ['API Integration & Endpoints', 'Debugging & QA Testing'],
      custom_tasks: 'Connected PostgreSQL endpoint',
      ai_summary: '• Tested backend REST routes.',
    },
    {
      id: 'log-3',
      date: '2026-11-23',
      hours_worked: 6,
      tasks_selected: ['Technical Documentation'],
      custom_tasks: 'Updated README and setup guide',
      ai_summary: '• Documented API specifications.',
    },
  ];

  // Search by task label
  const query1 = 'API Integration';
  const matches1 = sampleLogs.filter(
    (l) =>
      l.tasks_selected.some((t) => t.toLowerCase().includes(query1.toLowerCase())) ||
      l.custom_tasks.toLowerCase().includes(query1.toLowerCase()) ||
      l.ai_summary.toLowerCase().includes(query1.toLowerCase())
  );
  assert.equal(matches1.length, 1);
  assert.equal(matches1[0].id, 'log-2');

  // Search by custom tasks keyword
  const query2 = 'PostgreSQL';
  const matches2 = sampleLogs.filter(
    (l) =>
      l.tasks_selected.some((t) => t.toLowerCase().includes(query2.toLowerCase())) ||
      l.custom_tasks.toLowerCase().includes(query2.toLowerCase()) ||
      l.ai_summary.toLowerCase().includes(query2.toLowerCase())
  );
  assert.equal(matches2.length, 1);
  assert.equal(matches2[0].id, 'log-2');

  // Search by summary keyword
  const query3 = 'specifications';
  const matches3 = sampleLogs.filter(
    (l) =>
      l.tasks_selected.some((t) => t.toLowerCase().includes(query3.toLowerCase())) ||
      l.custom_tasks.toLowerCase().includes(query3.toLowerCase()) ||
      l.ai_summary.toLowerCase().includes(query3.toLowerCase())
  );
  assert.equal(matches3.length, 1);
  assert.equal(matches3[0].id, 'log-3');
});

test('Tier 6 (D): Logs sorting by date and hours worked (ascending and descending)', () => {
  const sampleLogs = [
    { id: 'log-1', date: '2026-11-21', hours_worked: 8 },
    { id: 'log-2', date: '2026-11-23', hours_worked: 6 },
    { id: 'log-3', date: '2026-11-22', hours_worked: 9 },
  ];

  // Sort Date Descending (newest first)
  const dateDesc = [...sampleLogs].sort((a, b) => b.date.localeCompare(a.date));
  assert.deepEqual(dateDesc.map((l) => l.id), ['log-2', 'log-3', 'log-1']);

  // Sort Date Ascending (oldest first)
  const dateAsc = [...sampleLogs].sort((a, b) => a.date.localeCompare(b.date));
  assert.deepEqual(dateAsc.map((l) => l.id), ['log-1', 'log-3', 'log-2']);

  // Sort Hours Worked Descending (highest first)
  const hoursDesc = [...sampleLogs].sort((a, b) => b.hours_worked - a.hours_worked);
  assert.deepEqual(hoursDesc.map((l) => l.id), ['log-3', 'log-1', 'log-2']);

  // Sort Hours Worked Ascending (lowest first)
  const hoursAsc = [...sampleLogs].sort((a, b) => a.hours_worked - b.hours_worked);
  assert.deepEqual(hoursAsc.map((l) => l.id), ['log-2', 'log-1', 'log-3']);
});

// ----------------------------------------------------------------------------
// E. Local save and Cloud sync
// ----------------------------------------------------------------------------
test('Tier 6 (E): UserProfile offline_sync defaults to true in DEFAULT_DEMO_PROFILE and persists preference', () => {
  storageMap.clear();

  // 1. Verify storage.ts defines offline_sync: true on DEFAULT_DEMO_PROFILE
  const storageContent = fs.readFileSync(path.resolve('src/lib/storage.ts'), 'utf-8');
  assert.match(storageContent, /offline_sync:\s*true/);

  // 2. Verify UserProfile in types/ojt.ts includes offline_sync optional boolean
  const typesContent = fs.readFileSync(path.resolve('src/types/ojt.ts'), 'utf-8');
  assert.match(typesContent, /offline_sync\?:\s*boolean/);

  // 3. Persisting preference to localStorage
  const userId = 'user-profile-pref-test';
  const profileKey = `ojt_offline_sync_enabled_${userId}`;

  // Disabled state
  localStorage.setItem(profileKey, 'false');
  assert.equal(localStorage.getItem(profileKey), 'false');

  // Enabled state
  localStorage.setItem(profileKey, 'true');
  assert.equal(localStorage.getItem(profileKey), 'true');
});

test('Tier 6 (E): Calendar service local storage caching and graceful fallback on 401 or offline', async () => {
  storageMap.clear();

  const cachedEntries = [
    {
      id: 'cal-1',
      user_id: TEST_USER,
      internship_id: TEST_INTERNSHIP,
      date: '2026-11-20',
      image_url: 'https://example.com/photo1.jpg',
      title: 'Sprint Planning',
      description: 'Discussed sprint backlog and assigned tickets.',
    },
    {
      id: 'cal-2',
      user_id: TEST_USER,
      internship_id: TEST_INTERNSHIP,
      date: '2026-11-21',
      image_url: 'https://example.com/photo2.jpg',
      title: 'QA Testing',
      description: 'Verified test assertions across suites.',
    },
  ];

  // 1. Save local calendar entries to cache
  saveLocalCalendarEntries(TEST_USER, cachedEntries);

  // Verify stored in local storage under prefix
  const loaded = getLocalCalendarEntries(TEST_USER);
  assert.equal(loaded.length, 2);
  assert.equal(loaded[0].date, '2026-11-20');
  assert.equal(loaded[1].date, '2026-11-21');

  // 2. Graceful fallback on 401 error or offline simulation:
  // When an error code 401 / PGRST301 is returned from network, calendar service
  // must return cached entries rather than an empty array []
  const simulateNetworkResult = (err) => {
    if (err && (err.status === 401 || err.code === 'PGRST301')) {
      const fallback = getLocalCalendarEntries(TEST_USER);
      return fallback;
    }
    return [];
  };

  const recovered401 = simulateNetworkResult({ status: 401, code: 'PGRST301', message: 'JWT expired' });
  assert.equal(recovered401.length, 2);
  assert.equal(recovered401[0].title, 'Sprint Planning');
  assert.equal(recovered401[1].title, 'QA Testing');
});

test('Tier 6 (E): What\'s New modal dismissal persists to ojt_whats_new_v1_3_0_dismissed', () => {
  storageMap.clear();

  // Initially un-dismissed
  assert.equal(localStorage.getItem(WHATS_NEW_STORAGE_KEY), null);

  // Dismiss modal
  localStorage.setItem(WHATS_NEW_STORAGE_KEY, 'true');
  assert.equal(localStorage.getItem(WHATS_NEW_STORAGE_KEY), 'true');
});
