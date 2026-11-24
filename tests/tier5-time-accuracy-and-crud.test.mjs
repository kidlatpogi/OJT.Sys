import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateShiftHours,
  formatHoursWhole,
  formatLocalToIso,
  formatReportDate,
  formatTimeDisplay,
  isoToLocalHHMM,
} from '../src/lib/ojt-calculations.ts';

test('T5-1: formatLocalToIso creates valid UTC ISO strings from local date and time', () => {
  const iso = formatLocalToIso('2026-11-23', '09:00');
  assert.ok(iso.endsWith('Z'), 'Timestamp must end with Z for UTC normalization');
  assert.ok(iso.startsWith('2026-11-'), 'Timestamp year and month must match');

  const parsed = new Date(iso);
  assert.ok(!Number.isNaN(parsed.getTime()), 'Timestamp must be a valid date');
  // Local hour must match 9
  assert.equal(parsed.getHours(), 9, 'Local hour reconstructed from ISO must be 9');
  assert.equal(parsed.getMinutes(), 0, 'Local minute reconstructed from ISO must be 0');
});

test('T5-2: 9am to 5pm shift roundtrip preserves exact local times and computes 8 hours', () => {
  const date = '2026-11-23';
  const startStr = '09:00';
  const endStr = '17:00';

  const timeInIso = formatLocalToIso(date, startStr);
  const timeOutIso = formatLocalToIso(date, endStr);

  // 1. Shift calculation (no lunch)
  const hrs = calculateShiftHours(timeInIso, timeOutIso, 0);
  assert.equal(hrs, 8, '9am to 5pm without lunch must be 8 hours');
  assert.equal(formatHoursWhole(hrs), '8h');

  // 2. Shift calculation (with 60m lunch)
  const hrsWithLunch = calculateShiftHours(timeInIso, timeOutIso, 60);
  assert.equal(hrsWithLunch, 7, '9am to 5pm with 60m lunch must be 7 hours');
  assert.equal(formatHoursWhole(hrsWithLunch), '7h');

  // 3. Display verification
  assert.equal(formatTimeDisplay(timeInIso), '09:00 AM');
  assert.equal(formatTimeDisplay(timeOutIso), '05:00 PM');

  // 4. Edit Modal extraction - must NOT jump by timezone offset
  assert.equal(isoToLocalHHMM(timeInIso), '09:00');
  assert.equal(isoToLocalHHMM(timeOutIso), '17:00');
});

test('T5-3: isoToLocalHHMM safely handles raw times, naive strings, and null values', () => {
  assert.equal(isoToLocalHHMM('08:30:00'), '08:30');
  assert.equal(isoToLocalHHMM('17:45'), '17:45');
  assert.equal(isoToLocalHHMM('9:05'), '09:05');
  assert.equal(isoToLocalHHMM(null), '08:00');
  assert.equal(isoToLocalHHMM(null, '09:00'), '09:00');
  assert.equal(isoToLocalHHMM('2026-11-23T14:30:00'), '14:30');
});

test('T5-4: formatTimeDisplay formats raw times, naive strings, and ISO strings to 12h AM/PM', () => {
  assert.equal(formatTimeDisplay(null), '--:--');
  assert.equal(formatTimeDisplay(''), '--:--');
  assert.equal(formatTimeDisplay('09:00'), '09:00 AM');
  assert.equal(formatTimeDisplay('13:30'), '01:30 PM');
  assert.equal(formatTimeDisplay('00:00'), '12:00 AM');
  assert.equal(formatTimeDisplay('12:00'), '12:00 PM');
  assert.equal(formatTimeDisplay('18:00:00'), '06:00 PM');
});

test('T5-5: Overnight shifts (crossing midnight) are supported via isNextDay flag', () => {
  const date = '2026-11-23';
  const startStr = '22:00'; // 10:00 PM
  const endStr = '06:00';   // 6:00 AM next day

  const timeInIso = formatLocalToIso(date, startStr, false);
  const timeOutIso = formatLocalToIso(date, endStr, true);

  const startDt = new Date(timeInIso);
  const endDt = new Date(timeOutIso);
  assert.ok(endDt.getTime() > startDt.getTime(), 'Overnight end time must be after start time');

  // 22:00 to 06:00 is 8 hours
  const hrs = calculateShiftHours(timeInIso, timeOutIso, 0);
  assert.equal(hrs, 8, 'Overnight shift 22:00 to 06:00 must be 8 hours');
});

test('T5-6: Inverted time detection (05:20 to 02:00) detects 0h and auto-fixes to PM', () => {
  const date = '2026-11-23';
  const startStr = '05:20';
  const endStr = '02:00'; // Accidentally entered as 02:00 instead of 14:00

  const timeInIso = formatLocalToIso(date, startStr, false);
  const timeOutIso = formatLocalToIso(date, endStr, false);

  // When both are on the same day, 02:00 is earlier than 05:20
  const zeroHrs = calculateShiftHours(timeInIso, timeOutIso, 0);
  assert.equal(zeroHrs, 0, 'Inverted non-overnight shift must return 0h');

  // Converting 02:00 to PM (14:00)
  const [h, m] = endStr.split(':');
  const pmEndStr = `${parseInt(h, 10) + 12}:${m}`; // '14:00'
  const correctedOutIso = formatLocalToIso(date, pmEndStr, false);

  const fixedHrs = calculateShiftHours(timeInIso, correctedOutIso, 0);
  // 5:20 to 14:00 is 8 hours and 40 minutes -> rounds to 9 hours
  assert.equal(fixedHrs, 9, 'Corrected PM shift must be 9 hours');
});

test('T5-7: Date mutation on log update properly cleans up previous date entry', () => {
  let logs = [
    { id: 'log-1', date: '2026-11-22', time_in: '2026-11-22T01:00:00.000Z', time_out: '2026-11-22T10:00:00.000Z', hours_worked: 9 },
    { id: 'log-2', date: '2026-11-21', time_in: '2026-11-21T01:00:00.000Z', time_out: '2026-11-21T10:00:00.000Z', hours_worked: 9 },
  ];

  // User edits log-1 to move date from 2026-11-22 to 2026-11-23
  const payload = {
    id: 'log-1',
    originalDate: '2026-11-22',
    date: '2026-11-23',
    time_in: '2026-11-23T01:00:00.000Z',
    time_out: '2026-11-23T10:00:00.000Z',
    hours_worked: 9,
  };

  // Simulate dashboard update logic
  const filtered = logs.filter(
    (l) => l.date !== payload.date && (!payload.originalDate || l.date !== payload.originalDate)
  );
  logs = [payload, ...filtered];

  assert.equal(logs.length, 2, 'Total logs count must remain 2 (no ghost duplicates)');
  assert.ok(!logs.some((l) => l.date === '2026-11-22'), 'Old date must be completely purged');
  assert.ok(logs.some((l) => l.date === '2026-11-23'), 'New date must be present');
});
