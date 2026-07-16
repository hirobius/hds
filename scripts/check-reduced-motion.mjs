/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-reduced-motion.mjs
 *
 * Verifies that the HDS motion system respects prefers-reduced-motion:
 *
 *   Layer 1 — CSS transitions (enforced here):
 *     src/styles/theme.css must contain an @media (prefers-reduced-motion: reduce)
 *     block that zeroes all --hds-duration-* custom properties.
 *
 * Layer 2 — Motion (Framer Motion) animations — NOT enforced here (#185):
 *   This check originally also required a single app root (src/app/App.tsx) to
 *   wrap its tree in <MotionConfig reducedMotion="user">. That file was removed
 *   in the ADR-018 Storybook migration (#90): this repo is a Storybook-first
 *   component library with no single app root to instrument — `motion/react`
 *   animations live per-component (src/app/components/*.tsx), each importing
 *   duration/easing from static JS token constants (src/app/design-system/
 *   tokens.ts) that are resolved once at module load and do NOT track the CSS
 *   custom properties Layer 1 zeroes at runtime, so they don't collapse under
 *   prefers-reduced-motion automatically.
 *
 *   A #185 audit found only 1 of 16 `motion/react`-consuming components
 *   (theme-toggle.tsx) locally handles this (its own <MotionConfig
 *   reducedMotion="user"> wrapper) — the other 15 have no reduced-motion
 *   handling at the JS layer. Retargeting this check to a real per-component
 *   scan would fail on that pre-existing gap, which is a separate, larger
 *   accessibility remediation across many components — out of scope for a
 *   gate-script bug fix. Tracked as a follow-up: #190.
 *
 *   Per #185's own DoD, this check now enforces Layer 1 (CSS) only until that
 *   follow-up lands a real per-component pattern to gate on.
 *
 * Inspired by:
 *   IBM Carbon — motion.duration tokens mapped to 0ms in reduced-motion context.
 *   Apple HIG  — prefers-reduced-motion is a legal a11y requirement in many
 *                jurisdictions (WCAG 2.3.3 AAA; de facto standard for AA compliance).
 *
 * "Never assume a user wants animation. 10–35% of users report motion sensitivity."
 * — Vestibular Disorders Association (VeDA)
 *
 * Usage: pnpm check:motion
 * Exempt: not applicable — this check has no per-line exemptions.
 */

import { readFileSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = process.cwd();
const failures = [];

// Fixture mode: scan a single file (proof-of-firing harness). No-op in normal runs.
const isFixtureMode =
  process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const fixtureFile = process.env.FIXTURE_FILE;

// ── Duration tokens that MUST be zeroed in the reduced-motion block ───────────

const REQUIRED_DURATION_VARS = [
  '--primitive-duration-instant',
  '--primitive-duration-short',
  '--primitive-duration-medium',
  '--primitive-duration-long',
  '--hds-motion-productive-duration',
  '--hds-motion-expressive-duration',
  '--hds-motion-spatial-duration',
  '--hds-motion-exit-duration',
];

// ── Layer 1: CSS @media (prefers-reduced-motion) ──────────────────────────────

const THEME_CSS =
  isFixtureMode && fixtureFile ? resolve(fixtureFile) : join(ROOT, 'src/styles/theme.css');

try {
  const css = readFileSync(THEME_CSS, 'utf-8');

  if (!css.includes('@media (prefers-reduced-motion')) {
    failures.push({
      file: isFixtureMode ? fixtureFile : 'src/styles/theme.css',
      msg:
        'Missing @media (prefers-reduced-motion: reduce) block.\n' +
        '       Add a block that zeroes the primitive and semantic motion duration vars:\n\n' +
        '       @media (prefers-reduced-motion: reduce) {\n' +
        '         :root { --primitive-duration-instant: 0s; ... }\n' +
        '       }',
    });
  } else {
    // Extract all content inside @media (prefers-reduced-motion) blocks.
    // Uses brace-depth counting to handle nested selectors (e.g. :root {}).
    let blockContent = '';
    const mediaRe = /@media\s*\(prefers-reduced-motion[^)]*\)\s*\{/g;
    let m;
    while ((m = mediaRe.exec(css)) !== null) {
      let depth = 1;
      let i = m.index + m[0].length;
      while (i < css.length && depth > 0) {
        if (css[i] === '{') depth++;
        else if (css[i] === '}') depth--;
        if (depth > 0) blockContent += css[i];
        i++;
      }
    }

    for (const varName of REQUIRED_DURATION_VARS) {
      if (!blockContent.includes(varName)) {
        failures.push({
          file: isFixtureMode ? fixtureFile : 'src/styles/theme.css',
          msg:
            `prefers-reduced-motion block is missing override for ${varName}.\n` +
            `       Add: ${varName}: 0s; inside the @media block.`,
        });
      }
    }
  }
} catch {
  failures.push({
    file: isFixtureMode ? fixtureFile : 'src/styles/theme.css',
    msg: 'File not found.',
  });
}

// ── Report ────────────────────────────────────────────────────────────────────

if (failures.length === 0) {
  console.log('\n✓ Reduced motion check passed — CSS layer covered.\n');
  console.log(
    '  Note: JS/Motion (motion/react) per-component reduced-motion coverage is a\n' +
      '  known gap, not yet gated here — see #190.\n',
  );
  process.exit(0);
} else {
  console.error(`\n✗ Reduced motion check failed — ${failures.length} issue(s).\n`);
  console.error('  Motion sensitivity affects 10–35% of users.\n');
  console.error(
    '    Layer 1: @media (prefers-reduced-motion) in theme.css — fixes CSS transitions\n',
  );

  for (const { file, msg } of failures) {
    console.error(`  ${file}`);
    console.error(`    ✗  ${msg}\n`);
  }

  process.exit(1);
}
