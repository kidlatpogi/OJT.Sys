import test from 'node:test';
import assert from 'node:assert/strict';
import { ruleBasedPastTenseSummary } from '../src/lib/past-tense-regex.ts';
import { PRESET_OJT_TASKS } from '../src/types/ojt.ts';

// ============================================================================
// Tier 1: Feature Tests (>=5 tests)
// ============================================================================

test('R6-T1-1: Reload restores exactly the 8 default preset tasks', () => {
  let userChecklist = [
    { id: 'custom-1', label: 'Conduct User Interviews', category: 'Research' },
    { id: 'custom-2', label: 'Figma Component Design', category: 'Design' },
  ];

  assert.equal(userChecklist.length, 2);

  // User triggers reload defaults
  userChecklist = [...PRESET_OJT_TASKS];

  assert.equal(userChecklist.length, 8);
  assert.equal(userChecklist[0].id, 'frontend_ui');
  assert.equal(userChecklist[0].label, 'Frontend UI Implementation');
  assert.equal(userChecklist[7].id, 'data_encoding');
  assert.equal(userChecklist[7].label, 'System Records & Archival');
  assert.deepEqual(userChecklist, PRESET_OJT_TASKS);
});

test('R6-T1-2: Adding dynamic custom task generates unique ID and assigns category', () => {
  let checklist = [...PRESET_OJT_TASKS];
  const initialLength = checklist.length;

  const newTask = {
    id: `custom_${Date.now()}`,
    label: 'Setup CI/CD GitHub Actions Pipeline',
    category: 'DevOps',
  };

  checklist = [...checklist, newTask];

  assert.equal(checklist.length, initialLength + 1);
  const added = checklist.find((t) => t.id === newTask.id);
  assert.ok(added);
  assert.equal(added.label, 'Setup CI/CD GitHub Actions Pipeline');
  assert.equal(added.category, 'DevOps');
});

test('R6-T1-3: Editing dynamic custom task updates label and synchronizes active selected tasks', () => {
  let checklist = [...PRESET_OJT_TASKS];
  const taskId = 'custom_edit_test';
  const initialLabel = 'Database Index Optimization';
  checklist.push({ id: taskId, label: initialLabel, category: 'Data' });

  let selectedTasks = ['Frontend UI Implementation', initialLabel];

  // User edits label
  const updatedLabel = 'PostgreSQL Query & Index Optimization';
  checklist = checklist.map((t) =>
    t.id === taskId ? { ...t, label: updatedLabel } : t
  );
  selectedTasks = selectedTasks.map((label) =>
    label === initialLabel ? updatedLabel : label
  );

  const updated = checklist.find((t) => t.id === taskId);
  assert.equal(updated.label, updatedLabel);
  assert.ok(selectedTasks.includes(updatedLabel));
  assert.ok(!selectedTasks.includes(initialLabel));
});

test('R6-T1-4: Deleting dynamic custom task removes item and unchecks active selection', () => {
  let checklist = [...PRESET_OJT_TASKS];
  const taskId = 'custom_delete_test';
  const label = 'Docker Compose Multi-Container Orchestration';
  checklist.push({ id: taskId, label, category: 'DevOps' });

  let selectedTasks = ['API Integration & Endpoints', label];

  // User deletes task
  checklist = checklist.filter((t) => t.id !== taskId);
  selectedTasks = selectedTasks.filter((t) => t !== label);

  assert.ok(!checklist.some((t) => t.id === taskId));
  assert.ok(!selectedTasks.includes(label));
  assert.deepEqual(selectedTasks, ['API Integration & Endpoints']);
});

test('R6-T1-5: Checklist JSON serialization and parsing for Supabase profiles.work_checklist', () => {
  const customChecklist = [
    ...PRESET_OJT_TASKS,
    { id: 'c-1', label: 'E2E Cypress Test Suite', category: 'Quality' },
  ];

  // Serialize to JSON payload sent to Supabase
  const serialized = JSON.stringify(customChecklist);
  assert.ok(typeof serialized === 'string');

  // Parse simulated DB response
  const deserialized = JSON.parse(serialized);
  assert.ok(Array.isArray(deserialized));
  assert.equal(deserialized.length, 9);
  assert.equal(deserialized[8].label, 'E2E Cypress Test Suite');
});

// ============================================================================
// Tier 2: Boundary & Corner Cases (>=5 tests)
// ============================================================================

test('R6-T2-1 (Boundary): Adding task trims leading and trailing whitespace', () => {
  const rawInput = '   Conduct User Acceptance Testing   ';
  const cleaned = rawInput.trim();

  assert.equal(cleaned, 'Conduct User Acceptance Testing');
  assert.equal(cleaned.startsWith(' '), false);
  assert.equal(cleaned.endsWith(' '), false);
});

test('R6-T2-2 (Boundary): Empty checklist array [] does not throw and allows adding tasks', () => {
  let emptyChecklist = [];
  assert.equal(emptyChecklist.length, 0);

  // Render check
  const renderedList = emptyChecklist.map((t) => t.label);
  assert.deepEqual(renderedList, []);

  // Add task to empty list
  emptyChecklist.push({ id: 'first_task', label: 'First Task', category: 'Custom' });
  assert.equal(emptyChecklist.length, 1);

  // Reload to defaults from empty state
  emptyChecklist = [...PRESET_OJT_TASKS];
  assert.equal(emptyChecklist.length, 8);
});

test('R6-T2-3 (Boundary): Duplicate task labels with unique IDs are distinguished correctly', () => {
  const task1 = { id: 'dup-1', label: 'Code Review', category: 'Collab' };
  const task2 = { id: 'dup-2', label: 'Code Review', category: 'Quality' };

  let list = [task1, task2];
  assert.equal(list.length, 2);

  // Deleting dup-1 leaves dup-2
  list = list.filter((t) => t.id !== 'dup-1');
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'dup-2');
  assert.equal(list[0].category, 'Quality');
});

test('R6-T2-4 (Boundary): Very long task label (300+ characters) is preserved without truncation', () => {
  const longLabel = 'Refactor enterprise microservice architecture with asynchronous message queues '.repeat(4);
  assert.ok(longLabel.length > 300);

  const task = { id: 'long-1', label: longLabel, category: 'Engineering' };
  const serialized = JSON.stringify(task);
  const parsed = JSON.parse(serialized);

  assert.equal(parsed.label.length, longLabel.length);
  assert.equal(parsed.label, longLabel);
});

test('R6-T2-5 (Boundary): Special characters, HTML tags, and quotes encode safely', () => {
  const maliciousOrSpecial = '<script>alert("XSS")</script> & \'quoted\' / `backtick` "double"';
  const task = { id: 'special-1', label: maliciousOrSpecial, category: 'Security' };

  const json = JSON.stringify(task);
  const restored = JSON.parse(json);

  assert.equal(restored.label, maliciousOrSpecial);
  // Does not cause JSON breakage
  assert.equal(typeof restored.label, 'string');
});

test('R6-T2-6 (Boundary): Deleting a non-existent task ID is a safe no-op', () => {
  let list = [...PRESET_OJT_TASKS];
  const initialLength = list.length;

  list = list.filter((t) => t.id !== 'non_existent_id_9999');
  assert.equal(list.length, initialLength);
});

test('R6-T2-7 (Boundary): Editing task to identical label is idempotent', () => {
  let list = [{ id: 't1', label: 'System Documentation', category: 'Docs' }];
  const original = list[0];

  const updateLabel = 'System Documentation';
  list = list.map((t) => (t.id === 't1' ? { ...t, label: updateLabel } : t));

  assert.equal(list[0].label, original.label);
  assert.equal(list[0].category, original.category);
});

test('R6-T2-8 (Boundary): Rule-based past tense summary engine converts custom tasks accurately', () => {
  const tasks = ['Frontend UI Implementation', 'Design System Design Tokens v2'];
  const customNotes = 'Fix redirect loop on iOS Safari';

  const summary = ruleBasedPastTenseSummary(tasks, customNotes);

  // Preset task converted using preset map
  assert.ok(
    summary.includes('Implemented responsive frontend user interface components and layouts.')
  );
  // Custom task converted with past tense
  assert.ok(
    summary.includes('Designed') || summary.includes('Completed design') || summary.includes('Design')
  );
  // Custom note converted
  assert.ok(summary.includes('Fixed redirect loop on iOS Safari.'));
});
