import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  APP_VERSION,
  APP_VERSION_CODE,
  compareSemver,
} from '../src/config/version.ts';
import {
  CHANGELOG_ITEMS,
  WHATS_NEW_STORAGE_KEY,
} from '../src/config/changelog.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ----------------------------------------------------------------------------
// 1. Mobile Bottom Navigation Clearance Verification
// ----------------------------------------------------------------------------
test('Mobile Clearance: Dashboard page.tsx has ample bottom padding class pb-36', () => {
  const filePath = path.join(projectRoot, 'src', 'app', 'dashboard', 'page.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.ok(
    content.includes('pb-36 sm:pb-40 pb-[calc(env(safe-area-inset-bottom)+7.5rem)]') || content.includes('pb-36'),
    'Dashboard page.tsx must contain pb-36 clearance'
  );
});

test('Mobile Clearance: All 6 dashboard tab root containers contain pb-36 clearance', () => {
  const tabFiles = [
    { name: 'Clock (PunchClockCard)', relPath: 'src/components/dashboard/PunchClockCard.tsx' },
    { name: 'Calendar (CalendarTab)', relPath: 'src/components/dashboard/CalendarTab.tsx' },
    { name: 'Logs (LogsTab)', relPath: 'src/components/dashboard/LogsTab.tsx' },
    { name: 'Reports (ReportsTab)', relPath: 'src/components/dashboard/ReportsTab.tsx' },
    { name: 'Checklist (ChecklistTab)', relPath: 'src/components/dashboard/ChecklistTab.tsx' },
    { name: 'Profile (ProfileTab)', relPath: 'src/components/dashboard/ProfileTab.tsx' },
  ];

  for (const tab of tabFiles) {
    const fullPath = path.join(projectRoot, tab.relPath);
    assert.ok(fs.existsSync(fullPath), `Tab file ${tab.relPath} must exist`);
    const content = fs.readFileSync(fullPath, 'utf-8');

    assert.ok(
      content.includes('pb-36 sm:pb-40 pb-[calc(env(safe-area-inset-bottom)+7.5rem)]') || content.includes('pb-36'),
      `${tab.name} root container must contain pb-36 bottom clearance`
    );
  }
});

// ----------------------------------------------------------------------------
// 2. What's New Route Isolation
// ----------------------------------------------------------------------------
test('Route Guard: WhatsNewModal is completely removed from public landing page (src/app/page.tsx)', () => {
  const landingPath = path.join(projectRoot, 'src', 'app', 'page.tsx');
  const content = fs.readFileSync(landingPath, 'utf-8');

  assert.ok(
    !content.includes('WhatsNewModal'),
    'Public landing page must not import or render WhatsNewModal'
  );
  assert.ok(
    !content.includes('<WhatsNewModal'),
    'Public landing page must not mount <WhatsNewModal />'
  );
});

test('Route Guard: WhatsNewModal and ApkUpdateModal are mounted in authenticated dashboard', () => {
  const dashboardPath = path.join(projectRoot, 'src', 'app', 'dashboard', 'page.tsx');
  const content = fs.readFileSync(dashboardPath, 'utf-8');

  assert.ok(
    content.includes("import WhatsNewModal from '@/components/WhatsNewModal'"),
    'Dashboard must import WhatsNewModal'
  );
  assert.ok(
    content.includes('<WhatsNewModal />'),
    'Dashboard must render <WhatsNewModal />'
  );

  assert.ok(
    content.includes("import ApkUpdateModal from '@/components/ApkUpdateModal'"),
    'Dashboard must import ApkUpdateModal'
  );
  assert.ok(
    content.includes('<ApkUpdateModal />'),
    'Dashboard must render <ApkUpdateModal />'
  );
});

test('Route Guard: WhatsNewModal.tsx contains strict pathname check for /dashboard', () => {
  const modalPath = path.join(projectRoot, 'src', 'components', 'WhatsNewModal.tsx');
  const content = fs.readFileSync(modalPath, 'utf-8');

  assert.ok(
    content.includes('usePathname'),
    'WhatsNewModal must use usePathname hook'
  );
  assert.ok(
    content.includes("pathname !== '/dashboard'"),
    'WhatsNewModal must check pathname !== /dashboard'
  );
});

// ----------------------------------------------------------------------------
// 3. Changelog Expansion (8 items)
// ----------------------------------------------------------------------------
test('Changelog: Contains all 8 UI and UX items with proper metadata', () => {
  assert.equal(CHANGELOG_ITEMS.length, 8, 'Must contain exactly 8 changelog entries');

  const expectedIds = [
    'mobile-scrolling',
    'clock-calendar-sync',
    'offline-attendance',
    'collapsible-logs',
    'matte-buttons',
    'standalone-cards',
    'supabase-recovery',
    'apk-update-detection',
  ];

  for (const expectedId of expectedIds) {
    const item = CHANGELOG_ITEMS.find((c) => c.id === expectedId);
    assert.ok(item, `Changelog item with id "${expectedId}" must exist`);
    assert.ok(item.title.length > 5, `Title for ${expectedId} must be descriptive`);
    assert.ok(item.badge.length > 0, `Badge for ${expectedId} must be non-empty`);
    assert.ok(item.description.length > 20, `Description for ${expectedId} must be detailed`);
    assert.ok(item.iconName.length > 0, `iconName for ${expectedId} must be defined`);
  }

  assert.equal(WHATS_NEW_STORAGE_KEY, 'ojt_whats_new_v1_4_0_dismissed');
});

// ----------------------------------------------------------------------------
// 4. Semver Comparison & Outdated APK Modal Logic
// ----------------------------------------------------------------------------
test('Semver Comparator: Accurately compares semver version strings', () => {
  assert.ok(compareSemver('1.2.0', '1.3.0') < 0, '1.2.0 should be less than 1.3.0');
  assert.ok(compareSemver('1.2.1', '1.3.0') < 0, '1.2.1 should be less than 1.3.0');
  assert.equal(compareSemver('1.3.0', '1.3.0'), 0, '1.3.0 should be equal to 1.3.0');
  assert.ok(compareSemver('1.4.0', '1.3.0') > 0, '1.4.0 should be greater than 1.3.0');

  // Prefix handling
  assert.ok(compareSemver('v1.2.0', '1.3.0') < 0, 'v1.2.0 should handle v prefix');
  assert.equal(compareSemver('v1.3.0', 'v1.3.0'), 0, 'v1.3.0 equals v1.3.0');

  // Multi-digit components
  assert.ok(compareSemver('1.9.0', '1.10.0') < 0, '1.9.0 should be less than 1.10.0');
});

test('ApkUpdateModal: Contains Capacitor native check and redirect logic', () => {
  const modalPath = path.join(projectRoot, 'src', 'components', 'ApkUpdateModal.tsx');
  assert.ok(fs.existsSync(modalPath), 'ApkUpdateModal.tsx must exist');
  const content = fs.readFileSync(modalPath, 'utf-8');

  assert.ok(content.includes('Capacitor.isNativePlatform()'), 'Must check native platform');
  assert.ok(content.includes('compareSemver'), 'Must compare versions');
  assert.ok(content.includes('LANDING_PAGE_APK_SECTION'), 'Must redirect to landing page APK download');
  assert.ok(content.includes("pathname !== '/dashboard'"), 'Must guard against non-dashboard routes');
});

// ----------------------------------------------------------------------------
// 5. Version Uniformity across Config, Package, and Gradle
// ----------------------------------------------------------------------------
test('Version Uniformity: Config, package.json, and android/build.gradle are synchronized', () => {
  assert.equal(APP_VERSION, '1.3.0');
  assert.equal(APP_VERSION_CODE, 5);

  const pkgJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  assert.equal(pkgJson.version, APP_VERSION, 'package.json version matches APP_VERSION');

  const gradleContent = fs.readFileSync(
    path.join(projectRoot, 'android', 'app', 'build.gradle'),
    'utf-8'
  );
  assert.ok(
    gradleContent.includes(`versionCode ${APP_VERSION_CODE}`),
    `build.gradle must contain versionCode ${APP_VERSION_CODE}`
  );
  assert.ok(
    gradleContent.includes(`versionName "${APP_VERSION}"`),
    `build.gradle must contain versionName "${APP_VERSION}"`
  );
});
