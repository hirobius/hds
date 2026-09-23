#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-brand.mjs
 *
 * Validates that all living documentation files are in sync with the current
 * brand values in hirobius.tokens.json. Exits non-zero if stale values found.
 *
 * Run: pnpm check:brand
 *
 * What it checks:
 *   - No active doc references a brand color hex other than the current primary
 *   - No active doc references a font name that has been superseded
 *
 * What it ignores:
 *   - Historical records ("migrated from X to Y", "was #...")
 *   - CSS font-family fallback stacks that omit stale legacy typeface names
 *   - Test fixture files (they test pipeline mechanics, not brand values)
 *   - Generated files (tokens.css, generated-tokens.ts)
 *   - node_modules
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

import { brandAccent, violationsInSource } from './lib/brand-truth.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Fixture mode: scan a single file (proof-of-firing harness). No-op in normal runs.
const isFixtureMode =
  process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const fixtureFile = process.env.FIXTURE_FILE;

const LEGACY_FONT_NAME = ['In', 'ter'].join('');
const LEGACY_FONT_PATTERN = new RegExp(`\\b${LEGACY_FONT_NAME}\\b`, 'i');
const LEGACY_FONT_FALLBACK_PATTERN = new RegExp(`Atkinson.*${LEGACY_FONT_NAME}`);
const LEGACY_FONT_DECLARATION_PATTERN = new RegExp(
  `font.*:\\s*['"]?${LEGACY_FONT_NAME}['"]?|^.*\\b${LEGACY_FONT_NAME}\\b.*(font|typeface|primary)`,
  'i',
);

// ── Read current brand values ─────────────────────────────────────────────────

const raw = JSON.parse(readFileSync(join(ROOT, 'hirobius.tokens.json'), 'utf8'));

// #246: this used to read `primitive.color.blue.500` directly, then validate the
// docs against it. After #208 repointed the accent to a neutral the gate went on
// reporting "all docs in sync" at #1e2efd for days — it was defining the value it
// was checking, so it could not see drift in it. The accent now comes from
// semantic.accent.rest, resolved the same way the shipped CSS resolves it, and it
// throws rather than falling back if that token is missing.
const primaryColor = brandAccent(raw);

// 12t-typography-truth-up: corrected token path. Was `raw.primitive.font.family.primary`,
// which doesn't exist (tokens carry primitive.typography.family.primary). Empty fontName
// silently disabled the legacy-font drift check.
const fontRaw = raw.primitive?.typography?.family?.primary?.$value;
const fontName = (Array.isArray(fontRaw) ? fontRaw[0] : fontRaw) ?? '';

// No `otherBlues` list any more. The old rule was "the brand is a blue, flag the
// OTHER blues", which stopped meaning anything once the brand became a neutral —
// and would have flagged correct documentation of semantic.color.feedback.info,
// which still aliases primitive.color.blue.500. Blue is no longer the brand; it is
// not thereby stale. scripts/lib/brand-truth.mjs flags a CLAIM instead: a line
// asserting a hex is the brand/primary/accent while naming a different hex.

// ── Files and rules ───────────────────────────────────────────────────────────

const ACTIVE_DOCS =
  isFixtureMode && fixtureFile
    ? [resolve(fixtureFile)]
    : (() => {
        const docs = [
          // The brand spec itself. #246: these three WERE NOT SCANNED, which is
          // why DESIGN.md could open with "a single electric-blue accent" while
          // the gate reported every doc in sync. CLAUDE.md tells every agent to
          // read DESIGN.md first before visual work, so a lie here propagates
          // into code by design.
          join(ROOT, 'DESIGN.md'),
          join(ROOT, 'DESIGN.source.md'),
          join(ROOT, 'DESIGN-HANDOFF.md'),
          join(ROOT, 'scripts', 'build-tokens.mjs'),
          join(ROOT, 'TASKS.md'),
          join(ROOT, 'src', 'app', 'data', 'projects.ts'),
          join(ROOT, 'src', 'app', 'components', 'HdsWebGLTriangleLogo.tsx'),
        ];
        const globalClaudeMd = join(homedir(), '.claude', 'CLAUDE.md');
        if (existsSync(globalClaudeMd)) docs.push(globalClaudeMd);
        return docs;
      })();

// Lines matching these patterns are historical records — skip them
const HISTORICAL_EXEMPTIONS = [
  /migrated from/i,
  /was #[0-9a-fA-F]/i,
  /\(was /i,
  /updated.*from/i,
  /previously/i,
  /instead of/i,
  /not.*legacy font/i,
];

// Lines matching these are font fallback stacks — skip stale font check
const FALLBACK_EXEMPTIONS = [
  /sans-serif/,
  /font-family/,
  /legacy variable fallback/i,
  LEGACY_FONT_FALLBACK_PATTERN,
];

let errors = 0;

for (const file of ACTIVE_DOCS) {
  if (!existsSync(file)) continue;
  const rel = file.startsWith(ROOT) ? file.slice(ROOT.length + 1).replace(/\\/g, '/') : file;
  const lines = readFileSync(file, 'utf8').split('\n');

  // ── Color check ────────────────────────────────────────────────────────────
  // Whole-file, via the shared rule, so the gate and its tests cannot drift.
  for (const v of violationsInSource(readFileSync(file, 'utf8'), rel, primaryColor)) {
    console.error(
      `✗ [${v.file}:${v.line}] claims ${v.found} is the brand accent; it is ${v.expected}`,
    );
    console.error(`    ${v.text}`);
    errors++;
  }

  lines.forEach((line, i) => {
    const lineNum = i + 1;

    // Skip historical lines
    if (HISTORICAL_EXEMPTIONS.some((p) => p.test(line))) return;

    // ── Font check ───────────────────────────────────────────────────────────
    // Flag stale legacy font references outside tests and archived context
    if (LEGACY_FONT_PATTERN.test(line) && !FALLBACK_EXEMPTIONS.some((p) => p.test(line))) {
      // Only flag lines that look like they're declaring the primary font
      if (LEGACY_FONT_DECLARATION_PATTERN.test(line)) {
        console.error(
          `âœ— [${rel}:${lineNum}] Stale legacy font reference "${LEGACY_FONT_NAME}" (current: ${fontName})`,
        );
        console.error(`    ${line.trim()}`);
        errors++;
      }
    }
  });
}

if (errors > 0) {
  console.error(`\n${errors} brand violation(s). Run \`pnpm tokens\` to auto-sync.\n`);
  process.exit(1);
}

console.log(
  `âœ“ check:brand — primary color ${primaryColor}, font "${fontName}" — all docs in sync`,
);
