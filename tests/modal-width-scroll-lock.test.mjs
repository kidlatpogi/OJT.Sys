import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

test('Deliverable 1 & 2: InternshipSetupModal has max-w-3xl, no-scrollbar, overflow-x-hidden, and no max-w-lg', () => {
  const modalPath = path.join(projectRoot, 'src', 'components', 'dashboard', 'InternshipSetupModal.tsx');
  const content = fs.readFileSync(modalPath, 'utf8');

  // Verify wider modal layout for New Internship Program & First-Login Setup
  assert.ok(
    content.includes('max-w-3xl'),
    'InternshipSetupModal must be widened with max-w-3xl (matching WhatsNewModal)'
  );
  assert.ok(
    !content.includes('max-w-lg'),
    'InternshipSetupModal must no longer use narrow max-w-lg'
  );

  // Verify side scrollbar removal and no horizontal overflow
  assert.ok(
    content.includes('no-scrollbar'),
    'InternshipSetupModal must include no-scrollbar to remove the grey browser scrollbar on the right side'
  );
  assert.ok(
    content.includes('overflow-x-hidden'),
    'InternshipSetupModal must include overflow-x-hidden to prevent horizontal side scrolling'
  );

  // Verify scroll lock integration
  assert.ok(
    content.includes('useBodyScrollLock'),
    'InternshipSetupModal must invoke useBodyScrollLock'
  );
});

test('Deliverable 3: Global body scroll lock reference counting logic in src/lib/scroll-lock.ts', async () => {
  const scrollLockModulePath = path.join(projectRoot, 'src', 'lib', 'scroll-lock.ts');
  assert.ok(fs.existsSync(scrollLockModulePath), 'src/lib/scroll-lock.ts must exist');

  // Dynamically test the scroll-lock logic in mock DOM environment
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  try {
    const mockBody = {
      style: { overflow: '', paddingRight: '' },
    };
    const mockDocEl = {
      clientWidth: 1000,
      style: { overflow: '' },
    };
    globalThis.document = {
      body: mockBody,
      documentElement: mockDocEl,
    };
    globalThis.window = {
      innerWidth: 1016,
    };

    const {
      lockBodyScroll,
      unlockBodyScroll,
      getActiveScrollLocks,
      resetScrollLocks,
    } = await import(new URL('../src/lib/scroll-lock.ts', import.meta.url).href);

    resetScrollLocks();
    assert.strictEqual(getActiveScrollLocks(), 0, 'Initial lock count must be 0');

    // First modal opens
    lockBodyScroll();
    assert.strictEqual(getActiveScrollLocks(), 1, 'Lock count must be 1');
    assert.strictEqual(mockBody.style.overflow, 'hidden', 'Body overflow must be hidden');
    assert.strictEqual(mockDocEl.style.overflow, 'hidden', 'DocumentElement overflow must be hidden');
    assert.strictEqual(mockBody.style.paddingRight, '16px', 'Padding right set for 16px scrollbar');

    // Second stacked modal opens (e.g. ConfirmModal on top of InternshipSetupModal)
    lockBodyScroll();
    assert.strictEqual(getActiveScrollLocks(), 2, 'Lock count must be 2');
    assert.strictEqual(mockBody.style.overflow, 'hidden', 'Body overflow must still be hidden');

    // Second modal closes
    unlockBodyScroll();
    assert.strictEqual(getActiveScrollLocks(), 1, 'Lock count must be 1');
    assert.strictEqual(mockBody.style.overflow, 'hidden', 'Body overflow must STILL be hidden while 1st modal open');

    // First modal closes
    unlockBodyScroll();
    assert.strictEqual(getActiveScrollLocks(), 0, 'Lock count must return to 0');
    assert.strictEqual(mockBody.style.overflow, '', 'Body overflow must be restored to empty');
    assert.strictEqual(mockDocEl.style.overflow, '', 'DocumentElement overflow must be restored');
    assert.strictEqual(mockBody.style.paddingRight, '', 'Padding right must be restored');
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});

test('Deliverable 3: All modal components use useBodyScrollLock and no-scrollbar', () => {
  const modalFiles = [
    'src/components/dashboard/InternshipSetupModal.tsx',
    'src/components/ConfirmModal.tsx',
    'src/components/ImageModal.tsx',
    'src/components/WhatsNewModal.tsx',
    'src/components/ApkUpdateModal.tsx',
    'src/components/dashboard/DayActivityModal.tsx',
    'src/components/dashboard/ProtectedDeleteModal.tsx',
    'src/components/dashboard/LogsTab.tsx',
    'src/components/dashboard/ReportsTab.tsx',
  ];

  for (const relPath of modalFiles) {
    const fullPath = path.join(projectRoot, relPath);
    const content = fs.readFileSync(fullPath, 'utf8');

    assert.ok(
      content.includes('useBodyScrollLock'),
      `${relPath} must import and call useBodyScrollLock`
    );

    assert.ok(
      content.includes('no-scrollbar') || content.includes('overflow-hidden'),
      `${relPath} must use no-scrollbar or overflow-hidden to eliminate raw scrollbars`
    );
  }
});
