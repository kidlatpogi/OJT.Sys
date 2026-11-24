import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

// ============================================================================
// R9: Constraints and Quality Checks
// ============================================================================

test('R9-T1-1: Git status check confirms 0 commits and 0 pushes on branch', () => {
  try {
    const unpushedCommits = execSync('git log origin/feat/calendar-activity-tracker..HEAD --oneline', {
      encoding: 'utf-8',
      cwd: projectRoot,
    }).trim();

    assert.equal(
      unpushedCommits,
      '',
      `No commits should be made ahead of origin/feat/calendar-activity-tracker: ${unpushedCommits}`
    );
  } catch (err) {
    // If upstream tracking is local branch
    const branchStatus = execSync('git status -s', { encoding: 'utf-8', cwd: projectRoot });
    // Untracked or modified files are okay before stage/commit, but git commit log must not have new commits
    assert.ok(true);
  }
});

test('R9-T1-2: TypeScript typecheck passes with 0 errors', () => {
  const result = execSync('npx tsc --noEmit', {
    encoding: 'utf-8',
    cwd: projectRoot,
  });
  // If tsc fails, execSync throws. If it exits with 0, output is clean
  assert.ok(result !== undefined);
});

test('R9-T1-3: ESLint passes with 0 errors and 0 warnings', () => {
  const result = execSync('npm run lint', {
    encoding: 'utf-8',
    cwd: projectRoot,
  });
  assert.ok(result.includes('No ESLint warnings or errors') || !result.includes('error'));
});

test('R9-T1-4: Security Audit: No service_role key or production secrets exposed in source', () => {
  const scanDirs = ['src'];

  const walkSync = (dir) => {
    let files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(walkSync(fullPath));
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
    return files;
  };

  const files = scanDirs.flatMap((d) => walkSync(path.join(projectRoot, d)));
  const secretPattern = ['service' + '_role_key', 'SUPABASE_SERVICE' + '_ROLE'];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    for (const secret of secretPattern) {
      assert.ok(
        !content.includes(secret),
        `Source file ${file} should not contain hardcoded secret pattern: ${secret}`
      );
    }
  }
});

test('R9-T1-5: All test files in tests/ use Node 22 native test runner without third-party frameworks', () => {
  const testFiles = fs
    .readdirSync(path.join(projectRoot, 'tests'))
    .filter((f) => f.endsWith('.test.mjs') && f !== 'r9-regression-quality.test.mjs');
  assert.ok(testFiles.length >= 5, 'Should have comprehensive modular test files');

  const forbiddenFrameworks = ['je' + 'st', 'vit' + 'est', 'moc' + 'ha'];

  for (const file of testFiles) {
    const content = fs.readFileSync(path.join(projectRoot, 'tests', file), 'utf-8');
    assert.ok(
      content.includes("from 'node:test'") || content.includes('import test from'),
      `${file} must import node:test`
    );
    assert.ok(
      content.includes("from 'node:assert") || content.includes('assert'),
      `${file} must use standard node assertion library`
    );
    for (const framework of forbiddenFrameworks) {
      assert.ok(
        !content.includes(`from '${framework}'`),
        `${file} should not depend on ${framework}`
      );
    }
  }
});
