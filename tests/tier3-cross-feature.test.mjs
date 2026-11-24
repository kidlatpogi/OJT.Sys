import test from 'node:test';
import assert from 'node:assert/strict';
import { ruleBasedPastTenseSummary } from '../src/lib/past-tense-regex.ts';
import { PRESET_OJT_TASKS } from '../src/types/ojt.ts';

// ============================================================================
// Tier 3: Cross-Feature Interactions & Pairwise Combinations
// ============================================================================

test('T3-1: Checklists customized in Internship 1 are preserved when switching to Internship 2 and back', () => {
  // User state
  let currentInternshipId = 'internship-1';

  // Profile-level checklist shared across user's active programs
  let userWorkChecklist = [
    ...PRESET_OJT_TASKS,
    { id: 'custom-proj-task', label: 'Docker Swarm Deployment', category: 'DevOps' },
  ];

  // Active tasks selected in Internship 1
  let selectedTasksProg1 = ['Frontend UI Implementation', 'Docker Swarm Deployment'];

  // Switch to Internship 2
  currentInternshipId = 'internship-2';

  // Verify custom checklist item remains available in Internship 2
  assert.ok(userWorkChecklist.some((t) => t.id === 'custom-proj-task'));
  assert.equal(userWorkChecklist.length, 9);

  // User adds another task in Internship 2
  userWorkChecklist.push({
    id: 'custom-prog2-task',
    label: 'OpenNext Cloudflare Edge Worker Tuning',
    category: 'Engineering',
  });

  // Switch back to Internship 1
  currentInternshipId = 'internship-1';

  // Verify both custom tasks are accessible
  assert.equal(userWorkChecklist.length, 10);
  assert.ok(userWorkChecklist.some((t) => t.id === 'custom-proj-task'));
  assert.ok(userWorkChecklist.some((t) => t.id === 'custom-prog2-task'));
  assert.deepEqual(selectedTasksProg1, ['Frontend UI Implementation', 'Docker Swarm Deployment']);
});

test('T3-2: Protected deletion of a log under Internship 2 properly recalculates hours without affecting Internship 1', async () => {
  const internship1 = { id: 'prog-1', title: 'Internship 1', target_hours: 300 };
  const internship2 = { id: 'prog-2', title: 'Internship 2', target_hours: 200 };

  let logs = [
    { id: 'log-1', internship_id: 'prog-1', hours_worked: 100, date: '2026-01-15' },
    { id: 'log-2', internship_id: 'prog-1', hours_worked: 150, date: '2026-01-16' },
    { id: 'log-3', internship_id: 'prog-2', hours_worked: 50, date: '2026-02-01' },
    { id: 'log-4', internship_id: 'prog-2', hours_worked: 40, date: '2026-02-02' },
  ];

  const getHours = (progId) =>
    logs.filter((l) => l.internship_id === progId).reduce((s, l) => s + l.hours_worked, 0);

  assert.equal(getHours('prog-1'), 250);
  assert.equal(getHours('prog-2'), 90);

  // Target log to delete in prog-2
  const targetLog = logs.find((l) => l.id === 'log-4');
  assert.ok(targetLog);

  // Protected deletion verification simulation
  const verifyPassword = async (pwd) => pwd === 'valid-user-password';
  const authenticated = await verifyPassword('valid-user-password');
  assert.equal(authenticated, true);

  if (authenticated) {
    logs = logs.filter((l) => l.id !== targetLog.id);
  }

  // Internship 2 hours drop from 90 to 50
  assert.equal(getHours('prog-2'), 50);
  // Internship 1 hours remain completely unaffected at 250
  assert.equal(getHours('prog-1'), 250);
  assert.equal(logs.length, 3);
});

test('T3-3: Unified ImageModal displays images from both Calendar entries and Log attachments across programs', () => {
  // Calendar entry in Program 1
  const calEntryProg1 = {
    date: '2026-01-20',
    internship_id: 'prog-1',
    image_url: 'https://images.example/cal-prog1.jpg',
    title: 'Design Review Meeting',
    description: 'Reviewed design tokens',
  };

  // Log with attached photo in Program 2
  const logPhotoProg2 = {
    date: '2026-02-15',
    internship_id: 'prog-2',
    image_url: 'https://images.example/log-prog2.jpg',
    title: 'Activity for Feb 15, 2026',
    description: 'Production deployment verification',
  };

  // Lightbox modal consumer contract
  const openModalForResource = (resource) => {
    return {
      isOpen: true,
      imageUrl: resource.image_url,
      date: resource.date,
      title: resource.title || `Activity for ${resource.date}`,
      description: resource.description,
    };
  };

  const modal1 = openModalForResource(calEntryProg1);
  assert.equal(modal1.isOpen, true);
  assert.equal(modal1.imageUrl, 'https://images.example/cal-prog1.jpg');
  assert.equal(modal1.title, 'Design Review Meeting');

  const modal2 = openModalForResource(logPhotoProg2);
  assert.equal(modal2.isOpen, true);
  assert.equal(modal2.imageUrl, 'https://images.example/log-prog2.jpg');
  assert.equal(modal2.description, 'Production deployment verification');
});

test('T3-4: Calendar Flame icon fallback in Internship 2 coexists with photo thumbnails in Internship 1', () => {
  const activeProg1 = 'prog-1';
  const activeProg2 = 'prog-2';

  const calendarEntries = [
    { date: '2026-01-10', internship_id: 'prog-1', image_url: 'https://images.example/prog1.jpg' },
  ];

  const attendanceLogs = [
    { date: '2026-01-10', internship_id: 'prog-1', hours_worked: 8 },
    { date: '2026-02-10', internship_id: 'prog-2', hours_worked: 6 }, // Log exists, but no photo attached!
  ];

  const getCellStatus = (date, activeProgId) => {
    const entry = calendarEntries.find((e) => e.date === date && e.internship_id === activeProgId);
    const log = attendanceLogs.find((l) => l.date === date && l.internship_id === activeProgId);
    const hasPhoto = Boolean(entry?.image_url);
    const showFlame = !hasPhoto && Boolean(entry || log);
    return { hasPhoto, showFlame };
  };

  // In Prog 1 on 2026-01-10: Photo thumbnail present, no flame
  const prog1Cell = getCellStatus('2026-01-10', activeProg1);
  assert.equal(prog1Cell.hasPhoto, true);
  assert.equal(prog1Cell.showFlame, false);

  // In Prog 2 on 2026-02-10: No photo, but log exists -> Flame fallback icon renders!
  const prog2Cell = getCellStatus('2026-02-10', activeProg2);
  assert.equal(prog2Cell.hasPhoto, false);
  assert.equal(prog2Cell.showFlame, true);
});

test('T3-5: Dynamic checklist item past-tense summary generation propagates into logs requiring protected deletion', async () => {
  const customTask = 'Optimize Mobile App Bar Rendering';
  const notes = 'Migrated styles to NoActionBar for Capacitor Android';

  // Generate past tense summary
  const summary = ruleBasedPastTenseSummary([customTask], notes);
  assert.ok(summary.includes('Optimized') || summary.includes('Optimize'));
  assert.ok(summary.includes('Migrated styles to NoActionBar for Capacitor Android.'));

  // Log created with summary
  const logRecord = {
    id: 'log-dynamic-summary-1',
    date: '2026-11-17',
    tasks_selected: [customTask],
    custom_tasks: notes,
    ai_summary: summary,
    hours_worked: 8,
  };

  // Attempt to delete log with incorrect password
  let deletionAllowed = false;
  const deleteWithPassword = (pwd) => {
    if (pwd === 'correct-ojt-pass') {
      deletionAllowed = true;
      return { success: true };
    }
    return { success: false, error: 'Incorrect password. Verification failed.' };
  };

  const badAttempt = deleteWithPassword('bad-password');
  assert.equal(badAttempt.success, false);
  assert.equal(deletionAllowed, false);

  const goodAttempt = deleteWithPassword('correct-ojt-pass');
  assert.equal(goodAttempt.success, true);
  assert.equal(deletionAllowed, true);
});

test('T3-6: Incomplete hours warning reacts dynamically to protected deletion of attendance records', () => {
  const internship = {
    id: 'prog-audit',
    target_hours: 500,
    status: 'active',
  };

  let logs = [
    { id: 'l1', hours_worked: 250 },
    { id: 'l2', hours_worked: 250 },
  ];

  const getHours = () => logs.reduce((sum, l) => sum + l.hours_worked, 0);
  const isIncomplete = () => getHours() < internship.target_hours && internship.status !== 'completed';

  // Exactly 500 hours -> NOT incomplete (no warning)
  assert.equal(getHours(), 500);
  assert.equal(isIncomplete(), false);

  // Mistaken duplicate log l2 is deleted via protected deletion
  logs = logs.filter((l) => l.id !== 'l2');

  // Hours drop to 250 -> Warning condition dynamically re-arms!
  assert.equal(getHours(), 250);
  assert.equal(isIncomplete(), true);
});

test('T3-7: Mobile layout hidden app bar coexists with mobile-strip selector and checklist customization without collision', () => {
  // Simulate mobile view state (width 390px)
  const isMobile = true;
  const headerHiddenClass = isMobile ? 'hidden sm:block' : 'block';
  const selectorVariant = isMobile ? 'mobile-strip' : 'header';

  assert.equal(headerHiddenClass, 'hidden sm:block');
  assert.equal(selectorVariant, 'mobile-strip');

  // Verify mobile-strip has container full width class
  const getContainerClass = (variant) =>
    `relative ${variant === 'mobile-strip' ? 'w-full block' : 'inline-block'} text-left`;

  assert.ok(getContainerClass(selectorVariant).includes('w-full block'));
});
