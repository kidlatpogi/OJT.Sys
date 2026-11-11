const VERB_MAP: Record<string, string> = {
  implement: 'Implemented',
  implementing: 'Implemented',
  create: 'Created',
  creating: 'Created',
  build: 'Built',
  building: 'Built',
  develop: 'Developed',
  developing: 'Developed',
  design: 'Designed',
  designing: 'Designed',
  fix: 'Fixed',
  fixing: 'Fixed',
  debug: 'Debugged',
  debugging: 'Debugged',
  test: 'Tested',
  testing: 'Tested',
  integrate: 'Integrated',
  integrating: 'Integrated',
  update: 'Updated',
  updating: 'Updated',
  deploy: 'Deployed',
  deploying: 'Deployed',
  configure: 'Configured',
  configuring: 'Configured',
  refactor: 'Refactored',
  refactoring: 'Refactored',
  optimize: 'Optimized',
  optimizing: 'Optimized',
  migrate: 'Migrated',
  migrating: 'Migrated',
  document: 'Documented',
  documenting: 'Documented',
  attend: 'Attended',
  attending: 'Attended',
  review: 'Reviewed',
  reviewing: 'Reviewed',
  assist: 'Assisted',
  assisting: 'Assisted',
  maintain: 'Maintained',
  maintaining: 'Maintained',
  encode: 'Encoded',
  encoding: 'Encoded',
  verify: 'Verified',
  verifying: 'Verified',
  setup: 'Set up',
  'set up': 'Set up',
  prepare: 'Prepared',
  preparing: 'Prepared',
  analyze: 'Analyzed',
  analyzing: 'Analyzed',
  resolve: 'Resolved',
  resolving: 'Resolved',
};

const PRESET_TO_PAST_TENSE: Record<string, string> = {
  'Frontend UI Implementation': 'Implemented responsive frontend user interface components and layouts.',
  'API Integration & Endpoints': 'Integrated backend API endpoints and handled asynchronous data responses.',
  'Database Schema & Queries': 'Updated database schemas, queries, and relational data records.',
  'Debugging & QA Testing': 'Debugged application issues and performed quality assurance testing.',
  'Server & Deployment Ops': 'Maintained server configurations and supported deployment operations.',
  'Technical Documentation': 'Prepared and updated technical documentation for system workflows.',
  'Team Standup & Code Review': 'Participated in daily team standups and peer code reviews.',
  'System Records & Archival': 'Processed, verified, and archived digital system records.',
};

function convertPhraseToPastTense(raw: string): string {
  const cleaned = raw.trim().replace(/^[-•*]\s*/, '').replace(/\.$/, '');
  if (!cleaned) return '';

  if (PRESET_TO_PAST_TENSE[cleaned]) {
    return PRESET_TO_PAST_TENSE[cleaned];
  }

  const lower = cleaned.toLowerCase();
  for (const [base, past] of Object.entries(VERB_MAP)) {
    const regex = new RegExp(`^${base}\\b`, 'i');
    if (regex.test(lower)) {
      const rest = cleaned.slice(base.length).trim();
      return rest ? `${past} ${rest}.` : `${past}.`;
    }
  }

  // If already starts with an -ed verb, capitalize cleanly
  const firstWord = cleaned.split(/\s+/)[0] ?? '';
  if (/ed$/i.test(firstWord) && firstWord.length > 3) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1) + '.';
  }

  return `Completed ${cleaned.charAt(0).toLowerCase() + cleaned.slice(1)}.`;
}

export function ruleBasedPastTenseSummary(tasks: string[], customText: string): string {
  const statements: string[] = [];

  for (const task of tasks) {
    const converted = convertPhraseToPastTense(task);
    if (converted) statements.push(converted);
  }

  if (customText.trim()) {
    const lines = customText
      .split(/\n|;|•/)
      .map((item) => item.trim())
      .filter(Boolean);
    for (const line of lines) {
      const converted = convertPhraseToPastTense(line);
      if (converted) statements.push(converted);
    }
  }

  if (statements.length === 0) {
    return 'Performed assigned daily internship duties and technical support tasks.';
  }

  return statements.map((line) => `• ${line}`).join('\n');
}

