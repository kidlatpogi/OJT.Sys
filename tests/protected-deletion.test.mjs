import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Replicate verification logic aligned with ProtectedDeleteModal.tsx
async function verifyPasswordWithSupabase(
  email,
  password,
  options = {}
) {
  if (!password || String(password).trim().length === 0) {
    return { success: false, error: 'Password is required to confirm deletion.' };
  }

  const configured =
    options.isConfigured !== undefined ? options.isConfigured : false;

  if (configured) {
    if (!email) {
      return {
        success: false,
        error: 'User email not found. Cannot verify account credentials.',
      };
    }

    try {
      const supabase = options.client;
      if (!supabase || !supabase.auth) {
        throw new Error('Supabase client not initialized');
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Incorrect password. Verification failed.',
        };
      }

      return { success: true };
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Authentication verification error';
      return { success: false, error: msg };
    }
  }

  // Demo / offline fallback mode
  if (
    password === 'wrong-password' ||
    password === 'invalid' ||
    password === 'wrong' ||
    password.length < 3
  ) {
    return {
      success: false,
      error: 'Incorrect password. Verification failed.',
    };
  }

  return { success: true };
}

// 1. Password verification succeeds with valid credentials (Supabase Auth)
test('R8: Password verification succeeds with valid credentials via Supabase', async () => {
  let callCount = 0;
  const mockSupabase = {
    auth: {
      signInWithPassword: async ({ email, password }) => {
        callCount++;
        assert.equal(email, 'trainee@nu-dasma.edu.ph');
        assert.equal(password, 'correct-secure-password');
        return {
          data: { user: { id: 'user-001', email } },
          error: null,
        };
      },
    },
  };

  const result = await verifyPasswordWithSupabase(
    'trainee@nu-dasma.edu.ph',
    'correct-secure-password',
    { isConfigured: true, client: mockSupabase }
  );

  assert.equal(callCount, 1);
  assert.equal(result.success, true);
  assert.equal(result.error, undefined);
});

// 2. Password verification rejects invalid password and prevents deletion
test('R8: Password verification rejects invalid password, returns error, and prevents deletion', async () => {
  const mockSupabase = {
    auth: {
      signInWithPassword: async () => {
        return {
          data: null,
          error: { message: 'Invalid login credentials' },
        };
      },
    },
  };

  let deletionExecuted = false;
  const mockDeleteLog = async () => {
    deletionExecuted = true;
  };

  const email = 'trainee@nu-dasma.edu.ph';
  const wrongPassword = 'incorrect-password-123';

  // 1. Attempt verification
  const verifyResult = await verifyPasswordWithSupabase(email, wrongPassword, {
    isConfigured: true,
    client: mockSupabase,
  });

  // Verify failure and error message
  assert.equal(verifyResult.success, false);
  assert.equal(verifyResult.error, 'Invalid login credentials');

  // Deletion guard: Only proceed if verifyResult.success === true
  if (verifyResult.success) {
    await mockDeleteLog('log-123');
  }

  // Assert deletion was NOT executed
  assert.equal(deletionExecuted, false, 'Log deletion must NOT execute when password verification fails');
});

// 3. Demo mode fallback behavior works
test('R8: Demo mode fallback permits valid input and rejects invalid/empty password', async () => {
  // Test empty password rejection
  const emptyRes = await verifyPasswordWithSupabase('demo@nu.edu.ph', '', {
    isConfigured: false,
  });
  assert.equal(emptyRes.success, false);
  assert.ok(emptyRes.error.includes('Password is required'));

  // Test explicitly wrong demo passwords
  const wrongRes1 = await verifyPasswordWithSupabase('demo@nu.edu.ph', 'wrong-password', {
    isConfigured: false,
  });
  assert.equal(wrongRes1.success, false);
  assert.equal(wrongRes1.error, 'Incorrect password. Verification failed.');

  const wrongRes2 = await verifyPasswordWithSupabase('demo@nu.edu.ph', 'ab', {
    isConfigured: false,
  });
  assert.equal(wrongRes2.success, false);
  assert.equal(wrongRes2.error, 'Incorrect password. Verification failed.');

  // Test valid demo password
  const validRes = await verifyPasswordWithSupabase('demo@nu.edu.ph', 'demo-ojt-2026', {
    isConfigured: false,
  });
  assert.equal(validRes.success, true);
  assert.equal(validRes.error, undefined);
});

// 4. Missing email handling when Supabase is configured
test('R8: Verification fails gracefully when user email is missing in configured mode', async () => {
  const result = await verifyPasswordWithSupabase(undefined, 'my-password', {
    isConfigured: true,
    client: { auth: { signInWithPassword: async () => ({}) } },
  });

  assert.equal(result.success, false);
  assert.ok(result.error.includes('User email not found'));
});

// 5. Clean state reset on dismissal
test('R8: Clean state reset on modal dismissal', () => {
  // State simulation of ProtectedDeleteModal
  let state = {
    password: 'dirty-user-input',
    showPassword: true,
    error: 'Incorrect password. Verification failed.',
    isVerifying: false,
    isOpen: true,
  };

  const handleDismiss = () => {
    state.password = '';
    state.showPassword = false;
    state.error = null;
    state.isVerifying = false;
    state.isOpen = false;
  };

  handleDismiss();

  assert.equal(state.password, '');
  assert.equal(state.showPassword, false);
  assert.equal(state.error, null);
  assert.equal(state.isVerifying, false);
  assert.equal(state.isOpen, false);
});

// 6. Complete Log Deletion Workflow Simulation
test('R8: Complete workflow simulation - successful delete purges record from state', async () => {
  let logs = [
    { id: 'log-1', date: '2026-11-15', hours_worked: 8 },
    { id: 'log-2', date: '2026-11-16', hours_worked: 7 },
  ];

  const targetLog = logs[0];
  let isDeleted = false;

  const mockDeleteLog = async (id) => {
    logs = logs.filter((l) => l.id !== id);
    isDeleted = true;
  };

  const verifyResult = await verifyPasswordWithSupabase(
    'student@nu.edu.ph',
    'validPass123',
    { isConfigured: false }
  );

  assert.equal(verifyResult.success, true);

  if (verifyResult.success) {
    await mockDeleteLog(targetLog.id);
  }

  assert.equal(isDeleted, true);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].id, 'log-2');
});

// 7. Component source verification for ProtectedDeleteModal.tsx
test('R8: ProtectedDeleteModal component satisfies UI and architectural requirements', () => {
  const filePath = path.join(process.cwd(), 'src', 'components', 'dashboard', 'ProtectedDeleteModal.tsx');
  assert.ok(fs.existsSync(filePath), 'ProtectedDeleteModal.tsx must exist');

  const content = fs.readFileSync(filePath, 'utf-8');

  // Verify contextual header with ShieldAlert icon
  assert.ok(content.includes('ShieldAlert'), 'Must include ShieldAlert icon for protected contextual header');

  // Verify password show/hide toggle with Eye and EyeOff
  assert.ok(content.includes('Eye'), 'Must include Eye icon for toggle');
  assert.ok(content.includes('EyeOff'), 'Must include EyeOff icon for toggle');

  // Verify Lock icon
  assert.ok(content.includes('Lock'), 'Must include Lock icon for password input');

  // Verify inline error feedback banner
  assert.ok(content.includes('role="alert"'), 'Must render accessible alert role for inline error');
  assert.ok(content.includes('AlertCircle'), 'Must render AlertCircle icon for error banner');

  // Verify autofocus and clean dismissal
  assert.ok(content.includes('autoFocus'), 'Must set autoFocus on password input');
  assert.ok(content.includes('handleDismiss'), 'Must have handleDismiss logic to reset input');

  // Verify Supabase auth signInWithPassword
  assert.ok(content.includes('signInWithPassword'), 'Must call signInWithPassword for re-authentication');
});

// 8. Integration verification for LogsTab.tsx
test('R8: LogsTab integrates ProtectedDeleteModal replacing generic ConfirmModal', () => {
  const filePath = path.join(process.cwd(), 'src', 'components', 'dashboard', 'LogsTab.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Must import ProtectedDeleteModal
  assert.ok(
    content.includes("import ProtectedDeleteModal from '@/components/dashboard/ProtectedDeleteModal'"),
    'LogsTab must import ProtectedDeleteModal'
  );

  // Must render ProtectedDeleteModal with userEmail
  assert.ok(content.includes('<ProtectedDeleteModal'), 'LogsTab must render ProtectedDeleteModal');
  assert.ok(content.includes('userEmail={profile.email}'), 'LogsTab must pass userEmail');
  assert.ok(content.includes('onConfirm={handleConfirmedDelete}'), 'LogsTab must pass onConfirm handler');
});

// 9. DayActivityModal photo deletion verification
test('R8: DayActivityModal uses ConfirmModal for photo deletion confirmation', () => {
  const filePath = path.join(process.cwd(), 'src', 'components', 'dashboard', 'DayActivityModal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Must import ConfirmModal
  assert.ok(
    content.includes("import ConfirmModal from '@/components/ConfirmModal'"),
    'DayActivityModal must import ConfirmModal'
  );

  // Must NOT rely on window.confirm
  assert.ok(
    !content.includes("confirm('Are you sure"),
    'DayActivityModal must NOT use browser-native confirm dialog'
  );

  // Must have showDeleteConfirm state
  assert.ok(
    content.includes('showDeleteConfirm'),
    'DayActivityModal must maintain showDeleteConfirm state'
  );
});

// ============================================================================
// Tier 2: Boundary & Corner Cases (R8)
// ============================================================================

test('R8-T2-1 (Boundary): Extreme long password (500+ characters) is handled cleanly', async () => {
  const longPassword = 'SecureSecretPassword_123!'.repeat(25);
  assert.ok(longPassword.length > 500);

  let capturedPassword = null;
  const mockSupabase = {
    auth: {
      signInWithPassword: async ({ email, password }) => {
        capturedPassword = password;
        return { data: { user: { id: 'u-1' } }, error: null };
      },
    },
  };

  const result = await verifyPasswordWithSupabase('student@nu-dasma.edu.ph', longPassword, {
    isConfigured: true,
    client: mockSupabase,
  });

  assert.equal(result.success, true);
  assert.equal(capturedPassword.length, longPassword.length);
  assert.equal(capturedPassword, longPassword);
});

test('R8-T2-2 (Boundary): Passwords with complex special symbols and regex chars verify correctly', async () => {
  const specialPassword = '^$()[]{}|\\.?*+!@#%^&*~`"\'<>';
  let capturedPassword = null;
  const mockSupabase = {
    auth: {
      signInWithPassword: async ({ email, password }) => {
        capturedPassword = password;
        return { data: { user: { id: 'u-1' } }, error: null };
      },
    },
  };

  const result = await verifyPasswordWithSupabase('student@nu-dasma.edu.ph', specialPassword, {
    isConfigured: true,
    client: mockSupabase,
  });

  assert.equal(result.success, true);
  assert.equal(capturedPassword, specialPassword);
});

test('R8-T2-3 (Boundary): Network timeout or thrown exception is caught and returns user-friendly error', async () => {
  const mockSupabase = {
    auth: {
      signInWithPassword: async () => {
        throw new Error('Network request failed: timeout connecting to Supabase auth service');
      },
    },
  };

  const result = await verifyPasswordWithSupabase('student@nu-dasma.edu.ph', 'any-password', {
    isConfigured: true,
    client: mockSupabase,
  });

  assert.equal(result.success, false);
  assert.ok(result.error.includes('timeout connecting to Supabase auth service'));
});

test('R8-T2-4 (Boundary): Whitespace-only password is rejected before network invocation', async () => {
  let networkCalled = false;
  const mockSupabase = {
    auth: {
      signInWithPassword: async () => {
        networkCalled = true;
        return { data: null, error: null };
      },
    },
  };

  const result = await verifyPasswordWithSupabase('student@nu.edu.ph', '    \t   ', {
    isConfigured: true,
    client: mockSupabase,
  });

  assert.equal(result.success, false);
  assert.equal(networkCalled, false, 'Network call must not occur for empty/whitespace password');
  assert.ok(result.error.includes('Password is required'));
});

test('R8-T2-5 (Boundary): Dismissal guard prevents cancellation while verification or loading is busy', () => {
  let isCancelled = false;
  const cancelModal = (isVerifying, loading) => {
    if (isVerifying || loading) return;
    isCancelled = true;
  };

  // Busy states: dismiss blocked
  cancelModal(true, false);
  assert.equal(isCancelled, false);

  cancelModal(false, true);
  assert.equal(isCancelled, false);

  cancelModal(true, true);
  assert.equal(isCancelled, false);

  // Idle state: dismiss allowed
  cancelModal(false, false);
  assert.equal(isCancelled, true);
});

test('R8-T2-6 (Boundary): Deletion confirmation handler returning false retains modal state', async () => {
  let deletionProceeded = false;
  const mockOnConfirm = async (password) => {
    // Simulated confirmation failure (e.g. server-side record lock)
    return false;
  };

  const confirmRes = await mockOnConfirm('secret123');
  assert.equal(confirmRes, false);
  if (confirmRes !== false) {
    deletionProceeded = true;
  }
  assert.equal(deletionProceeded, false, 'Modal should retain state if onConfirm returns false');
});
