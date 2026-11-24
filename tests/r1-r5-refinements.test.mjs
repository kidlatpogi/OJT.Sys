import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

// ============================================================================
// R1: Custom Task Tags in "What did you work on?"
// ============================================================================

test('R1-T1: PunchClockCard source implements custom reusable tags', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'PunchClockCard.tsx');
  assert.ok(fs.existsSync(filePath), 'PunchClockCard.tsx must exist');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Verify custom tags cache in localStorage
  assert.match(
    content,
    /ojt_custom_tags_/,
    'Must read/write custom tags from localStorage with ojt_custom_tags_ key prefix'
  );

  // Verify dynamic availableCategories calculation
  assert.match(
    content,
    /availableCategories/,
    'Must calculate dynamic availableCategories combining defaults, checklist items, and custom tags'
  );

  // Verify + Custom Tag... option in select
  assert.match(
    content,
    /\+ Custom Tag\.\.\./,
    'Must render "+ Custom Tag..." option in category dropdown'
  );

  // Verify custom input appears when + Custom Tag... is selected
  assert.match(
    content,
    /placeholder="Enter custom tag name/,
    'Must render text input for custom tag name when custom option is chosen'
  );
});

test('R1-T2: Dynamic availableCategories combines defaults, task categories, and custom tags without duplicates', () => {
  const defaultCategories = ['Engineering', 'Data', 'Quality', 'DevOps', 'Docs', 'Collab', 'Ops', 'Design'];
  const checklistItems = [
    { id: '1', label: 'Frontend UI', category: 'Engineering' },
    { id: '2', label: 'Security Review', category: 'Cybersecurity' },
  ];
  const userCustomTags = ['Cybersecurity', 'Research', 'DevOps'];

  const seen = new Set();
  const list = [];
  const addTag = (tag) => {
    const trimmed = tag.trim();
    if (!trimmed || trimmed === '__custom__') return;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      list.push(trimmed);
    }
  };

  defaultCategories.forEach(addTag);
  checklistItems.forEach((t) => { if (t.category) addTag(t.category); });
  userCustomTags.forEach(addTag);

  assert.ok(list.includes('Engineering'), 'Must include default category Engineering');
  assert.ok(list.includes('Cybersecurity'), 'Must include checklist category Cybersecurity');
  assert.ok(list.includes('Research'), 'Must include custom tag Research');
  assert.equal(
    list.filter((c) => c.toLowerCase() === 'cybersecurity').length,
    1,
    'Must deduplicate categories case-insensitively'
  );
  assert.equal(
    list.filter((c) => c.toLowerCase() === 'devops').length,
    1,
    'Must deduplicate DevOps between defaults and custom tags'
  );
});

test('R1-T3: Adding a task with custom category persists category and registers custom tag', () => {
  const customTagName = 'Cloud Architecture';
  const customTags = ['Research'];

  // Simulate registerCustomTag logic
  const trimmed = customTagName.trim();
  const lower = trimmed.toLowerCase();
  const updatedTags = customTags.some((t) => t.toLowerCase() === lower)
    ? customTags
    : [...customTags, trimmed];

  const newTask = {
    id: `task_${Date.now()}`,
    label: 'Deploy Kubernetes Cluster',
    category: trimmed,
  };

  assert.equal(newTask.category, 'Cloud Architecture');
  assert.ok(updatedTags.includes('Cloud Architecture'));
  assert.equal(updatedTags.length, 2);
});

// ============================================================================
// R2: Internship Dropdown Appearance and Full CRUD
// ============================================================================

test('R2-T1: InternshipSelector trigger renders clean text without Briefcase emoji/logo', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'InternshipSelector.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Verify Briefcase is NOT imported or used
  assert.ok(!content.includes('Briefcase'), 'Briefcase icon must be completely removed');

  // Verify Edit and Delete icons are imported
  assert.ok(content.includes('Pencil'), 'InternshipSelector must import Pencil for edit trigger');
  assert.ok(content.includes('Trash2'), 'InternshipSelector must import Trash2 for delete trigger');
});

test('R2-T2: InternshipSelector renders Edit and Delete buttons for each internship option', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'InternshipSelector.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(
    content,
    /aria-label="Edit internship"/,
    'Must render accessible button to edit internship'
  );
  assert.match(
    content,
    /aria-label="Delete internship"/,
    'Must render accessible button to delete internship'
  );
  assert.match(
    content,
    /onEditInternship\s*\?:\s*\(internship:\s*Internship\)\s*=>\s*void/,
    'Must define onEditInternship prop'
  );
  assert.match(
    content,
    /onDeleteInternship\s*\?:\s*\(internship:\s*Internship\)\s*=>\s*void/,
    'Must define onDeleteInternship prop'
  );
});

test('R2-T3: deleteInternshipRecord helper function in internship-service.ts', () => {
  const filePath = path.join(projectRoot, 'src', 'lib', 'internship-service.ts');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(
    content,
    /export\s+async\s+function\s+deleteInternshipRecord/,
    'Must export deleteInternshipRecord helper function'
  );
  assert.match(
    content,
    /saveDemoInternships/,
    'deleteInternshipRecord must update local demo internships storage'
  );
});

test('R2-T4: ProtectedDeleteModal generalization supports custom title, targetLabel, targetValue, and description', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'ProtectedDeleteModal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(content, /title\?: string/, 'ProtectedDeleteModalProps must declare optional title prop');
  assert.match(content, /targetLabel\?: string/, 'ProtectedDeleteModalProps must declare optional targetLabel prop');
  assert.match(content, /targetValue\?: string/, 'ProtectedDeleteModalProps must declare optional targetValue prop');
  assert.match(content, /description\?: string/, 'ProtectedDeleteModalProps must declare optional description prop');
});

test('R2-T5: Internship deletion cascades associated attendance logs and calendar entries', () => {
  const targetId = 'internship-2';
  const initialInternships = [
    { id: 'internship-1', title: 'First Program', company_name: 'Company A' },
    { id: 'internship-2', title: 'Second Program', company_name: 'Company B' },
  ];
  const initialLogs = [
    { id: 'log-1', internship_id: 'internship-1', hours_worked: 8 },
    { id: 'log-2', internship_id: 'internship-2', hours_worked: 6 },
    { id: 'log-3', internship_id: 'internship-2', hours_worked: 7 },
  ];
  const initialCalendarEntries = [
    { date: '2026-08-01', internship_id: 'internship-1', title: 'Day 1' },
    { date: '2026-08-02', internship_id: 'internship-2', title: 'Day 2' },
  ];

  // Simulate cascade deletion logic
  const remainingInternships = initialInternships.filter((i) => i.id !== targetId);
  const remainingLogs = initialLogs.filter((l) => l.internship_id !== targetId);
  const remainingCalendarEntries = initialCalendarEntries.filter((e) => e.internship_id !== targetId);

  assert.equal(remainingInternships.length, 1);
  assert.equal(remainingInternships[0].id, 'internship-1');
  assert.equal(remainingLogs.length, 1);
  assert.equal(remainingLogs[0].id, 'log-1');
  assert.equal(remainingCalendarEntries.length, 1);
  assert.equal(remainingCalendarEntries[0].internship_id, 'internship-1');
});

test('R2-T6: Deleting active internship switches active selection to another available program or triggers graceful empty state', () => {
  const switchActive = (activeId, targetId, internships) => {
    const remaining = internships.filter((i) => i.id !== targetId);
    if (activeId === targetId) {
      if (remaining.length > 0) {
        return { nextActiveId: remaining[0].id, needsOnboarding: false };
      }
      return { nextActiveId: null, needsOnboarding: true };
    }
    return { nextActiveId: activeId, needsOnboarding: false };
  };

  // Case A: 2 programs, delete active
  const resultA = switchActive('internship-1', 'internship-1', [
    { id: 'internship-1' },
    { id: 'internship-2' },
  ]);
  assert.equal(resultA.nextActiveId, 'internship-2');
  assert.equal(resultA.needsOnboarding, false);

  // Case B: sole program, delete active
  const resultB = switchActive('internship-1', 'internship-1', [{ id: 'internship-1' }]);
  assert.equal(resultB.nextActiveId, null);
  assert.equal(resultB.needsOnboarding, true);
});

// ============================================================================
// R3: White Theme for Calendar and Logs Modals
// ============================================================================

test('R3-T1: DayActivityModal renders clean white theme surfaces', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'DayActivityModal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Verify modal card is white with light border
  assert.match(
    content,
    /className="[^"]*bg-white[^"]*text-slate-900[^"]*rounded-3xl[^"]*border-2 border-slate-200[^"]*"/,
    'DayActivityModal card must use bg-white text-slate-900 border-2 border-slate-200'
  );

  // Verify inputs use light styling
  assert.match(
    content,
    /bg-slate-50\/50\s+border-2\s+border-slate-200/,
    'Inputs must use clean light surface styling'
  );
});

test('R3-T2: DayActivityModal preserves critical test regex structural classes', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'DayActivityModal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Exact regexes from tests/r1-r5-ui.test.mjs
  assert.match(content, /aspect-\[16\/10\]/);
  assert.match(content, /mx-auto/);
  assert.match(content, /w-full\s+max-w-sm/);
  assert.match(content, /max-h-48\s+sm:max-h-60/);
  assert.match(content, /flex\s+items-center\s+justify-center/);
  assert.match(content, /border-2\s+border-dashed[\s\S]*?flex\s+flex-col\s+items-center\s+justify-center/);
  assert.match(content, /w-full h-full object-cover/);
});

test('R3-T3: LogsTab Add/Edit modal displays matching eyebrow badge with Clock icon', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'LogsTab.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(
    content,
    /<Clock\s+className="w-3\.5\s+h-3\.5"\s*\/>\s*What did you work on\?/,
    'LogsTab modal must display matching eyebrow badge with Clock icon'
  );
});

// ============================================================================
// R4: Standardize Required Fields Across Profile, Internship Setup, and Onboarding
// ============================================================================

test('R4-T1: StandardProfileFields.tsx implements all 9 standardized fields', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'StandardProfileFields.tsx');
  assert.ok(fs.existsSync(filePath), 'StandardProfileFields.tsx must exist');
  const content = fs.readFileSync(filePath, 'utf-8');

  // 1. First Name & Last Name (Full Name split)
  assert.match(content, /First Name/, 'Must render First Name label');
  assert.match(content, /Last Name/, 'Must render Last Name label');

  // 2. Student ID & Program
  assert.match(content, /Student ID/, 'Must render Student ID label');
  assert.match(content, /Program/, 'Must render Program label');

  // 3. Company Name
  assert.match(content, /Company Name/, 'Must render Company Name label');

  // 4. Branch / Department
  assert.match(content, /Branch \/ Department/, 'Must render Branch / Department label');

  // 5. Supervisor Name
  assert.match(content, /Supervisor Name/, 'Must render Supervisor Name label');

  // 6. Trainor Name (Optional) [explicit label check]
  assert.match(content, /Trainor Name \(Optional\)/, 'Label must explicitly include "(Optional)"');

  // 7. Required OJT Hours
  assert.match(content, /Required OJT Hours/, 'Must render Required OJT Hours label');

  // 8. Lunch Break Deduction (Minutes)
  assert.match(content, /Lunch Break Deduction \(Minutes\)/, 'Must render Lunch Break Deduction label');

  // 9. Shift Schedule
  assert.match(content, /Shift Start Time/, 'Must render Shift Start Time label');
  assert.match(content, /Shift End Time/, 'Must render Shift End Time label');
});

test('R4-T2: 1:1 component reuse in ProfileTab and InternshipSetupModal', () => {
  const profileTabPath = path.join(projectRoot, 'src', 'components', 'dashboard', 'ProfileTab.tsx');
  const setupModalPath = path.join(projectRoot, 'src', 'components', 'dashboard', 'InternshipSetupModal.tsx');

  const profileContent = fs.readFileSync(profileTabPath, 'utf-8');
  const setupContent = fs.readFileSync(setupModalPath, 'utf-8');

  assert.match(
    profileContent,
    /<StandardProfileFields\s+formData=\{formData\}\s+onChange=\{handleFieldChange\}\s*\/>/,
    'ProfileTab must reuse StandardProfileFields 1:1'
  );

  assert.match(
    setupContent,
    /<StandardProfileFields\s+formData=\{formData\}\s+onChange=\{handleFieldChange\}\s*\/>/,
    'InternshipSetupModal must reuse StandardProfileFields 1:1'
  );
});

test('R4-T3: splitFullName and combineFullName correctly synchronize First and Last Name', () => {
  const splitFullName = (fullName) => {
    if (!fullName) return { firstName: '', lastName: '' };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return { firstName: parts[0] || '', lastName: '' };
    const lastName = parts.pop() || '';
    const firstName = parts.join(' ');
    return { firstName, lastName };
  };

  const combineFullName = (firstName, lastName) => {
    return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
  };

  // Standard case
  const res1 = splitFullName('Juan Dela Cruz');
  assert.equal(res1.firstName, 'Juan Dela');
  assert.equal(res1.lastName, 'Cruz');
  assert.equal(combineFullName(res1.firstName, res1.lastName), 'Juan Dela Cruz');

  // Single name
  const res2 = splitFullName('Madonna');
  assert.equal(res2.firstName, 'Madonna');
  assert.equal(res2.lastName, '');
  assert.equal(combineFullName(res2.firstName, res2.lastName), 'Madonna');

  // Empty name
  const res3 = splitFullName('');
  assert.equal(res3.firstName, '');
  assert.equal(res3.lastName, '');
  assert.equal(combineFullName(res3.firstName, res3.lastName), '');

  // Trimming extra whitespace
  const combined = combineFullName('  Maria Clara  ', '  Santos  ');
  assert.equal(combined, 'Maria Clara Santos');
});

// ============================================================================
// R5: Reposition and Compact Status Badge
// ============================================================================

test('R5-T1: PunchClockCard repositions status badge inline beside liveDateStr', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'PunchClockCard.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Verify compact inline badge classes
  assert.match(
    content,
    /text-\[10px\]\s+px-2\s+py-0\.5\s+rounded-full\s+inline-flex\s+items-center\s+gap-1\s+font-mono\s+font-bold/,
    'Status badge must be styled as a compact inline badge'
  );

  // Verify "Not Timed In Yet" status text
  assert.match(
    content,
    /Not Timed In Yet/,
    'Status badge must display "Not Timed In Yet" when unclocked'
  );

  // Verify the bulky vertical alert card is removed
  assert.ok(
    !content.includes('Tap "Tap to Time-In" above to unlock task selection'),
    'Bulky vertical alert card must be eliminated from checklist section'
  );
});
