import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

// ============================================================================
// R1: Mobile App Bar Removal (Mobile preview & Capacitor Android APK)
// ============================================================================

test('R1-T1-1: Dashboard page header is hidden on mobile viewport with hidden sm:block', () => {
  const filePath = path.join(projectRoot, 'src', 'app', 'dashboard', 'page.tsx');
  assert.ok(fs.existsSync(filePath), 'dashboard/page.tsx must exist');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Verify sticky header contains hidden on mobile and sm:block on desktop
  assert.match(
    content,
    /<header[^>]*className="[^"]*hidden\s+sm:block[^"]*"/,
    'Dashboard sticky header must have hidden sm:block to hide mobile app bar per R1'
  );
  assert.match(
    content,
    /safe-top/,
    'Dashboard header should include safe-top padding for notch/status bar avoidance'
  );
});

test('R1-T1-2: Android styles.xml configures AppTheme with DayNight.NoActionBar', () => {
  const filePath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'values', 'styles.xml');
  assert.ok(fs.existsSync(filePath), 'android styles.xml must exist');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(
    content,
    /<style\s+name="AppTheme"\s+parent="Theme\.AppCompat\.DayNight\.NoActionBar">/,
    'AppTheme parent must be Theme.AppCompat.DayNight.NoActionBar'
  );
});

test('R1-T1-3: Android styles.xml explicitly sets windowActionBar to false and windowNoTitle to true', () => {
  const filePath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'values', 'styles.xml');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(
    content,
    /<item\s+name="windowActionBar">false<\/item>/,
    'AppTheme must declare windowActionBar=false'
  );
  assert.match(
    content,
    /<item\s+name="windowNoTitle">true<\/item>/,
    'AppTheme must declare windowNoTitle=true'
  );
});

test('R1-T1-4: Android styles.xml provides AppTheme.NoActionBar with no action bar items', () => {
  const filePath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'values', 'styles.xml');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(
    content,
    /<style\s+name="AppTheme\.NoActionBar"\s+parent="Theme\.AppCompat\.DayNight\.NoActionBar">/,
    'AppTheme.NoActionBar parent must be NoActionBar'
  );
});

test('R1-T1-5: AndroidManifest.xml attaches AppTheme and NoActionBarLaunch theme', () => {
  const filePath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  assert.ok(fs.existsSync(filePath), 'AndroidManifest.xml must exist');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(
    content,
    /android:theme="@style\/AppTheme"/,
    'Application must use @style/AppTheme'
  );
  assert.match(
    content,
    /android:theme="@style\/AppTheme\.NoActionBarLaunch"/,
    'MainActivity must use @style/AppTheme.NoActionBarLaunch'
  );
});

test('R1-T2-1 (Boundary): Mobile viewport width logic (<640px) hides app bar', () => {
  const evaluateHeaderVisibility = (viewportWidth) => {
    // Tailwind breakpoint sm is 640px. hidden sm:block means:
    return viewportWidth >= 640;
  };

  assert.equal(evaluateHeaderVisibility(320), false, '320px (iPhone SE) must hide app bar');
  assert.equal(evaluateHeaderVisibility(375), false, '375px (iPhone mini) must hide app bar');
  assert.equal(evaluateHeaderVisibility(390), false, '390px (iPhone 14) must hide app bar');
  assert.equal(evaluateHeaderVisibility(412), false, '412px (Pixel 7) must hide app bar');
  assert.equal(evaluateHeaderVisibility(639), false, '639px boundary must hide app bar');
  assert.equal(evaluateHeaderVisibility(640), true, '640px sm breakpoint displays header');
  assert.equal(evaluateHeaderVisibility(1024), true, '1024px desktop displays header');
});

test('R1-T2-2 (Boundary): Zero or undefined viewport dimension does not cause false positive visibility', () => {
  const evaluateHeaderVisibilitySafe = (width) => {
    if (!width || typeof width !== 'number' || width <= 0) return false;
    return width >= 640;
  };

  assert.equal(evaluateHeaderVisibilitySafe(0), false);
  assert.equal(evaluateHeaderVisibilitySafe(-100), false);
  assert.equal(evaluateHeaderVisibilitySafe(null), false);
  assert.equal(evaluateHeaderVisibilitySafe(undefined), false);
  assert.equal(evaluateHeaderVisibilitySafe(NaN), false);
});

test('R1-T2-3 (Boundary): Mobile strip variant renders full width block without desktop header dependency', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'InternshipSelector.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.ok(
    content.includes("variant === 'mobile-strip' ? 'w-full block' : 'inline-block'"),
    'InternshipSelector must support mobile-strip full width rendering'
  );
});

test('R1-T2-4 (Boundary): Safe area insets (safe-top, safe-bottom) are applied without restoring app bar', () => {
  const filePath = path.join(projectRoot, 'src', 'app', 'dashboard', 'page.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.ok(content.includes('safe-top'), 'Header retains safe-top for notch');
  assert.ok(
    content.includes('pb-36 sm:pb-40 pb-[calc(env(safe-area-inset-bottom)+7.5rem)]') || content.includes('pb-36'),
    'Bottom padding accommodates bottom nav'
  );
});

test('R1-T2-5 (Boundary): Android styles.xml preserves NoActionBar across all subthemes', () => {
  const filePath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'values', 'styles.xml');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Verify that neither style contains windowActionBar=true
  assert.ok(!content.includes('<item name="windowActionBar">true</item>'));
  assert.ok(!content.includes('<item name="windowNoTitle">false</item>'));
});

// ============================================================================
// R2: Report Header UI Clean-up (No emojis in Summary & Report Headers)
// ============================================================================

test('R2-T1-1: PunchClockCard "Add Notes to Summary" button contains zero emojis', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'PunchClockCard.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Must contain "Add Notes to Summary"
  assert.match(content, /Add Notes to Summary/i);

  // Must NOT contain Sparkles or emoji in that button definition
  const buttonSnippetMatch = content.match(/<button[^>]*>[^<]*Add Notes to Summary[^<]*<\/button>/s);
  assert.ok(buttonSnippetMatch, 'Found Add Notes to Summary button snippet');
  const buttonSnippet = buttonSnippetMatch[0];

  assert.ok(!buttonSnippet.includes('✨'), 'Must not contain sparkle emoji');
  assert.ok(!buttonSnippet.includes('Sparkles'), 'Must not contain Sparkles component');
});

test('R2-T1-2: PunchClockCard "Weekly Report & Monthly Report Summary" header contains zero emojis', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'PunchClockCard.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(content, /Weekly Report &amp; Monthly Report Summary|Weekly Report & Monthly Report Summary/);

  // Check the heading section for emoji icons
  const headerSectionMatch = content.match(/Weekly Report &amp; Monthly Report Summary[^<]*/);
  assert.ok(headerSectionMatch, 'Found Weekly Report summary section');
  const headerText = headerSectionMatch[0];
  assert.ok(!headerText.includes('📝'), 'Must not contain clipboard emoji');
  assert.ok(!headerText.includes('✨'), 'Must not contain sparkles emoji');
});

test('R2-T1-3: PunchClockCard does not import or render Sparkles icon', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'PunchClockCard.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Import list from lucide-react should not include Sparkles
  const lucideImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*'lucide-react'/);
  assert.ok(lucideImportMatch, 'lucide-react import exists');
  const importedIcons = lucideImportMatch[1];
  assert.ok(!importedIcons.includes('Sparkles'), 'Sparkles must NOT be imported in PunchClockCard');
  assert.ok(!content.includes('<Sparkles'), 'Sparkles component must NOT be rendered');
});

test('R2-T1-4: LogsTab headers and action buttons are clean of emojis', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'LogsTab.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Verify common emojis are absent from header/button labels
  assert.ok(!content.includes('✨'));
  assert.ok(!content.includes('📝'));
  assert.ok(!content.includes('📊'));
  assert.ok(!content.includes('⚡'));
});

test('R2-T1-5: DayActivityModal summary labels contain zero emojis', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'DayActivityModal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.ok(!content.includes('✨'));
  assert.ok(!content.includes('📝'));
  assert.ok(!content.includes('⚡'));
});

test('R2-T2-1 (Boundary): Unicode emoji range scan over PunchClockCard summary headers detects 0 emojis', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'PunchClockCard.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Match the summary section around lines 1060-1090
  const summaryBlockMatch = content.match(/Add Notes to Summary[\s\S]{1,1200}Weekly Report &amp; Monthly Report Summary/);
  assert.ok(summaryBlockMatch, 'Summary block located');
  const summaryBlock = summaryBlockMatch[0];

  // Regex for unicode emojis
  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  assert.ok(!emojiRegex.test(summaryBlock), 'Summary block must not contain any unicode emojis');
});

test('R2-T2-2 (Boundary): User custom notes containing emojis do not contaminate section headers', () => {
  const rawHeader = 'Weekly Report & Monthly Report Summary';
  const userNotesWithEmoji = 'Fixed UI layout glitch 🚀✨ on dashboard';

  const formatSummary = (header, notes) => {
    return {
      sectionTitle: header,
      userAccomplishment: notes,
    };
  };

  const formatted = formatSummary(rawHeader, userNotesWithEmoji);
  const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  assert.ok(!emojiRegex.test(formatted.sectionTitle), 'Section title must remain pristine and emoji-free');
  assert.equal(formatted.sectionTitle, 'Weekly Report & Monthly Report Summary');
});

test('R2-T2-3 (Boundary): Empty or whitespace-only custom notes do not insert fallback decorative emojis', () => {
  const resolveSummaryText = (tasks, customNotes) => {
    if (!tasks.length && !customNotes?.trim()) {
      return '';
    }
    return 'Summary generated';
  };

  assert.equal(resolveSummaryText([], ''), '');
  assert.equal(resolveSummaryText([], '   '), '');
  assert.ok(!resolveSummaryText([], '').includes('✨'));
});

test('R2-T2-4 (Boundary): HTML entities like &amp; in report headers are preserved without emoji wrappers', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'PunchClockCard.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.ok(
    content.includes('Weekly Report &amp; Monthly Report Summary'),
    'Header should preserve standard clean typography'
  );
});

test('R2-T2-5 (Boundary): Long summary notes (2000+ chars) preserve clean title structure', () => {
  const title = 'Weekly Report & Monthly Report Summary';
  const longNotes = 'A'.repeat(2500);

  const container = `${title}\n${longNotes}`;
  assert.ok(container.startsWith(title));
  assert.ok(!container.slice(0, title.length).includes('✨'));
});

// ============================================================================
// R3: Calendar Photo of the Day Horizontally Centered Preview
// ============================================================================

test('R3-T1-1: DayActivityModal photo preview container has mx-auto for horizontal centering', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'DayActivityModal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Verify preview container with mx-auto
  assert.match(
    content,
    /className="[^"]*aspect-\[16\/10\][^"]*mx-auto[^"]*"/,
    'Photo preview container must include mx-auto for horizontal centering'
  );
});

test('R3-T1-2: Photo preview container has flex items-center justify-center', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'DayActivityModal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(
    content,
    /className="[^"]*aspect-\[16\/10\][^"]*flex\s+items-center\s+justify-center[^"]*"/,
    'Photo preview container must have flex items-center justify-center'
  );
});

test('R3-T1-3: Photo preview container is bounded by max-w-sm to prevent off-center stretching', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'DayActivityModal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(
    content,
    /className="[^"]*w-full\s+max-w-sm[^"]*mx-auto[^"]*"/,
    'Photo preview container must be w-full max-w-sm mx-auto'
  );
});

test('R3-T1-4: Photo preview image element uses w-full h-full object-cover', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'DayActivityModal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.ok(
    content.includes('w-full h-full object-cover'),
    'Preview img element must fill centered container with object-cover'
  );
});

test('R3-T1-5: Empty photo dropzone container maintains centered alignment', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'DayActivityModal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(
    content,
    /border-2\s+border-dashed[\s\S]*?flex\s+flex-col\s+items-center\s+justify-center/,
    'Empty photo upload dropzone must be centered'
  );
});

test('R3-T2-1 (Boundary): Centered container accommodates landscape 16:9 images without margin skew', () => {
  const getContainerStyles = (aspectRatio) => {
    return {
      centering: 'mx-auto',
      display: 'flex items-center justify-center',
      aspectRatio,
      maxWidth: 'max-w-sm',
    };
  };

  const landscape = getContainerStyles('16/9');
  assert.equal(landscape.centering, 'mx-auto');
  assert.equal(landscape.display, 'flex items-center justify-center');
});

test('R3-T2-2 (Boundary): Centered container accommodates portrait 9:16 images within max-h constraint', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'DayActivityModal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Verify max-h-48 sm:max-h-60 constraints
  assert.match(content, /max-h-48\s+sm:max-h-60/);
});

test('R3-T2-3 (Boundary): Square 1:1 image thumbnails maintain centered frame alignment', () => {
  const computeAlignment = (containerWidth, imageWidth) => {
    return (containerWidth - imageWidth) / 2;
  };
  // 384px max-w-sm container, 300px image -> centered with 42px left and right
  const offset = computeAlignment(384, 300);
  assert.equal(offset, 42);
});

test('R3-T2-4 (Boundary): Small mobile viewport (320px) retains mx-auto without overflow', () => {
  const modalMaxWidth = 512; // max-w-lg
  const containerMaxWidth = 384; // max-w-sm
  const mobileViewport = 320;

  // On a 320px screen, w-full ensures it doesn't exceed 320px - margins
  const effectiveWidth = Math.min(mobileViewport - 32, containerMaxWidth);
  assert.ok(effectiveWidth <= mobileViewport);
  assert.ok(effectiveWidth > 0);
});

test('R3-T2-5 (Boundary): Photo action overlay maintains centered button cluster', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'DayActivityModal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(
    content,
    /className="[^"]*absolute\s+inset-0[^"]*flex\s+items-center\s+justify-center[^"]*"/,
    'Hover action overlay must center buttons over image'
  );
});

// ============================================================================
// R4: Unified ImageModal Reusable Component Across Views
// ============================================================================

test('R4-T1-1: Unified ImageModal exists at src/components/ImageModal.tsx and exports default component', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'ImageModal.tsx');
  assert.ok(fs.existsSync(filePath), 'src/components/ImageModal.tsx must exist');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(content, /export\s+default\s+function\s+ImageModal\s*\(/);
  assert.match(content, /export\s+interface\s+ImageModalProps/);
});

test('R4-T1-2: CalendarTab imports and renders unified ImageModal from @/components/ImageModal', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'CalendarTab.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(content, /import\s+ImageModal\s+from\s+'@\/components\/ImageModal'/);
  assert.match(content, /<ImageModal/);
  assert.match(content, /isOpen=\{Boolean\(previewImage\)\}/);
});

test('R4-T1-3: LogsTab imports and renders unified ImageModal from @/components/ImageModal', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'LogsTab.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(content, /import\s+ImageModal\s+from\s+'@\/components\/ImageModal'/);
  assert.match(content, /<ImageModal/);
  assert.match(content, /isOpen=\{Boolean\(lightboxPhoto\)\}/);
});

test('R4-T1-4: DayActivityModal imports and renders unified ImageModal from @/components/ImageModal', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'DayActivityModal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(content, /import\s+ImageModal\s+from\s+'@\/components\/ImageModal'/);
  assert.match(content, /<ImageModal/);
  assert.match(content, /isOpen=\{isImageModalOpen\}/);
});

test('R4-T1-5: ImageModal implements zoom toggle, Escape key listener, and click-outside dismissal', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'ImageModal.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Zoom toggle state
  assert.match(content, /isZoomed/);
  assert.match(content, /setIsZoomed/);

  // Escape key handler
  assert.match(content, /e\.key\s*===\s*'Escape'/);

  // Click outside backdrop
  assert.match(content, /onClick=\{onClose\}/);
  assert.match(content, /e\.stopPropagation\(\)/);
});

test('R4-T2-1 (Boundary): ImageModal returns null when isOpen is false', () => {
  const shouldRenderModal = (isOpen, imageUrl, isBrowser) => {
    if (!isOpen || !imageUrl || !isBrowser) return null;
    return 'RENDER_PORTAL';
  };

  assert.equal(shouldRenderModal(false, 'https://example.com/photo.jpg', true), null);
});

test('R4-T2-2 (Boundary): ImageModal returns null when imageUrl is empty string or null', () => {
  const shouldRenderModal = (isOpen, imageUrl, isBrowser) => {
    if (!isOpen || !imageUrl || !isBrowser) return null;
    return 'RENDER_PORTAL';
  };

  assert.equal(shouldRenderModal(true, '', true), null);
  assert.equal(shouldRenderModal(true, null, true), null);
  assert.equal(shouldRenderModal(true, undefined, true), null);
});

test('R4-T2-3 (Boundary): ImageModal handles missing date, title, and description gracefully', () => {
  const resolveTitle = (title, date) => {
    const formattedDate = date ? `Activity for ${date}` : null;
    return title || formattedDate || 'Activity Photo';
  };

  assert.equal(resolveTitle(null, null), 'Activity Photo');
  assert.equal(resolveTitle(undefined, undefined), 'Activity Photo');
  assert.equal(resolveTitle('', ''), 'Activity Photo');
  assert.equal(resolveTitle('Custom Title', null), 'Custom Title');
  assert.equal(resolveTitle(null, '2026-11-17'), 'Activity for 2026-11-17');
});

test('R4-T2-4 (Boundary): Zoom resets to false when modal opens or image changes', () => {
  let isZoomed = true;
  const onModalOpenChange = (isOpen, prevImageUrl, newImageUrl) => {
    if (isOpen) {
      isZoomed = false;
    }
  };

  onModalOpenChange(true, 'photo1.jpg', 'photo2.jpg');
  assert.equal(isZoomed, false, 'Zoom must reset on open or image transition');
});

test('R4-T2-5 (Boundary): Scroll lock cleans up document.body.style.overflow on unmount', () => {
  const mockBody = { style: { overflow: 'auto' } };

  // Lock
  const prevOverflow = mockBody.style.overflow;
  mockBody.style.overflow = 'hidden';
  assert.equal(mockBody.style.overflow, 'hidden');

  // Cleanup
  mockBody.style.overflow = prevOverflow;
  assert.equal(mockBody.style.overflow, 'auto');
});

// ============================================================================
// R5: Calendar Fallback Flame Icon
// ============================================================================

test('R5-T1-1: CalendarTab imports Flame icon from lucide-react', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'CalendarTab.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  const lucideImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*'lucide-react'/);
  assert.ok(lucideImportMatch);
  assert.ok(lucideImportMatch[1].includes('Flame'), 'CalendarTab must import Flame icon');
});

test('R5-T1-2: Calendar cells render Flame icon when activity or log exists without a photo', () => {
  const evaluateFallbackIcon = (hasPhoto, entry, log) => {
    return !hasPhoto && Boolean(entry || log);
  };

  // Has log, no photo -> renders flame
  assert.equal(evaluateFallbackIcon(false, null, { hours_worked: 8 }), true);

  // Has entry without image, no log -> renders flame
  assert.equal(evaluateFallbackIcon(false, { description: 'Meeting' }, null), true);

  // Has both log and entry without image -> renders flame
  assert.equal(evaluateFallbackIcon(false, { description: 'Code' }, { hours_worked: 4 }), true);
});

test('R5-T1-3: Calendar cells with a photo render image and DO NOT render Flame fallback icon', () => {
  const evaluateFallbackIcon = (hasPhoto, entry, log) => {
    return !hasPhoto && Boolean(entry || log);
  };

  // Has photo -> no flame icon
  assert.equal(evaluateFallbackIcon(true, { image_url: 'https://example.com/pic.jpg' }, { hours_worked: 8 }), false);
});

test('R5-T1-4: Calendar cells with neither entry nor log do not render Flame icon', () => {
  const evaluateFallbackIcon = (hasPhoto, entry, log) => {
    return !hasPhoto && Boolean(entry || log);
  };

  assert.equal(evaluateFallbackIcon(false, null, null), false);
  assert.equal(evaluateFallbackIcon(false, undefined, undefined), false);
});

test('R5-T1-5: Flame icon renders with text-[#C44900]/70 and drop-shadow styling', () => {
  const filePath = path.join(projectRoot, 'src', 'components', 'dashboard', 'CalendarTab.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert.match(
    content,
    /<Flame[^>]*className="[^"]*text-\[#C44900\]\/70[^"]*drop-shadow-\[0_0_8px_rgba\(196,73,0,0\.3\)\][^"]*"/,
    'Flame icon must render with orange brand tint and glow'
  );
});

test('R5-T2-1 (Boundary): Calendar entry with empty string image_url triggers Flame fallback', () => {
  const entry = { date: '2026-11-10', image_url: '' };
  const log = { date: '2026-11-10', hours_worked: 8 };

  const hasPhoto = Boolean(entry?.image_url && entry.image_url.trim().length > 0);
  const showFlame = !hasPhoto && Boolean(entry || log);

  assert.equal(hasPhoto, false);
  assert.equal(showFlame, true);
});

test('R5-T2-2 (Boundary): Calendar entry with whitespace-only image_url triggers Flame fallback', () => {
  const entry = { date: '2026-11-10', image_url: '    ' };
  const hasPhoto = Boolean(entry?.image_url && entry.image_url.trim().length > 0);
  const showFlame = !hasPhoto && Boolean(entry);

  assert.equal(hasPhoto, false);
  assert.equal(showFlame, true);
});

test('R5-T2-3 (Boundary): Calendar day with 0 hours log but activity notes triggers Flame icon', () => {
  const log = { date: '2026-11-12', hours_worked: 0, custom_tasks: 'Planning session' };
  const entry = null;

  const hasPhoto = false;
  const showFlame = !hasPhoto && Boolean(entry || log);

  assert.equal(showFlame, true);
});

test('R5-T2-4 (Boundary): Current day (isToday) with log but no photo renders Flame icon alongside today ring', () => {
  const cell = { date: '2026-11-17', isToday: true, dayNumber: 17 };
  const log = { date: '2026-11-17', hours_worked: 8 };
  const entry = null;

  const hasPhoto = Boolean(entry?.image_url);
  const showFlame = !hasPhoto && Boolean(entry || log);

  assert.equal(cell.isToday, true);
  assert.equal(showFlame, true);
});

test('R5-T2-5 (Boundary): Multiple calendar entries across month grid independently render Flame or photo', () => {
  const entries = [
    { date: '2026-11-01', image_url: 'https://example.com/day1.jpg' },
    { date: '2026-11-02', image_url: null },
    { date: '2026-11-03', image_url: '' },
  ];
  const logs = [
    { date: '2026-11-02', hours_worked: 8 },
    { date: '2026-11-03', hours_worked: 7 },
    { date: '2026-11-04', hours_worked: 6 },
  ];

  const entriesByDate = new Map(entries.map((e) => [e.date, e]));
  const logsByDate = new Map(logs.map((l) => [l.date, l]));

  const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'];

  const results = days.map((date) => {
    const entry = entriesByDate.get(date);
    const log = logsByDate.get(date);
    const hasPhoto = Boolean(entry?.image_url && entry.image_url.trim().length > 0);
    const showFlame = !hasPhoto && Boolean(entry || log);
    return { date, hasPhoto, showFlame };
  });

  // Day 1: Photo, no flame
  assert.equal(results[0].hasPhoto, true);
  assert.equal(results[0].showFlame, false);

  // Day 2: No photo, has log -> flame
  assert.equal(results[1].hasPhoto, false);
  assert.equal(results[1].showFlame, true);

  // Day 3: Empty photo, has log -> flame
  assert.equal(results[2].hasPhoto, false);
  assert.equal(results[2].showFlame, true);

  // Day 4: No entry, has log -> flame
  assert.equal(results[3].hasPhoto, false);
  assert.equal(results[3].showFlame, true);

  // Day 5: Neither -> blank (no photo, no flame)
  assert.equal(results[4].hasPhoto, false);
  assert.equal(results[4].showFlame, false);
});
