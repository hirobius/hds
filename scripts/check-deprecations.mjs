/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-deprecations.mjs
 *
 * Deprecation-lifecycle gate. Every `@deprecated` JSDoc tag on the public
 * surface must carry an `@removeIn <semver>` in the same JSDoc block, and that
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
 * A tag counts only at the start of a JSDoc line, the way the manifest reads
 * it (scripts/lib/jsdoc-contract.mjs parseDeprecation): a one-line
 * `/** @deprecated … *\/` is a deprecation, but a `@removeIn` written later on
 * that same line is not a tag, and prose that mentions `@deprecated` in
 * backticks is not a deprecation.
 *
 * Scope (hds#390 step 3, hds#389 D6): everything a consumer can import.
 *   - top-level files in src/app/components/ and src/app/layouts/
 *   - src/index.ts and src/patterns.ts
 *   - every JS entry of package.json#exports (read from package.json, not
 *     listed here), following its relative `export … from './x'` re-exports
 * Exempt: add `// deprecation-ok: <reason>` anywhere in the file.
 *
 * Runs in `pretest` (registry firingChannel `pnpm-meta`; it was `manual` after
 * the #52 archive until hds#389 D6 reversed that).
 *
 * Usage: node scripts/check-deprecations.mjs (from the package root)
 * Exit codes: 0 = clean, 1 = violations.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { parseDeprecation } from './lib/jsdoc-contract.mjs';
import { readJsExportEntries } from './lib/package-entries.mjs';

const ROOT = process.cwd();
const SOURCE_DIRS = ['src/app/components', 'src/app/layouts'];
const SOURCE_FILES = ['src/index.ts', 'src/patterns.ts'];
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

function findViolations(content) {
  const out = [];
  const cur = parseSemver(COMPARE_VERSION);
  for (const block of content.match(JSDOC_RE) ?? []) {
    const deprecation = parseDeprecation(block);
    if (!deprecation) continue;
    if (!deprecation.removeIn) {
      out.push(
        `@deprecated block missing "@removeIn <semver>" — every deprecation needs a removal plan`,
      );
      continue;
    }
    const target = parseSemver(deprecation.removeIn);
    if (!target) {
      out.push(`@removeIn "${deprecation.removeIn}" is not a valid semver (expected X.Y.Z)`);
      continue;
    }
    if (cur && !gt(target, cur)) {
      out.push(
        `@removeIn ${deprecation.removeIn} is past-due (<= current ${COMPARE_VERSION}) — remove the API + ship its codemod`,
      );
    }
  }
  return out;
}

const isSource = (file) => /\.tsx?$/.test(file) && existsSync(file) && statSync(file).isFile();

/** Top-level .ts/.tsx files of a source directory (none when it does not exist). */
function topLevelSources(dir) {
  // src/app/layouts/ has been empty, and so absent, since 0.20.0 (hds#394).
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((entry) => join(dir, entry))
    .filter(isSource);
}

// `export * from './x'`, `export * as ns from './x'`, `export { a, b as c } from './x'`
const REEXPORT_RE =
  /^\s*export\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s*from\s*['"](\.{1,2}\/[^'"]+)['"]/gm;

/** The module a relative specifier names, or null for a non-TS target. */
function resolveModule(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);
  return (
    [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')].find(
      isSource,
    ) ?? null
  );
}

/** Every package.json#exports JS entry, plus the modules it re-exports, transitively. */
function exportedModules(root) {
  const seen = new Set();
  const queue = readJsExportEntries(root).map((entry) => entry.file);
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const m of readFileSync(file, 'utf-8').matchAll(REEXPORT_RE)) {
      const target = resolveModule(file, m[1]);
      if (target) queue.push(target);
    }
  }
  return seen;
}

function scope(root) {
  const files = new Set([
    ...SOURCE_DIRS.flatMap((dir) => topLevelSources(join(root, dir))),
    ...SOURCE_FILES.map((file) => join(root, file)),
    ...exportedModules(root),
  ]);
  return [...files].sort();
}

const entries = isFixtureMode && fixtureFile ? [resolve(fixtureFile)] : scope(ROOT);

const violations = [];
for (const full of entries) {
  if (!isSource(full)) continue;
  const content = readFileSync(full, 'utf-8');
  if (content.includes('// deprecation-ok')) continue;
  for (const detail of findViolations(content)) {
    violations.push({ file: relative(ROOT, full).replace(/\\/g, '/'), detail });
  }
}

if (violations.length === 0) {
  console.log(
    `✓ check-deprecations — every @deprecated has a future @removeIn target (${entries.length} files).`,
  );
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
