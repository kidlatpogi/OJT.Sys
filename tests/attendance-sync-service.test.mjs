import test from 'node:test';
import assert from 'node:assert/strict';

// Set up browser globals for Node test environment
const storageMap = new Map();
globalThis.localStorage = {
  getItem: (key) => storageMap.get(key) || null,
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
    // ignore
  }
}

import {
  clearOfflineQueue,
  enqueueOfflinePunch,
  getLocalAttendanceLogs,
  getOfflineQueue,
  processOfflineQueue,
  removeOfflineQueueItem,
  saveLocalAttendanceLogs,
} from '../src/lib/attendance-sync-service.ts';

const TEST_USER_ID = 'test-user-123e4567-e89b-12d3-a456-426614174000';
const VALID_INTERNSHIP_ID = '987e6543-e21b-12d3-a456-426614174000';

test('Offline Sync: enqueueOfflinePunch enqueues items in FIFO order and assigns metadata', () => {
  storageMap.clear();

  const item1 = enqueueOfflinePunch(TEST_USER_ID, {
    user_id: TEST_USER_ID,
    internship_id: VALID_INTERNSHIP_ID,
    action: 'time-in',
    payload: {
      date: '2026-11-20',
      time_in: '2026-11-20T09:00:00.000Z',
      time_out: null,
      hours_worked: 0,
      tasks_selected: ['Frontend UI Implementation'],
      custom_tasks: '',
      ai_summary: '',
      ai_provider: 'manual',
    },
  });

  const item2 = enqueueOfflinePunch(TEST_USER_ID, {
    user_id: TEST_USER_ID,
    internship_id: VALID_INTERNSHIP_ID,
    action: 'time-in',
    payload: {
      date: '2026-11-21',
      time_in: '2026-11-21T09:00:00.000Z',
      time_out: null,
      hours_worked: 0,
      tasks_selected: ['API Integration & Endpoints'],
      custom_tasks: '',
      ai_summary: '',
      ai_provider: 'manual',
    },
  });

  assert.ok(item1.id.startsWith('queue_'));
  assert.equal(item1.retry_count, 0);
  assert.ok(item1.queued_at);

  const queue = getOfflineQueue(TEST_USER_ID);
  assert.equal(queue.length, 2);
  assert.equal(queue[0].payload.date, '2026-11-20');
  assert.equal(queue[1].payload.date, '2026-11-21');
});

test('Offline Sync: enqueueOfflinePunch coalesces items for the same date (e.g. Time-In then Time-Out)', () => {
  storageMap.clear();

  // First punch: Time-In
  enqueueOfflinePunch(TEST_USER_ID, {
    user_id: TEST_USER_ID,
    internship_id: VALID_INTERNSHIP_ID,
    action: 'time-in',
    payload: {
      date: '2026-11-24',
      time_in: '2026-11-24T09:00:00.000Z',
      time_out: null,
      hours_worked: 0,
      tasks_selected: ['Frontend UI Implementation'],
      custom_tasks: '',
      ai_summary: '',
    },
  });

  assert.equal(getOfflineQueue(TEST_USER_ID).length, 1);

  // Second punch later on same date: Time-Out with hours and summary
  enqueueOfflinePunch(TEST_USER_ID, {
    user_id: TEST_USER_ID,
    internship_id: VALID_INTERNSHIP_ID,
    action: 'time-out',
    payload: {
      date: '2026-11-24',
      time_in: null, // caller didn't re-specify time_in
      time_out: '2026-11-24T18:00:00.000Z',
      hours_worked: 9,
      tasks_selected: ['Frontend UI Implementation', 'Debugging & QA Testing'],
      custom_tasks: 'Refactored state machine',
      ai_summary: 'Implemented UI components and performed testing.',
    },
  });

  const queue = getOfflineQueue(TEST_USER_ID);
  assert.equal(queue.length, 1, 'Queue must coalesce to a single item for the same date');
  assert.equal(queue[0].payload.time_in, '2026-11-24T09:00:00.000Z', 'Time-In must be preserved');
  assert.equal(queue[0].payload.time_out, '2026-11-24T18:00:00.000Z');
  assert.equal(queue[0].payload.hours_worked, 9);
  assert.deepEqual(queue[0].payload.tasks_selected, [
    'Frontend UI Implementation',
    'Debugging & QA Testing',
  ]);
});

test('Offline Sync: removeOfflineQueueItem and clearOfflineQueue manage queue properly', () => {
  storageMap.clear();

  const item1 = enqueueOfflinePunch(TEST_USER_ID, {
    user_id: TEST_USER_ID,
    action: 'time-in',
    payload: { date: '2026-11-22', time_in: '09:00', time_out: null, hours_worked: 0, tasks_selected: [], custom_tasks: '', ai_summary: '' },
  });
  enqueueOfflinePunch(TEST_USER_ID, {
    user_id: TEST_USER_ID,
    action: 'time-in',
    payload: { date: '2026-11-23', time_in: '09:00', time_out: null, hours_worked: 0, tasks_selected: [], custom_tasks: '', ai_summary: '' },
  });

  assert.equal(getOfflineQueue(TEST_USER_ID).length, 2);

  removeOfflineQueueItem(TEST_USER_ID, item1.id);
  const remaining = getOfflineQueue(TEST_USER_ID);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].payload.date, '2026-11-23');

  clearOfflineQueue(TEST_USER_ID);
  assert.equal(getOfflineQueue(TEST_USER_ID).length, 0);
});

test('Offline Sync: saveLocalAttendanceLogs and getLocalAttendanceLogs persist cache', () => {
  storageMap.clear();

  const mockLogs = [
    {
      id: 'log-1',
      user_id: TEST_USER_ID,
      internship_id: VALID_INTERNSHIP_ID,
      date: '2026-11-24',
      time_in: '2026-11-24T09:00:00.000Z',
      time_out: '2026-11-24T17:00:00.000Z',
      hours_worked: 8,
      tasks_selected: ['Frontend UI Implementation'],
      custom_tasks: '',
      ai_summary: '',
      ai_provider: 'manual',
    },
  ];

  saveLocalAttendanceLogs(TEST_USER_ID, mockLogs);
  const loaded = getLocalAttendanceLogs(TEST_USER_ID);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, 'log-1');
  assert.equal(loaded[0].hours_worked, 8);
});

test('Offline Sync: processOfflineQueue successfully syncs items with Supabase and drains queue', async () => {
  storageMap.clear();
  Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });

  enqueueOfflinePunch(TEST_USER_ID, {
    user_id: TEST_USER_ID,
    internship_id: VALID_INTERNSHIP_ID,
    action: 'save-log',
    payload: {
      date: '2026-11-24',
      time_in: '2026-11-24T09:00:00.000Z',
      time_out: '2026-11-24T17:00:00.000Z',
      hours_worked: 8,
      tasks_selected: ['Frontend UI Implementation'],
      custom_tasks: 'Offline testing',
      ai_summary: 'Worked on offline tests.',
    },
  });

  const syncedItems = [];
  const mockSupabase = {
    from: (table) => {
      assert.equal(table, 'attendance_logs');
      return {
        upsert: (record, options) => {
          assert.equal(options.onConflict, 'user_id,date');
          return {
            select: () => ({
              single: async () => ({
                data: { ...record, id: 'synced-uuid-123' },
                error: null,
              }),
            }),
          };
        },
      };
    },
  };

  const result = await processOfflineQueue(TEST_USER_ID, mockSupabase, (log) => {
    syncedItems.push(log);
  });

  assert.equal(result.successCount, 1);
  assert.equal(result.failCount, 0);
  assert.equal(syncedItems.length, 1);
  assert.equal(syncedItems[0].id, 'synced-uuid-123');
  assert.equal(getOfflineQueue(TEST_USER_ID).length, 0, 'Queue must be drained upon sync');
});

test('Offline Sync: processOfflineQueue retries without internship_id if first upsert fails', async () => {
  storageMap.clear();
  Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });

  enqueueOfflinePunch(TEST_USER_ID, {
    user_id: TEST_USER_ID,
    internship_id: VALID_INTERNSHIP_ID,
    action: 'save-log',
    payload: {
      date: '2026-11-24',
      time_in: '2026-11-24T09:00:00.000Z',
      time_out: '2026-11-24T17:00:00.000Z',
      hours_worked: 8,
      tasks_selected: [],
      custom_tasks: '',
      ai_summary: '',
    },
  });

  let attempts = 0;
  const mockSupabase = {
    from: () => ({
      upsert: (record) => {
        attempts++;
        if (record.internship_id) {
          // Simulate database error where column does not exist
          return {
            select: () => ({
              single: async () => ({
                data: null,
                error: new Error('Column internship_id does not exist'),
              }),
            }),
          };
        }
        // Second attempt without internship_id succeeds
        return {
          select: () => ({
            single: async () => ({
              data: { ...record, id: 'fallback-synced-123' },
              error: null,
            }),
          }),
        };
      },
    }),
  };

  const result = await processOfflineQueue(TEST_USER_ID, mockSupabase);
  assert.equal(attempts, 2, 'Should attempt first with internship_id and then retry without');
  assert.equal(result.successCount, 1);
  assert.equal(getOfflineQueue(TEST_USER_ID).length, 0);
});

test('Offline Sync: processOfflineQueue skips processing when offline', async () => {
  storageMap.clear();
  Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true });

  enqueueOfflinePunch(TEST_USER_ID, {
    user_id: TEST_USER_ID,
    action: 'time-in',
    payload: { date: '2026-11-24', time_in: '09:00', time_out: null, hours_worked: 0, tasks_selected: [], custom_tasks: '', ai_summary: '' },
  });

  let networkCalled = false;
  const mockSupabase = {
    from: () => {
      networkCalled = true;
      return {};
    },
  };

  const result = await processOfflineQueue(TEST_USER_ID, mockSupabase);
  assert.equal(networkCalled, false, 'Should not invoke network when navigator.onLine is false');
  assert.equal(result.successCount, 0);
  assert.equal(getOfflineQueue(TEST_USER_ID).length, 1, 'Queue remains intact');

  // Restore online status
  Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });
});
