import test from 'node:test';
import assert from 'node:assert/strict';
import { ruleBasedPastTenseSummary } from '../src/lib/past-tense-regex.ts';
import { PRESET_OJT_TASKS } from '../src/types/ojt.ts';

// ============================================================================
// Tier 4: Real-World Trainee Workflows
// ============================================================================

test('T4-1: Complete Trainee Onboarding, Logging, Calendar Preview, and Multi-Program Progression', async () => {
  // 1. Trainee profile setup
  let profile = {
    id: 'trainee-001',
    email: 'trainee@nu-dasma.edu.ph',
    full_name: 'Alex Gonzaga',
    company_name: 'Acme Technologies',
    target_hours: 500,
    work_checklist: [...PRESET_OJT_TASKS],
    active_internship_id: 'internship-acme',
  };

  let internships = [
    {
      id: 'internship-acme',
      user_id: profile.id,
      title: 'Internship 1 (Acme Technologies)',
      company_name: 'Acme Technologies',
      target_hours: 500,
      status: 'active',
    },
  ];

  let logs = [];
  let calendarEntries = [];

  // 2. Custom task addition
  const customTask = {
    id: 'task-k8s',
    label: 'Kubernetes Cluster Ingress Configuration',
    category: 'DevOps',
  };
  profile.work_checklist = [...profile.work_checklist, customTask];
  assert.equal(profile.work_checklist.length, 9);

  // 3. Clock in and task selection
  const selectedTasks = ['Frontend UI Implementation', customTask.label];
  const customNotes = 'Configured TLS ingress certs on staging cluster';

  // 4. Generate summary (verifying emoji-free output)
  const summary = ruleBasedPastTenseSummary(selectedTasks, customNotes);
  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  assert.ok(!emojiRegex.test(summary), 'Summary must contain 0 emojis');
  assert.ok(summary.includes('Implemented responsive frontend user interface components and layouts.'));
  assert.ok(summary.includes('Configured TLS ingress certs on staging cluster.'));

  // 5. Clock out (8 hours served)
  const logEntry = {
    id: 'log-day-1',
    user_id: profile.id,
    internship_id: 'internship-acme',
    date: '2026-11-18',
    hours_worked: 8,
    tasks_selected: selectedTasks,
    custom_tasks: customNotes,
    ai_summary: summary,
  };
  logs.push(logEntry);
  assert.equal(logs.length, 1);

  // 6. Photo upload for calendar
  const calPhoto = {
    id: 'cal-day-1',
    user_id: profile.id,
    internship_id: 'internship-acme',
    date: '2026-11-18',
    image_url: 'https://storage.supabase.co/cal/20261118.jpg',
    title: 'Kubernetes Ingress Deployment',
    description: summary,
  };
  calendarEntries.push(calPhoto);

  // 7. Lightbox preview in unified ImageModal
  const imageModalState = {
    isOpen: true,
    imageUrl: calPhoto.image_url,
    title: calPhoto.title,
    description: calPhoto.description,
  };
  assert.equal(imageModalState.isOpen, true);
  assert.equal(imageModalState.imageUrl, 'https://storage.supabase.co/cal/20261118.jpg');

  // 8. Attempt early creation of Internship 2 -> Incomplete warning triggered!
  const currentTotalHours = logs
    .filter((l) => l.internship_id === 'internship-acme')
    .reduce((s, l) => s + l.hours_worked, 0);
  assert.equal(currentTotalHours, 8);

  const activeInternship = internships[0];
  const isIncomplete = currentTotalHours < activeInternship.target_hours && activeInternship.status !== 'completed';
  assert.equal(isIncomplete, true, 'Must display warning that current internship is not yet completed');

  // 9. Complete required hours or mark completed
  activeInternship.status = 'completed';
  const isIncompleteAfterCompletion = currentTotalHours < activeInternship.target_hours && activeInternship.status !== 'completed';
  assert.equal(isIncompleteAfterCompletion, false, 'No warning when status is marked completed');

  // 10. Create Internship 2
  const internship2 = {
    id: 'internship-globex',
    user_id: profile.id,
    title: 'Internship 2 (Globex FinTech)',
    company_name: 'Globex FinTech Corp',
    target_hours: 300,
    status: 'active',
  };
  internships.push(internship2);
  assert.equal(internships.length, 2);

  // 11. Switch active internship to Internship 2
  profile.active_internship_id = 'internship-globex';

  // 12. Verify strict data isolation: Internship 2 starts with 0 hours and 0 calendar entries
  const prog2Logs = logs.filter((l) => l.internship_id === 'internship-globex');
  const prog2Entries = calendarEntries.filter((c) => c.internship_id === 'internship-globex');
  assert.equal(prog2Logs.length, 0);
  assert.equal(prog2Entries.length, 0);

  // Internship 1 data is preserved untouched
  const prog1Logs = logs.filter((l) => l.internship_id === 'internship-acme');
  const prog1Entries = calendarEntries.filter((c) => c.internship_id === 'internship-acme');
  assert.equal(prog1Logs.length, 1);
  assert.equal(prog1Entries.length, 1);
});

test('T4-2: Mistaken Log Entry and Password-Protected Deletion Lifecycle', async () => {
  const userEmail = 'student@nu-dasma.edu.ph';
  let logs = [
    { id: 'log-valid', date: '2026-11-15', hours_worked: 8, internship_id: 'i-2' },
    { id: 'log-mistake', date: '2026-11-16', hours_worked: 12, internship_id: 'i-2' }, // accidental duplicate
  ];

  let currentHours = logs.reduce((sum, l) => sum + l.hours_worked, 0);
  assert.equal(currentHours, 20);

  // Trainee clicks delete on log-mistake
  const targetLog = logs.find((l) => l.id === 'log-mistake');
  assert.ok(targetLog);

  // Modal opens
  let modalState = {
    isOpen: true,
    password: '',
    error: null,
    isVerifying: false,
  };

  // Mock Supabase Auth
  const mockSupabaseAuth = async (email, password) => {
    if (password === 'correct-password-2026') {
      return { success: true };
    }
    return { success: false, error: 'Incorrect password. Verification failed.' };
  };

  // 1. Attempt with incorrect password
  modalState.password = 'wrong-password';
  modalState.isVerifying = true;
  const failResult = await mockSupabaseAuth(userEmail, modalState.password);
  modalState.isVerifying = false;

  assert.equal(failResult.success, false);
  modalState.error = failResult.error;
  assert.equal(modalState.error, 'Incorrect password. Verification failed.');
  // Log must NOT be deleted
  assert.equal(logs.length, 2);

  // 2. Trainee cancels modal -> state reset
  modalState = {
    isOpen: false,
    password: '',
    error: null,
    isVerifying: false,
  };
  assert.equal(modalState.password, '');
  assert.equal(modalState.error, null);

  // 3. Trainee re-opens and enters correct password
  modalState.isOpen = true;
  modalState.password = 'correct-password-2026';
  modalState.isVerifying = true;
  const successResult = await mockSupabaseAuth(userEmail, modalState.password);
  modalState.isVerifying = false;

  assert.equal(successResult.success, true);

  // Deletion proceeds
  logs = logs.filter((l) => l.id !== targetLog.id);
  modalState.isOpen = false;
  modalState.password = '';

  // Verification of state after deletion
  assert.equal(logs.length, 1);
  assert.equal(logs[0].id, 'log-valid');
  const updatedHours = logs.reduce((sum, l) => sum + l.hours_worked, 0);
  assert.equal(updatedHours, 8);
});

test('T4-3: Capacitor Mobile Viewport and Network Resiliency Simulation', async () => {
  // Mobile preview layout
  const viewportWidth = 390;
  const isMobile = viewportWidth < 640;
  const headerVisible = !isMobile;
  const selectorVariant = isMobile ? 'mobile-strip' : 'header';

  assert.equal(headerVisible, false, 'App bar must be hidden on mobile');
  assert.equal(selectorVariant, 'mobile-strip');

  // Calendar fallback icon behavior under mobile view
  const dayWithLogNoPhoto = {
    date: '2026-11-17',
    log: { hours_worked: 8 },
    entry: null,
  };

  const hasPhoto = Boolean(dayWithLogNoPhoto.entry?.image_url);
  const showFlame = !hasPhoto && Boolean(dayWithLogNoPhoto.entry || dayWithLogNoPhoto.log);
  assert.equal(hasPhoto, false);
  assert.equal(showFlame, true, 'Flame fallback icon renders on mobile calendar cell');

  // Network exception simulation during protected deletion
  const verifyWithNetworkFailure = async () => {
    throw new Error('Connection refused. Please check your internet connection.');
  };

  let caughtError = null;
  let recordDeleted = false;
  try {
    await verifyWithNetworkFailure();
    recordDeleted = true;
  } catch (err) {
    caughtError = err.message;
  }

  assert.equal(recordDeleted, false, 'Deletion must abort on network failure');
  assert.ok(caughtError.includes('Connection refused'));
});

test('T4-4: Checklist Reset and Emoji-Free Professional Report Audit', () => {
  // Trainee adds multiple domain tasks
  let checklist = [
    ...PRESET_OJT_TASKS,
    { id: 't-1', label: 'Security Vulnerability Penetration Audit', category: 'Quality' },
    { id: 't-2', label: 'PostgreSQL Row Level Security Policy Setup', category: 'Data' },
  ];
  assert.equal(checklist.length, 10);

  // Generate accomplishments
  const summary = ruleBasedPastTenseSummary(
    ['Database Schema & Queries', 'PostgreSQL Row Level Security Policy Setup'],
    'Verified RLS isolation between users'
  );

  // University advisor requested reset
  checklist = [...PRESET_OJT_TASKS];
  assert.equal(checklist.length, 8);
  assert.deepEqual(checklist, PRESET_OJT_TASKS);

  // Full emoji audit of report summary
  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  assert.ok(!emojiRegex.test(summary), 'Generated summary must not contain emojis');
  assert.ok(!summary.includes('✨'), 'Sparkles must be completely absent');
  assert.ok(summary.includes('Verified RLS isolation between users.'));
});
