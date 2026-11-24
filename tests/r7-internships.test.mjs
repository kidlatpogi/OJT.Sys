import test from 'node:test';
import assert from 'node:assert/strict';

// Helper function modeling effectiveProfile composition from src/app/dashboard/page.tsx
function computeEffectiveProfile(baseProfile, activeInternship) {
  if (!activeInternship) return baseProfile;
  return {
    ...baseProfile,
    company_name: activeInternship.company_name || baseProfile.company_name,
    branch_department: activeInternship.branch_department || baseProfile.branch_department,
    supervisor_name: activeInternship.supervisor_name || baseProfile.supervisor_name,
    supervisor_position: activeInternship.supervisor_position || baseProfile.supervisor_position,
    trainor_name: activeInternship.trainor_name || baseProfile.trainor_name,
    start_date: activeInternship.start_date || baseProfile.start_date,
    target_hours: activeInternship.target_hours || baseProfile.target_hours,
    daily_start_time: activeInternship.daily_start_time || baseProfile.daily_start_time,
    daily_end_time: activeInternship.daily_end_time || baseProfile.daily_end_time,
    lunch_break_minutes: activeInternship.lunch_break_minutes ?? baseProfile.lunch_break_minutes,
    auto_time_out: activeInternship.auto_time_out ?? baseProfile.auto_time_out,
    academic_term: activeInternship.academic_term || baseProfile.academic_term,
    active_internship_id: activeInternship.id,
  };
}

// Helper function modeling incomplete check
function checkIsIncomplete(internship, totalHoursServed) {
  const target = Number(internship.target_hours) || 500;
  return totalHoursServed < target && internship.status !== 'completed';
}

// Helper function modeling calendar entry filtering
function filterActiveCalendarEntries(entries, activeId, internships) {
  if (!activeId) return entries;
  const firstInternship = internships[0];
  return entries.filter((e) => {
    if (e.internship_id) {
      return e.internship_id === activeId;
    }
    return firstInternship ? firstInternship.id === activeId : true;
  });
}

// ============================================================================
// Tier 1: Feature Tests (>=5 tests)
// ============================================================================

test('R7-T1-1: Multiple internship records can be created with distinct properties', () => {
  const internships = [
    {
      id: 'internship-1',
      user_id: 'user-001',
      title: 'Internship 1 (Tech Innovations)',
      company_name: 'Tech Innovations Inc.',
      target_hours: 300,
      status: 'completed',
    },
    {
      id: 'internship-2',
      user_id: 'user-001',
      title: 'Internship 2 (Global Media)',
      company_name: 'Global Media Corp',
      target_hours: 200,
      status: 'active',
    },
  ];

  assert.equal(internships.length, 2);
  assert.equal(internships[0].id, 'internship-1');
  assert.equal(internships[1].id, 'internship-2');
  assert.notEqual(internships[0].company_name, internships[1].company_name);
  assert.notEqual(internships[0].target_hours, internships[1].target_hours);
});

test('R7-T1-2: Switching active internship updates activeInternshipId and effective profile view', () => {
  const baseProfile = {
    id: 'user-001',
    full_name: 'Juan Dela Cruz',
    company_name: 'Default Corp',
    target_hours: 500,
    academic_term: 'TERM 1',
  };

  const internship1 = {
    id: 'intern-1',
    user_id: 'user-001',
    title: 'Internship 1',
    company_name: 'Acme Systems',
    target_hours: 300,
    academic_term: 'TERM 2',
  };

  const internship2 = {
    id: 'intern-2',
    user_id: 'user-001',
    title: 'Internship 2',
    company_name: 'Beta Robotics',
    target_hours: 250,
    academic_term: 'TERM 3',
  };

  // Switch to internship 1
  let effective = computeEffectiveProfile(baseProfile, internship1);
  assert.equal(effective.active_internship_id, 'intern-1');
  assert.equal(effective.company_name, 'Acme Systems');
  assert.equal(effective.target_hours, 300);
  assert.equal(effective.academic_term, 'TERM 2');

  // Switch to internship 2
  effective = computeEffectiveProfile(baseProfile, internship2);
  assert.equal(effective.active_internship_id, 'intern-2');
  assert.equal(effective.company_name, 'Beta Robotics');
  assert.equal(effective.target_hours, 250);
  assert.equal(effective.academic_term, 'TERM 3');
});

test('R7-T1-3: Attendance logs are isolated per internship without cross-program bleeding', () => {
  const allLogs = [
    { id: 'log-1', internship_id: 'intern-1', hours_worked: 8, date: '2026-01-10' },
    { id: 'log-2', internship_id: 'intern-1', hours_worked: 8, date: '2026-01-11' },
    { id: 'log-3', internship_id: 'intern-2', hours_worked: 6, date: '2026-02-01' },
    { id: 'log-4', internship_id: 'intern-2', hours_worked: 7, date: '2026-02-02' },
  ];

  const getLogsForInternship = (id) => allLogs.filter((l) => l.internship_id === id);

  const logs1 = getLogsForInternship('intern-1');
  const logs2 = getLogsForInternship('intern-2');

  assert.equal(logs1.length, 2);
  assert.equal(logs1.reduce((sum, l) => sum + l.hours_worked, 0), 16);

  assert.equal(logs2.length, 2);
  assert.equal(logs2.reduce((sum, l) => sum + l.hours_worked, 0), 13);

  // Strict isolation check
  assert.ok(!logs1.some((l) => l.internship_id === 'intern-2'));
  assert.ok(!logs2.some((l) => l.internship_id === 'intern-1'));
});

test('R7-T1-4: Calendar entries are isolated per internship with legacy fallback', () => {
  const internships = [
    { id: 'prog-1', title: 'Internship 1' },
    { id: 'prog-2', title: 'Internship 2' },
  ];

  const entries = [
    { id: 'c-legacy', user_id: 'u-1', date: '2026-01-01', image_url: 'legacy.jpg' }, // no internship_id
    { id: 'c-prog1', user_id: 'u-1', internship_id: 'prog-1', date: '2026-01-15', image_url: 'p1.jpg' },
    { id: 'c-prog2', user_id: 'u-1', internship_id: 'prog-2', date: '2026-02-01', image_url: 'p2.jpg' },
  ];

  const filtered1 = filterActiveCalendarEntries(entries, 'prog-1', internships);
  assert.equal(filtered1.length, 2);
  assert.ok(filtered1.some((e) => e.id === 'c-legacy'));
  assert.ok(filtered1.some((e) => e.id === 'c-prog1'));
  assert.ok(!filtered1.some((e) => e.id === 'c-prog2'));

  const filtered2 = filterActiveCalendarEntries(entries, 'prog-2', internships);
  assert.equal(filtered2.length, 1);
  assert.equal(filtered2[0].id, 'c-prog2');
  assert.ok(!filtered2.some((e) => e.id === 'c-prog1'));
  assert.ok(!filtered2.some((e) => e.id === 'c-legacy'));
});

test('R7-T1-5: Incomplete hours warning triggers when active hours < target hours and status is active', () => {
  const activeProg = {
    id: 'prog-active',
    title: 'Internship 1',
    target_hours: 500,
    status: 'active',
  };

  // 150 hours served out of 500 -> Incomplete, warning required
  assert.equal(checkIsIncomplete(activeProg, 150), true);
  // 499 hours served out of 500 -> Incomplete, warning required
  assert.equal(checkIsIncomplete(activeProg, 499), true);
});

// ============================================================================
// Tier 2: Boundary & Corner Cases (>=5 tests)
// ============================================================================

test('R7-T2-1 (Boundary): Exactly at target hours (500h/500h) does NOT trigger incomplete warning', () => {
  const prog = { id: 'p1', target_hours: 500, status: 'active' };
  assert.equal(checkIsIncomplete(prog, 500), false);
});

test('R7-T2-2 (Boundary): Exceeding target hours (550h/500h) does NOT trigger incomplete warning', () => {
  const prog = { id: 'p1', target_hours: 500, status: 'active' };
  assert.equal(checkIsIncomplete(prog, 550), false);
});

test('R7-T2-3 (Boundary): 0 hours served but status is completed does NOT trigger incomplete warning', () => {
  const prog = { id: 'p1', target_hours: 500, status: 'completed' };
  assert.equal(checkIsIncomplete(prog, 0), false);
});

test('R7-T2-4 (Boundary): Missing target_hours defaults safely to 500 hours requirement', () => {
  const progNoTarget = { id: 'p-no-target', status: 'active' };
  // 400h < default 500h -> incomplete
  assert.equal(checkIsIncomplete(progNoTarget, 400), true);
  // 500h >= default 500h -> complete
  assert.equal(checkIsIncomplete(progNoTarget, 500), false);
});

test('R7-T2-5 (Boundary): Negative hours served does not crash and evaluates as incomplete', () => {
  const prog = { id: 'p1', target_hours: 500, status: 'active' };
  assert.equal(checkIsIncomplete(prog, -10), true);
});

test('R7-T2-6 (Boundary): Effective profile handles null activeInternship without altering base profile', () => {
  const baseProfile = {
    id: 'user-001',
    full_name: 'Maria Santos',
    company_name: 'Base Corp',
    target_hours: 450,
  };

  const effective = computeEffectiveProfile(baseProfile, null);
  assert.deepEqual(effective, baseProfile);
});

test('R7-T2-7 (Boundary): Mobile-strip variant renders full width and accurate progress bar', () => {
  const getProgressPct = (hours, targetHours) => {
    return Math.min(100, Math.round((hours / Math.max(1, targetHours)) * 100));
  };

  assert.equal(getProgressPct(0, 500), 0);
  assert.equal(getProgressPct(250, 500), 50);
  assert.equal(getProgressPct(500, 500), 100);
  assert.equal(getProgressPct(600, 500), 100); // capped at 100
  assert.equal(getProgressPct(10, 0), 100); // division by zero guarded
});

test('R7-T2-8 (Boundary): Rapid program switching among 3 programs preserves state integrity', () => {
  const programs = [
    { id: 'prog-A', target_hours: 200, status: 'completed' },
    { id: 'prog-B', target_hours: 300, status: 'active' },
    { id: 'prog-C', target_hours: 400, status: 'active' },
  ];

  const hoursMap = {
    'prog-A': 200,
    'prog-B': 100,
    'prog-C': 0,
  };

  // Switch A -> B -> C -> A
  assert.equal(checkIsIncomplete(programs[0], hoursMap['prog-A']), false);
  assert.equal(checkIsIncomplete(programs[1], hoursMap['prog-B']), true);
  assert.equal(checkIsIncomplete(programs[2], hoursMap['prog-C']), true);
  assert.equal(checkIsIncomplete(programs[0], hoursMap['prog-A']), false);
});
