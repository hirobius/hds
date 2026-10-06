#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/check-tests-with-code.mjs
 *
 * TDD gate (ported from ops#502): a branch that changes source (src/,
 * scripts/ — code files only: .js .mjs .cjs .ts .tsx .jsx, excluding tests and fixtures) must also
 * change a test file. Diffs HEAD against the merge-base with origin/main.
 *
 * "Test file" patterns are read from vitest.config.ts `include` (single
 * source of truth), never duplicated here.
 *
 * Escape hatch: a line `no-test: <reason>` in any branch commit message.
 * The reason is echoed so a reviewer sees it.
 *
 * Fixture mode (proof-of-firing): FIXTURE_FILE=<json> with
 * `{ "changedFiles": [...], "commitMessages": [...] }` replaces git.
 *
 * Exit codes: 0 pass/skip · 1 source changed with no test.
 *
 * @module check-tests-with-code
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIRS = ['src/', 'scripts/'];
const CODE_EXT = /\.(js|mjs|cjs|ts|tsx|jsx)$/;
const MAX_LISTED = 10;

function expandBraces(glob) {
  const m = glob.match(/\{([^{}]*)\}/);
  if (!m) return [glob];
  return m[1].split(',').flatMap((alt) => expandBraces(glob.replace(m[0], alt)));
}

/** Convert a glob (supports **, *, {a,b}) to an anchored RegExp. */
export function globToRegExp(glob) {
  const alts = expandBraces(glob).map((g) =>
    g
      .replace(/[.+^$()|[\]\\]/g, '\\$&')
      .replace(/\*\*\//g, '\u0000')
      .replace(/\*\*/g, '\u0001')
      .replace(/\*/g, '[^/]*')
      .replace(/\u0000/g, '(?:.*/)?')
      .replace(/\u0001/g, '.*'),
  );
  return new RegExp(`^(?:${alts.join('|')})$`);
}

/** Read the `include: [...]` globs from vitest.config.ts. */
export function loadTestPatterns(configPath = resolve(ROOT, 'vitest.config.ts')) {
  // Strip whole-line comments first: hds's include array carries comments that quote globs.
  const text = readFileSync(configPath, 'utf8').replace(/^\s*\/\/.*$/gm, '');
  const m = text.match(/include:\s*\[([\s\S]*?)\]/);
  if (!m) throw new Error(`check-tests-with-code: no test.include found in ${configPath}`);
  return [...m[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((x) => globToRegExp(x[1] ?? x[2]));
}

export const isTestFile = (file, patterns) => patterns.some((re) => re.test(file));

export function isSourceFile(file, patterns) {
  if (!SOURCE_DIRS.some((d) => file.startsWith(d))) return false;
  if (!CODE_EXT.test(file)) return false;
  if (/(^|\/)(fixtures?|__tests__|__fixtures__|docs)\//.test(file)) return false;
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(file)) return false;
  return !isTestFile(file, patterns);
}

export function evaluate(changedFiles, commitMessages, patterns) {
  const reasons = commitMessages
    .flatMap((m) => m.split('\n'))
    .map((l) => l.match(/^\s*no-test:\s*(\S.*)$/i)?.[1].trim())
    .filter(Boolean);
  const sources = changedFiles.filter((f) => isSourceFile(f, patterns));
  const hasTest = changedFiles.some((f) => isTestFile(f, patterns));
  if (sources.length === 0)
    return { ok: true, lines: ['check-tests-with-code: no source changes'] };
  if (hasTest)
    return { ok: true, lines: ['check-tests-with-code: source changes ship with a test'] };
  if (reasons.length) {
    return { ok: true, lines: [`check-tests-with-code: no-test accepted: ${reasons.join(' | ')}`] };
  }
  const listed = sources.slice(0, MAX_LISTED);
  const more = sources.length - listed.length;
  return {
    ok: false,
    lines: [
      `check-tests-with-code: ${sources.length} source file(s) changed, no test changed: ${listed.join(', ')}${more > 0 ? ` (+${more} more)` : ''} — add/adjust a test, or add a commit line "no-test: <reason>"`,
    ],
  };
}

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

function main() {
  const patterns = loadTestPatterns();
  let changed;
  let messages;
  if (
    process.env.FIXTURE_FILE &&
    (process.argv.includes('--fixture-mode') || process.env.HDS_FIXTURE_MODE === '1')
  ) {
    const fx = JSON.parse(readFileSync(process.env.FIXTURE_FILE, 'utf8'));
    changed = fx.changedFiles ?? [];
    messages = fx.commitMessages ?? [];
  } else {
    let base;
    try {
      base = git('merge-base', 'HEAD', 'origin/main').trim();
    } catch {
      console.log('check-tests-with-code: skipped (no merge-base with origin/main)');
      return 0;
    }
    changed = git('diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`)
      .split('\n')
      .filter(Boolean);
    messages = git('log', '--format=%B%x00', `${base}..HEAD`)
      .split('\0')
      .filter((m) => m.trim());
  }
  const { ok, lines } = evaluate(changed, messages, patterns);
  (ok ? console.log : console.error)(lines.join('\n'));
  return ok ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
