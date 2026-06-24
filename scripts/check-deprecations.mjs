/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-deprecations.mjs
 *
 * Deprecation-lifecycle gate. Every `@deprecated` JSDoc tag in the component
 * tier must carry an `@removeIn <semver>` in the same JSDoc block, and that
 * version must still be in the future relative to the current package version.
 *
 * Why: a `@deprecated` tag with no removal plan never gets removed — the API
 * surface only grows. This gate makes deprecation a closed loop: tag → plan a
 * removal version → ship a codemod (codemods/) → the gate goes red once the
 * version lands, forcing the cleanup. Single source of truth is the code itself
 * (no separate ledger to drift).
 *
 * Rules per `@deprecated` JSDoc block:
 *   1. must include `@removeIn <semver>` (e.g. `@removeIn 1.0.0`)
 *   2. that semver must be GREATER than the current package.json version
 *      (a past-due deprecation is a failure — remove it, with its codemod)
 *
 * Scope: top-level files in src/app/components/.
 * Exempt: add `// deprecation-ok: <reason>` anywhere in the file.
 *
 * Usage: node scripts/check-deprecations.mjs
 * Exit codes: 0 = clean, 1 = violations.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve, basename } from 'path';

const ROOT = process.cwd();
const COMPONENTS_DIR = join(ROOT, 'src/app/components');
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
const CURRENT_VERSION = PKG.version;

const isFixtureMode =
  process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1';
const fixtureFile = process.env.FIXTURE_FILE;
// In fixture mode, override the "current version" so fixtures are deterministic
// regardless of the real package version.
const COMPARE_VERSION = isFixtureMode ? '1.0.0' : CURRENT_VERSION;

/** Parse "X.Y.Z" → [X,Y,Z] ints; returns null if not a clean semver. */
function parseSemver(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
/** a > b ? */
function gt(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

const JSDOC_RE = /\/\*\*[\s\S]*?\*\//g;
const REMOVE_IN_RE = /@removeIn\s+(\S+)/;

function findViolations(content) {
  const out = [];
  const cur = parseSemver(COMPARE_VERSION);
  for (const block of content.match(JSDOC_RE) ?? []) {
    if (!block.includes('@deprecated')) continue;
    const m = REMOVE_IN_RE.exec(block);
    if (!m) {
      out.push(
        `@deprecated block missing "@removeIn <semver>" — every deprecation needs a removal plan`,
      );
      continue;
    }
    const target = parseSemver(m[1]);
    if (!target) {
      out.push(`@removeIn "${m[1]}" is not a valid semver (expected X.Y.Z)`);
      continue;
    }
    if (cur && !gt(target, cur)) {
      out.push(
        `@removeIn ${m[1]} is past-due (<= current ${COMPARE_VERSION}) — remove the API + ship its codemod`,
      );
    }
  }
  return out;
}

const entries =
  isFixtureMode && fixtureFile
    ? [resolve(fixtureFile)]
    : readdirSync(COMPONENTS_DIR).map((e) => join(COMPONENTS_DIR, e));

const violations = [];
for (const full of entries) {
  const entry = basename(full);
  if (!entry.endsWith('.tsx') && !entry.endsWith('.ts')) continue;
  if (!statSync(full).isFile()) continue;
  const content = readFileSync(full, 'utf-8');
  if (content.includes('// deprecation-ok')) continue;
  for (const detail of findViolations(content)) {
    violations.push({ file: relative(ROOT, full).replace(/\\/g, '/'), detail });
  }
}

if (violations.length === 0) {
  console.log('✓ check-deprecations — every @deprecated has a future @removeIn target.');
  process.exit(0);
}

console.error(`✗ check-deprecations — ${violations.length} deprecation-lifecycle violation(s):`);
console.error('');
for (const { file, detail } of violations) {
  console.error(`  ${file}`);
  console.error(`    ${detail}`);
  console.error('');
}
console.error('  Fix: add `@removeIn <semver>` (a future version) to the @deprecated JSDoc, or');
console.error('       if past-due, remove the API and ship its codemod (codemods/).');
console.error('  Exempt: // deprecation-ok: <reason>');
process.exit(1);
