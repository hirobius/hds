#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/check-state-surfaces.mjs
 *
 * Gate for the state-surface registry (hds#612, spec hirobius/ops#576).
 * `docs/state-surfaces.json` lists every file or section that describes
 * project state, and what keeps it true:
 *
 *   generated  built by a generator (`by`); a `--check` for it already runs
 *              elsewhere (pretest), named in `check` for reference
 *   checked    prose or data a named gate (`by`) compares to the code
 *   editorial  hand-written; carries `owner`, `reviewedAt` (YYYY-MM-DD) and
 *              `maxAgeDays`, and goes "review due" when it ages out
 *
 * Rules (violation `rule`):
 *   REGISTRY_MISSING / REGISTRY_INVALID  the registry is absent or malformed
 *   SURFACE_MISSING    a registered path does not exist
 *   BY_MISSING         `by` looks like a repo path and does not exist
 *   GENERATED_STALE    --run-checks only: a declared `check` command failed
 *   REVIEW_DUE         an editorial surface is older than its maxAgeDays
 *   DERIVED_FACT       an `alwaysOn` file (CLAUDE.md and anything it makes
 *                      mandatory reading) states a version, a count, a list of
 *                      issue/PR numbers or an "as of <date>" state
 *   DEAD_REFERENCE     markdown that is not generated (registered editorial or
 *                      checked files, markdown inside registered directories,
 *                      and README/CLAUDE/CONTRIBUTING/AGENTS) names a repo path
 *                      (backticked, or a link target) that does not exist.
 *                      Fenced code blocks are skipped.
 *
 * Vendorable: it reads nothing hds-specific. Copy this file and
 * scripts/lib/gate-output.mjs into another repo, add docs/state-surfaces.json,
 * and run it. A referenced path that .gitignore covers counts as present (build
 * output). Optional registry keys: `ignoreReferences` (path prefixes to skip
 * outright), `alwaysOn` (files checked for derived facts) and
 * `alsoScan` (markdown files scanned even when unregistered; default README, CLAUDE, CONTRIBUTING,
 * AGENTS).
 *
 * Usage:
 *   node scripts/check-state-surfaces.mjs [--root <dir>] [--registry <path>]
 *        [--today YYYY-MM-DD] [--run-checks] [--json]
 *   FIXTURE_DIR=<dir> ... --fixture-mode   (validate-fixture-proof-of-firing)
 *
 * Exit: 0 clean, 1 violations.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasJsonFlag, emitResult } from './lib/gate-output.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = join(HERE, '..');
const DEFAULT_REGISTRY = 'docs/state-surfaces.json';
const DEFAULT_ALSO_SCAN = ['README.md', 'CLAUDE.md', 'CONTRIBUTING.md', 'AGENTS.md'];
const KINDS = ['generated', 'checked', 'editorial'];
const PATH_EXT = /\.(md|mdx|json|mjs|cjs|js|ts|tsx|jsx|css|ya?ml|txt|html|sh|svg)$/i;
const DAY_MS = 86_400_000;

const isDay = (text) =>
  typeof text === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(text) &&
  !Number.isNaN(Date.parse(text)) &&
  new Date(text).toISOString().startsWith(text);

const today = () => new Date().toISOString().slice(0, 10);

/** Every markdown file under `dir` (repo-relative paths), skipping dot dirs and node_modules. */
function markdownIn(root, dir) {
  const out = [];
  const walk = (abs) => {
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const full = join(abs, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.mdx?$/i.test(e.name)) out.push(relative(root, full));
    }
  };
  walk(join(root, dir));
  return out;
}

/**
 * Repo-path candidates in one markdown file: backticked spans and link targets,
 * outside fenced code. `kind` is 'link' (any relative target) or 'code'
 * (needs a slash plus a known extension, or a trailing slash).
 */
export function extractReferences(text) {
  const refs = [];
  let fence = null;
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const marker = line.match(/^\s*(```+|~~~+)/);
    if (marker) {
      if (fence === null) fence = marker[1][0];
      else if (marker[1][0] === fence) fence = null;
      return;
    }
    if (fence !== null) return;
    for (const m of line.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      refs.push({ raw: m[1], kind: 'link', line: i + 1 });
    }
    for (const m of line.matchAll(/`([^`\n]+)`/g)) {
      refs.push({ raw: m[1], kind: 'code', line: i + 1 });
    }
  });
  return refs;
}

/** The path a reference names, or null when it is not a repo path. */
function pathOf({ raw, kind }) {
  let p = raw.trim();
  if (!p || p.startsWith('#')) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(p) || p.includes('://')) return null; // url, mailto
  if (p.startsWith('/') || p.startsWith('~') || p.startsWith('@')) return null;
  p = p.replace(/[#?].*$/, '').replace(/:\d+(-\d+)?$/, '');
  if (!p) return null;
  if (/[*{}<>$|()[\]=,;\s'"\\!]/.test(p)) return null; // glob, placeholder, command
  if (kind === 'code') {
    const dir = p.endsWith('/');
    if (!p.includes('/')) return null;
    if (!dir && !PATH_EXT.test(p)) return null;
    if (dir && p.split('/').filter(Boolean).length < 2) return null;
  }
  return p;
}

const COUNT_NOUNS =
  'components?|tokens?|gates?|apps?|tests?|files?|units?|patterns?|pods?|scripts?|checks?|validators?|ADRs?|workflows?|skills?|issues?|PRs?|releases?';
/** "more than 50 files" sets a rule's limit; it is not a fact about the repo. */
const THRESHOLD =
  /(?:more than|over|under|at most|at least|fewer than|up to|max(?:imum)?|limit of|above|below)\s+$/i;
const ISSUE_REF = /(?:[\w-]+\/)?[\w-]*#\d+/g;

/**
 * Derived facts on one line of an always-on file: things a generator or ops can
 * state live, so a hand-kept copy only goes stale. Returns [{ kind, text }].
 */
export function derivedFacts(line) {
  const out = [];
  for (const m of line.matchAll(/(?<![\w.])v?\d+\.\d+\.\d+(?![\w.]*\/)(?![\d])/g)) {
    out.push({ kind: 'version', text: m[0] });
  }
  for (const m of line.matchAll(
    new RegExp(`(?<![\\w.#-])\\d[\\d,]*\\+?\\s+(?:${COUNT_NOUNS})\\b`, 'gi'),
  )) {
    if (!THRESHOLD.test(line.slice(0, m.index))) out.push({ kind: 'count', text: m[0] });
  }
  const issues = line.match(ISSUE_REF) ?? [];
  if (issues.length >= 2) out.push({ kind: 'issue list', text: issues.join(', ') });
  const dated = line.match(
    /\b(?:as of|last updated|updated|current as of|status as of)\b[^.\n]{0,20}\d{4}-\d{2}-\d{2}/i,
  );
  if (dated) out.push({ kind: 'dated state', text: dated[0] });
  return out;
}

/** Which of `paths` the repo's .gitignore covers (none outside a git repo). */
function gitIgnored(root, paths) {
  if (paths.length === 0) return new Set();
  const res = spawnSync('git', ['check-ignore', '--stdin'], {
    cwd: root,
    input: paths.join('\n'),
    encoding: 'utf8',
  });
  return new Set(res.status === 0 ? res.stdout.split('\n').filter(Boolean) : []);
}

function resolves(root, fromFile, p) {
  const clean = p.replace(/\/$/, '');
  return existsSync(resolve(root, dirname(fromFile), clean)) || existsSync(resolve(root, clean));
}

/**
 * Check the registry under `root`.
 * @param {{ root?: string, registry?: string, today?: string, runChecks?: boolean }} [opts]
 * @returns {{ violations: object[], summary: object, ok: boolean }}
 */
export function checkStateSurfaces({
  root = DEFAULT_ROOT,
  registry = DEFAULT_REGISTRY,
  today: now = today(),
  runChecks = false,
} = {}) {
  const violations = [];
  const add = (file, rule, message, line = null) =>
    violations.push({ file, line, rule, severity: 'error', message });
  const regPath = join(root, registry);
  const summary = { byKind: {}, scanned: 0 };
  const done = () => ({ violations, summary, ok: violations.length === 0 });

  if (!existsSync(regPath)) {
    add(
      registry,
      'REGISTRY_MISSING',
      `${registry} does not exist; it lists every file that describes state.`,
    );
    return done();
  }
  let reg;
  try {
    reg = JSON.parse(readFileSync(regPath, 'utf8'));
  } catch (error) {
    add(registry, 'REGISTRY_INVALID', `${registry} is not JSON (${error.message}).`);
    return done();
  }
  if (!Array.isArray(reg.surfaces)) {
    add(registry, 'REGISTRY_INVALID', `${registry} needs a "surfaces" array.`);
    return done();
  }

  const ignore = reg.ignoreReferences ?? [];
  const scan = new Set(reg.alsoScan ?? DEFAULT_ALSO_SCAN);
  const seen = new Set();
  const nowMs = Date.parse(now);

  for (const s of reg.surfaces) {
    const label = s?.path ?? '(no path)';
    const bad = (why) => add(registry, 'REGISTRY_INVALID', `${label}: ${why}`);
    if (typeof s?.path !== 'string' || !s.path) {
      bad('every surface needs a path');
      continue;
    }
    if (!s.describes) bad('needs "describes" (what state it holds)');
    if (!KINDS.includes(s.kind)) {
      bad(`kind must be one of ${KINDS.join(', ')}, not ${JSON.stringify(s.kind)}`);
      continue;
    }
    const key = `${s.path}#${s.section ?? ''}`;
    if (seen.has(key)) bad('registered twice (give each section its own "section")');
    seen.add(key);
    summary.byKind[s.kind] = (summary.byKind[s.kind] ?? 0) + 1;

    if (s.kind !== 'editorial' && !s.by) {
      bad(
        `a ${s.kind} surface must name its ${s.kind === 'generated' ? 'generator' : 'check'} in "by"`,
      );
    }
    if (s.kind === 'editorial') {
      if (!s.owner) bad('an editorial surface needs an "owner"');
      if (!isDay(s.reviewedAt))
        bad(
          `"reviewedAt" must be a calendar day (YYYY-MM-DD), not ${JSON.stringify(s.reviewedAt)}`,
        );
      if (!Number.isInteger(s.maxAgeDays) || s.maxAgeDays < 1)
        bad('"maxAgeDays" must be a positive integer');
    }

    if (!existsSync(join(root, s.path))) {
      add(
        s.path,
        'SURFACE_MISSING',
        `${s.path} is registered in ${registry} but does not exist; update or remove the entry.`,
      );
      continue;
    }
    if (
      typeof s.by === 'string' &&
      /^[\w.-]+\/[\w./-]+\.\w+$/.test(s.by) &&
      !existsSync(join(root, s.by))
    ) {
      add(s.path, 'BY_MISSING', `${s.path}: "by" names ${s.by}, which does not exist.`);
    }
    if (s.kind === 'editorial' && isDay(s.reviewedAt) && Number.isInteger(s.maxAgeDays)) {
      const age = Math.floor((nowMs - Date.parse(s.reviewedAt)) / DAY_MS);
      if (age > s.maxAgeDays) {
        add(
          s.path,
          'REVIEW_DUE',
          `${s.path} review due: last reviewed ${s.reviewedAt} (${age} days ago, max ${s.maxAgeDays}); ${s.owner ?? 'its owner'} re-reads it and bumps reviewedAt in ${registry}.`,
        );
      }
    }
    if (runChecks && s.check) {
      const res = spawnSync(s.check, { cwd: root, shell: true, encoding: 'utf8' });
      if (res.status !== 0) {
        add(
          s.path,
          'GENERATED_STALE',
          `${s.path}: \`${s.check}\` failed (exit ${res.status}); regenerate it with ${s.by ?? 'its generator'}.`,
        );
      }
    }
  }

  // Markdown to scan: everything registered that a person writes or a gate
  // checks (generated text belongs to its generator), plus the front-door files.
  const files = new Set();
  for (const f of scan) if (existsSync(join(root, f))) files.add(f);
  for (const s of reg.surfaces) {
    if (!s?.path || s.kind === 'generated' || !existsSync(join(root, s.path))) continue;
    if (statSync(join(root, s.path)).isDirectory())
      markdownIn(root, s.path).forEach((f) => files.add(f));
    else if (/\.mdx?$/i.test(s.path)) files.add(s.path);
  }
  // Always-on files (every session reads them first) hold rules, read order and
  // pointers only: a version, count, issue list or dated state is derived, so it
  // is stated live elsewhere and goes stale here.
  for (const file of reg.alwaysOn ?? []) {
    if (!existsSync(join(root, file))) {
      add(
        file,
        'SURFACE_MISSING',
        `${file} is listed in alwaysOn in ${registry} but does not exist.`,
      );
      continue;
    }
    let fenced = null;
    readFileSync(join(root, file), 'utf8')
      .split('\n')
      .forEach((line, i) => {
        const marker = line.match(/^\s*(```+|~~~+)/);
        if (marker) {
          fenced = fenced === null ? marker[1][0] : fenced === marker[1][0] ? null : fenced;
          return;
        }
        if (fenced !== null) return;
        for (const f of derivedFacts(line)) {
          add(
            file,
            'DERIVED_FACT',
            `${file} states a ${f.kind} ("${f.text}"), which is derived: always-on files hold rules, read order and pointers only. Point to where it is stated live.`,
            i + 1,
          );
        }
      });
  }

  const dead = [];
  for (const file of [...files].sort()) {
    summary.scanned++;
    const text = readFileSync(join(root, file), 'utf8');
    for (const ref of extractReferences(text)) {
      const p = pathOf(ref);
      if (!p || ignore.some((prefix) => p.startsWith(prefix))) continue;
      if (!resolves(root, file, p)) dead.push({ file, p, line: ref.line });
    }
  }
  // A path the repo gitignores is build output: absent from a clean checkout, not dead.
  const ignored = gitIgnored(root, [...new Set(dead.map((d) => d.p))]);
  for (const { file, p, line } of dead) {
    if (ignored.has(p)) continue;
    add(
      file,
      'DEAD_REFERENCE',
      `${file} references ${p}, which does not exist; fix or remove the reference.`,
      line,
    );
  }
  return done();
}

function argValue(argv, flag) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

function main() {
  const argv = process.argv.slice(2);
  const json = hasJsonFlag(argv);
  const root = resolve(process.env.FIXTURE_DIR ?? argValue(argv, '--root') ?? DEFAULT_ROOT);
  const result = checkStateSurfaces({
    root,
    registry: argValue(argv, '--registry') ?? DEFAULT_REGISTRY,
    today: argValue(argv, '--today') ?? process.env.STATE_SURFACES_TODAY ?? today(),
    runChecks: argv.includes('--run-checks'),
  });
  if (!json) {
    if (result.ok) {
      const kinds = Object.entries(result.summary.byKind)
        .map(([k, n]) => `${n} ${k}`)
        .join(', ');
      console.log(
        `✓ check-state-surfaces (${kinds}; ${result.summary.scanned} markdown file(s) scanned)`,
      );
    } else {
      for (const v of result.violations)
        console.error(`${v.file}:${v.line ?? '-'} ${v.rule} ${v.message}`);
      console.error(`✗ check-state-surfaces: ${result.violations.length} violation(s)`);
    }
  }
  emitResult(result, json);
  process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
