import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

test('Railway & Dropdown: Dot has no blinking animation in InternshipSelector', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'InternshipSelector.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Verify animate-ping has been removed
  assert.ok(!content.includes('animate-ping'), 'InternshipSelector must not have animate-ping blinking dot');
  // Verify clean brand-orange dot is present
  assert.ok(content.includes('bg-[#C44900] ring-2 ring-white'), 'InternshipSelector must have clean static brand-orange dot');
});

test('Railway & Dropdown: Dropdown in railway variant drops up with w-full to avoid overflow/clipping', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'InternshipSelector.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.ok(
    content.includes("'left-0 right-0 bottom-full mb-2 w-full shadow-2xl'"),
    'InternshipSelector in railway variant must use bottom-full mb-2 w-full to prevent clipping on the right and bottom'
  );
});

test('Railway & Dropdown: Active Program in railway is relocated above the name hr divider', () => {
  const filePath = path.join(projectRoot, 'src', 'app', 'dashboard', 'page.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  const railwayAsideStart = content.indexOf("{navLayout === 'rail' && (");
  assert.ok(railwayAsideStart !== -1, 'Railway navigation aside must exist in DashboardPage');

  const railwayAsideEnd = content.indexOf('</aside>', railwayAsideStart);
  assert.ok(railwayAsideEnd !== -1, 'Railway navigation aside closing tag must exist');

  const railwaySection = content.slice(railwayAsideStart, railwayAsideEnd);

  const activeProgIndex = railwaySection.indexOf('Active Program');
  const dividerIndex = railwaySection.indexOf('border-t border-slate-100');
  const userNameIndex = railwaySection.indexOf('effectiveProfile.full_name');

  assert.ok(activeProgIndex !== -1, 'Active Program must be present in railway navigation');
  assert.ok(dividerIndex !== -1, 'Divider (hr) must be present in railway navigation');
  assert.ok(userNameIndex !== -1, 'User name must be present in railway navigation');

  // Active Program must be above the divider line and user name
  assert.ok(activeProgIndex < dividerIndex, 'Active Program must be located above the divider line');
  assert.ok(dividerIndex < userNameIndex, 'Divider line must be located above the user name');
});
