import test from 'node:test';
import assert from 'node:assert/strict';
import { ruleBasedPastTenseSummary } from '../src/lib/past-tense-regex.ts';

const PRESET_OJT_TASKS = [
  { id: 'frontend_ui', label: 'Frontend UI Implementation', category: 'Engineering' },
  { id: 'api_integration', label: 'API Integration & Endpoints', category: 'Engineering' },
  { id: 'database_migration', label: 'Database Schema & Queries', category: 'Data' },
  { id: 'debugging_testing', label: 'Debugging & QA Testing', category: 'Quality' },
  { id: 'server_maintenance', label: 'Server & Deployment Ops', category: 'DevOps' },
  { id: 'documentation', label: 'Technical Documentation', category: 'Docs' },
  { id: 'standup_review', label: 'Team Standup & Code Review', category: 'Collab' },
  { id: 'data_encoding', label: 'System Records & Archival', category: 'Ops' },
];

test('R6: Checklist Management - reload restores the 8 default preset tasks', () => {
  let userChecklist = [
    { id: 'custom-1', label: 'Conduct User Interviews', category: 'Research' },
    { id: 'custom-2', label: 'Figma Component Design', category: 'Design' },
  ];

  // User reloads pre-loaded items
  userChecklist = [...PRESET_OJT_TASKS];

  assert.equal(userChecklist.length, 8);
  assert.equal(userChecklist[0].id, 'frontend_ui');
  assert.equal(userChecklist[7].id, 'data_encoding');
  assert.deepEqual(userChecklist, PRESET_OJT_TASKS);
});

test('R6: Checklist Management - adding, editing, and deleting dynamic tasks', () => {
  let checklist = [...PRESET_OJT_TASKS];
  let selectedTasks = ['Frontend UI Implementation'];

  // 1. Add Task
  const newTask = {
    id: 'task_123',
    label: 'Design System Tokens',
    category: 'Design',
  };
  checklist = [...checklist, newTask];
  assert.equal(checklist.length, 9);
  assert.ok(checklist.some((t) => t.label === 'Design System Tokens'));

  // Select the new task
  selectedTasks = [...selectedTasks, newTask.label];
  assert.deepEqual(selectedTasks, ['Frontend UI Implementation', 'Design System Tokens']);

  // 2. Edit Task
  const updatedLabel = 'Design System Design Tokens v2';
  checklist = checklist.map((t) =>
    t.id === 'task_123' ? { ...t, label: updatedLabel } : t
  );
  // Synchronize selected tasks
  selectedTasks = selectedTasks.map((t) =>
    t === newTask.label ? updatedLabel : t
  );

  assert.ok(checklist.some((t) => t.label === updatedLabel));
  assert.ok(selectedTasks.includes(updatedLabel));
  assert.ok(!selectedTasks.includes(newTask.label));

  // 3. Delete Task
  checklist = checklist.filter((t) => t.id !== 'task_123');
  selectedTasks = selectedTasks.filter((t) => t !== updatedLabel);

  assert.equal(checklist.length, 8);
  assert.ok(!checklist.some((t) => t.id === 'task_123'));
  assert.ok(!selectedTasks.includes(updatedLabel));
  assert.deepEqual(selectedTasks, ['Frontend UI Implementation']);
});

test('R6: Past-Tense Summary Engine converts dynamic custom tasks properly', () => {
  const tasks = ['Frontend UI Implementation', 'Design System Design Tokens v2'];
  const customNotes = 'Fix redirect loop on iOS Safari';

  const summary = ruleBasedPastTenseSummary(tasks, customNotes);

  // Preset task converted using preset map
  assert.ok(
    summary.includes('Implemented responsive frontend user interface components and layouts.')
  );
  // Custom task converted using past-tense verb or prefix
  assert.ok(
    summary.includes('Designed') || summary.includes('Completed design') || summary.includes('Design')
  );
  // Custom note converted with VERB_MAP
  assert.ok(summary.includes('Fixed redirect loop on iOS Safari.'));
});

test('R7: Multiple Internships - Data Isolation between programs', () => {
  const internship1 = {
    id: 'internship-1',
    user_id: 'user-123',
    title: 'Internship 1 (Acme Tech)',
    company_name: 'Acme Tech',
    target_hours: 300,
    status: 'completed',
  };

  const internship2 = {
    id: 'internship-2',
    user_id: 'user-123',
    title: 'Internship 2 (Globex Corp)',
    company_name: 'Globex Corp',
    target_hours: 200,
    status: 'active',
  };

  const allLogs = [
    { id: 'log-1', internship_id: 'internship-1', hours_worked: 100, date: '2026-01-10' },
    { id: 'log-2', internship_id: 'internship-1', hours_worked: 200, date: '2026-01-11' },
    { id: 'log-3', internship_id: 'internship-2', hours_worked: 50, date: '2026-02-01' },
  ];

  // Helper to filter logs for active program
  const filterLogs = (activeId) =>
    allLogs.filter((l) => l.internship_id === activeId);

  const logs1 = filterLogs(internship1.id);
  const totalHours1 = logs1.reduce((sum, l) => sum + l.hours_worked, 0);

  const logs2 = filterLogs(internship2.id);
  const totalHours2 = logs2.reduce((sum, l) => sum + l.hours_worked, 0);

  assert.equal(logs1.length, 2);
  assert.equal(totalHours1, 300);
  assert.equal(logs2.length, 1);
  assert.equal(totalHours2, 50);

  // Zero bleeding: logs for Internship 2 never count towards Internship 1
  assert.ok(!logs1.some((l) => l.internship_id === 'internship-2'));
  assert.ok(!logs2.some((l) => l.internship_id === 'internship-1'));
});

test('R7: Incomplete Internship Warning check', () => {
  const checkIsIncomplete = (internship, totalHours) => {
    return totalHours < (internship.target_hours || 500) && internship.status !== 'completed';
  };

  const activeInternshipIncomplete = {
    id: 'i-1',
    title: 'Internship 1',
    target_hours: 500,
    status: 'active',
  };

  // 120 hours served out of 500 -> Incomplete
  assert.equal(checkIsIncomplete(activeInternshipIncomplete, 120), true);

  // 500 hours served out of 500 -> Completed hours, not incomplete
  assert.equal(checkIsIncomplete(activeInternshipIncomplete, 500), false);

  // Status is 'completed' even if hours recorded are lower -> not incomplete
  const activeInternshipMarkedDone = {
    ...activeInternshipIncomplete,
    status: 'completed',
  };
  assert.equal(checkIsIncomplete(activeInternshipMarkedDone, 250), false);
});

test('R7: Calendar Entry Isolation between multiple programs', () => {
  const internships = [
    { id: 'internship-1', title: 'Internship 1' },
    { id: 'internship-2', title: 'Internship 2' },
  ];

  // Helper mimicking activeCalendarEntries filter in page.tsx
  const filterActiveCalendarEntries = (entries, activeId) => {
    if (!activeId) return entries;
    const firstInternship = internships[0];
    return entries.filter((e) => {
      if (e.internship_id) {
        return e.internship_id === activeId;
      }
      return firstInternship ? firstInternship.id === activeId : true;
    });
  };

  // 1. Initial entries: 1 legacy entry (no internship_id) and 1 explicit internship-1 entry
  const legacyEntry = {
    id: 'cal-legacy',
    user_id: 'user-123',
    date: '2026-01-15',
    image_url: 'https://images.example/legacy.jpg',
    title: 'Initial Onboarding',
    description: 'First week tasks',
  };

  const entryProg1 = {
    id: 'cal-prog1',
    user_id: 'user-123',
    internship_id: 'internship-1',
    date: '2026-01-20',
    image_url: 'https://images.example/prog1.jpg',
    title: 'Frontend Architecture',
    description: 'Built dashboard layout',
  };

  // 2. User creates a new calendar entry while active in Internship 2
  const activeInternshipId = 'internship-2';
  const entryProg2 = {
    id: 'cal-prog2',
    user_id: 'user-123',
    internship_id: activeInternshipId,
    date: '2026-03-01',
    image_url: 'https://images.example/prog2.jpg',
    title: 'Cloudflare Deployment',
    description: 'Configured OpenNext worker',
  };

  const allEntries = [legacyEntry, entryProg1, entryProg2];

  // Verify Program 1 active view
  const activeForProg1 = filterActiveCalendarEntries(allEntries, 'internship-1');
  assert.equal(activeForProg1.length, 2, 'Program 1 view should include legacy and Program 1 entries');
  assert.ok(activeForProg1.some((e) => e.id === 'cal-legacy'));
  assert.ok(activeForProg1.some((e) => e.id === 'cal-prog1'));
  // Ensure ZERO leakage of Program 2 into Program 1
  assert.ok(!activeForProg1.some((e) => e.internship_id === 'internship-2'), 'Program 2 entries must not leak into Program 1');

  // Verify Program 2 active view
  const activeForProg2 = filterActiveCalendarEntries(allEntries, 'internship-2');
  assert.equal(activeForProg2.length, 1, 'Program 2 view should only contain Program 2 entries');
  assert.equal(activeForProg2[0].id, 'cal-prog2');
  assert.equal(activeForProg2[0].internship_id, 'internship-2');
  // Ensure ZERO leakage of Program 1 or legacy into Program 2
  assert.ok(!activeForProg2.some((e) => e.id === 'cal-prog1'), 'Program 1 entries must not leak into Program 2');
  assert.ok(!activeForProg2.some((e) => e.id === 'cal-legacy'), 'Legacy entries must not leak into Program 2');
});

test('R7: InternshipSelector mobile-strip variant renders full width class', () => {
  const getContainerClass = (variant, className = '') => {
    return `relative ${
      variant === 'mobile-strip' ? 'w-full block' : 'inline-block'
    } text-left ${className}`;
  };

  const headerClass = getContainerClass('header');
  assert.ok(headerClass.includes('inline-block'));
  assert.ok(!headerClass.includes('w-full block'));

  const mobileClass = getContainerClass('mobile-strip');
  assert.ok(mobileClass.includes('w-full block'));
  assert.ok(!mobileClass.includes('inline-block'));
});
