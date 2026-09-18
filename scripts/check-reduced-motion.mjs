/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-reduced-motion.mjs
 *
 * Verifies that the HDS motion system respects prefers-reduced-motion:
 *
 *   Layer 1 — CSS transitions:
 *     src/styles/theme.css must contain an @media (prefers-reduced-motion: reduce)
 *     block that zeroes all --hds-duration-* custom properties.
 *
 *   Layer 2 — Motion (motion/react) animations:
 *     A #185 audit found only 1 of 16 `motion/react`-consuming components
 *     (theme-toggle.tsx) locally handled reduced motion (its own <MotionConfig
 *     reducedMotion="user"> wrapper) — the other 15 read duration/easing
 *     straight off `hds.motion.*` (src/app/design-system/tokens.ts), a plain
 *     JS number resolved once at module load that does NOT track the CSS
 *     custom properties Layer 1 zeroes at runtime.
 *
 *     #190 closed that gap with a token-level reactive hook instead of 15
 *     per-component <MotionConfig> wrappers: useHdsMotion() (src/app/hooks/
 *     useHdsMotion.ts) wraps useReducedMotion() and zeroes `duration` while
 *     the OS preference is set — one fix point instead of many. This layer
 *     enforces the pattern going forward: any src/app/components/**\/*.tsx
 *     file (excluding .stories.tsx / .test.tsx) that imports from
 *     'motion/react' may not read `hds.motion.<category>` directly — it must
 *     go through useHdsMotion('<category>') instead. theme-toggle.tsx's own
 *     <MotionConfig> wrapper never reads `hds.motion.*`, so it doesn't trip
 *     this rule — it's a valid alternate pattern, just not the default one.
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

import { readFileSync, readdirSync, statSync } from 'fs';
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

// ── Layer 2: JS/Motion (motion/react) reactive duration coverage (#190) ───────

const MOTION_IMPORT_RE = /from\s+['"]motion\/react['"]/;
const RAW_HDS_MOTION_RE = /hds\.motion\./;

function scanComponentSource(source, label) {
  if (!MOTION_IMPORT_RE.test(source)) return;
  if (!RAW_HDS_MOTION_RE.test(source)) return;

  failures.push({
    file: label,
    msg:
      'Reads `hds.motion.*` directly while importing motion/react.\n' +
      "       hds.motion.<category> is a static JS number — it won't collapse under\n" +
      "       prefers-reduced-motion. Call useHdsMotion('<category>') from\n" +
      '       src/app/hooks/useHdsMotion.ts instead, e.g.:\n\n' +
      "         const productiveMotion = useHdsMotion('productive');\n" +
      '         transition={{ duration: productiveMotion.duration, ease: productiveMotion.easing }}',
  });
}

function walkComponentFiles(dir, results = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkComponentFiles(full, results);
    } else if (
      entry.name.endsWith('.tsx') &&
      !entry.name.endsWith('.stories.tsx') &&
      !entry.name.endsWith('.test.tsx')
    ) {
      results.push(full);
    }
  }
  return results;
}

if (isFixtureMode && fixtureFile) {
  // Same fixture file doubles as the Layer 2 scan target — its content is
  // scanned both as (potential) theme.css text above and as a component
  // source below, so one fixture pair can exercise both layers.
  try {
    const source = readFileSync(resolve(fixtureFile), 'utf-8');
    scanComponentSource(source, fixtureFile);
  } catch {
    // Layer 1 above already records a "File not found" failure.
  }
} else {
  const COMPONENTS_DIR = join(ROOT, 'src/app/components');
  let statOk = true;
  try {
    statSync(COMPONENTS_DIR);
  } catch {
    statOk = false;
  }
  if (statOk) {
    for (const file of walkComponentFiles(COMPONENTS_DIR)) {
      const source = readFileSync(file, 'utf-8');
      scanComponentSource(source, file.slice(ROOT.length + 1));
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

if (failures.length === 0) {
  console.log('\n✓ Reduced motion check passed — CSS and motion/react layers covered.\n');
  process.exit(0);
} else {
  console.error(`\n✗ Reduced motion check failed — ${failures.length} issue(s).\n`);
  console.error('  Motion sensitivity affects 10–35% of users.\n');
  console.error(
    '    Layer 1: @media (prefers-reduced-motion) in theme.css — fixes CSS transitions\n' +
      '    Layer 2: useHdsMotion() instead of raw hds.motion.* — fixes motion/react animations\n',
  );

  for (const { file, msg } of failures) {
    console.error(`  ${file}`);
    console.error(`    ✗  ${msg}\n`);
  }

  process.exit(1);
}
