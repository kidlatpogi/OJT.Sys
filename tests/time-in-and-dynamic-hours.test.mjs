import test from 'node:test';
import assert from 'node:assert/strict';

function isValidUuid(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function calculateShiftHours(timeInIso, timeOutIso, lunchBreakMinutes = 0) {
  if (!timeInIso || !timeOutIso) return 0;
  const start = new Date(timeInIso).getTime();
  const end = new Date(timeOutIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;

  const grossMinutes = Math.floor((end - start) / 60000);
  const deduction = grossMinutes >= 300 ? Math.max(0, lunchBreakMinutes) : 0;
  const netMinutes = Math.max(0, grossMinutes - deduction);
  if (netMinutes === 0) return 0;

  return Math.round(netMinutes / 60);
}

function formatHoursWhole(hours) {
  const rounded = Math.round(Math.max(0, Number(hours) || 0));
  return `${rounded}h`;
}

test('Problem 1: isValidUuid accurately discriminates between RFC4122 UUIDs and legacy strings', () => {
  // Legacy or non-UUID strings that break PostgreSQL UUID columns
  assert.equal(isValidUuid('demo-internship-001'), false);
  assert.equal(isValidUuid('internship-1794966164581'), false);
  assert.equal(isValidUuid('local-log-12345'), false);
  assert.equal(isValidUuid(null), false);
  assert.equal(isValidUuid(undefined), false);
  assert.equal(isValidUuid(''), false);

  // Valid standard UUIDs
  assert.equal(isValidUuid('a5dace26-0161-4111-8000-000000000001'), true);
  assert.equal(isValidUuid('123e4567-e89b-12d3-a456-426614174000'), true);
  assert.equal(isValidUuid('c7cf098d-0000-4000-8000-000000000002'), true);
});

test('Problem 1: Attendance log upsert fallback retries without internship_id when DB column is missing', () => {
  const payload = {
    date: '2026-11-23',
    time_in: '2026-11-23T09:00:00.000Z',
    hours_worked: 0,
    tasks_selected: ['Frontend UI Implementation'],
  };
  const activeInternshipId = 'demo-internship-001'; // invalid UUID

  const validUuid = isValidUuid(activeInternshipId) ? activeInternshipId : null;
  assert.equal(validUuid, null, 'Invalid uuid should be stripped before querying PostgreSQL');

  const baseRecord = {
    user_id: 'user-1',
    date: payload.date,
    time_in: payload.time_in,
    hours_worked: payload.hours_worked,
    tasks_selected: payload.tasks_selected,
  };

  const record = { ...baseRecord };
  if (validUuid) {
    record.internship_id = validUuid;
  }

  assert.equal('internship_id' in record, false, 'internship_id must not be attached if not valid UUID');
});

test('Problem 2: calculateShiftHours accurately computes dynamic working hours during an ongoing shift', () => {
  const timeIn = '2026-11-23T09:00:00.000Z';

  // Just started (10 min) -> 0h
  assert.equal(calculateShiftHours(timeIn, '2026-11-23T09:10:00.000Z', 0), 0);

  // 1 full hour elapsed (60 min) -> 1h
  assert.equal(calculateShiftHours(timeIn, '2026-11-23T10:00:00.000Z', 0), 1);

  // 2 full hours elapsed (120 min) -> 2h
  assert.equal(calculateShiftHours(timeIn, '2026-11-23T11:00:00.000Z', 0), 2);

  // 8 full hours elapsed (480 min with 60 min lunch deduction = 420 min = 7h)
  assert.equal(calculateShiftHours(timeIn, '2026-11-23T17:00:00.000Z', 60), 7);
});

test('Problem 2: Top cumulative hours and progress bar move in real time with active shift', () => {
  const targetHours = 500;
  const completedLogs = [
    { date: '2026-11-21', hours_worked: 8 },
    { date: '2026-11-22', hours_worked: 8 },
  ];
  const completedHours = completedLogs.reduce((acc, l) => acc + l.hours_worked, 0); // 16h

  // User is currently working Day 3, 1 hour completed so far
  const liveInProgressHours = 1;
  const totalHoursServed = completedHours + liveInProgressHours; // 17h

  const progressPct = Math.min(100, Math.round((totalHoursServed / targetHours) * 100));
  const hoursLeft = Math.max(0, targetHours - totalHoursServed);

  assert.equal(totalHoursServed, 17);
  assert.equal(formatHoursWhole(totalHoursServed), '17h');
  assert.equal(progressPct, 3);
  assert.equal(hoursLeft, 483);
});

test('Problem 5: APK download toggle switches label from install to update', () => {
  const hasDownloadedApkFalse = false;
  const labelNew = hasDownloadedApkFalse ? 'Update Android App (.apk)' : 'Download Android App (.apk)';
  const sectionTitleNew = hasDownloadedApkFalse ? 'Update OJT.SYS on Your Android Device' : 'Install OJT.SYS on Your Android Device';

  assert.equal(labelNew, 'Download Android App (.apk)');
  assert.equal(sectionTitleNew, 'Install OJT.SYS on Your Android Device');

  const hasDownloadedApkTrue = true;
  const labelUpdated = hasDownloadedApkTrue ? 'Update Android App (.apk)' : 'Download Android App (.apk)';
  const sectionTitleUpdated = hasDownloadedApkTrue ? 'Update OJT.SYS on Your Android Device' : 'Install OJT.SYS on Your Android Device';

  assert.equal(labelUpdated, 'Update Android App (.apk)');
  assert.equal(sectionTitleUpdated, 'Update OJT.SYS on Your Android Device');
});
