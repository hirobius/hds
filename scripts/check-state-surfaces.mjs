#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/check-state-surfaces.mjs
 *
 * Gate for the state-surface registry (hds#612, spec hirobius/ops#576).
 * `docs/state-surfaces.json` lists every file or section that describes
 * project state, and what keeps it true:
 *
 *   generated  built by a generator (`by`). It names a `check` command that
 *              proves the file is fresh (`node <script> [--check]`; the gate
 *              verifies the script exists and, when the command passes
 *              `--check`, that its source handles it), or says
 *              `"freshness": "unchecked"` so the index does not pretend
 *   checked    prose or data a named gate (`by`) compares to the code
 *   editorial  hand-written; carries `owner`, `reviewedAt` (YYYY-MM-DD, not in
 *              the future) and `maxAgeDays`, and goes "review due" when it
 *              ages out
 *
 * Rules (violation `rule`):
 *   REGISTRY_MISSING / REGISTRY_INVALID  the registry is absent or malformed
 *                      (including a generated surface with no verifiable
 *                      check and no `unchecked`, and a reviewedAt in the future)
 *   SURFACE_MISSING    a registered path does not exist
 *   BY_MISSING         `by` looks like a repo path and does not exist
 *   GENERATED_STALE    --run-checks only: a declared `check` command failed
 *   REVIEW_DUE         an editorial surface is older than its maxAgeDays. A
 *                      warning (exit 0) by default, because a calendar date
 *                      is not a code change and must not break unrelated
 *                      work; an error under --strict-review, for a scheduled run
 *   UNREGISTERED_DOC   (registry `registerAll`, off by default) a markdown file
 *                      directly in a listed directory is covered by no entry
 *   DERIVED_FACT       an `alwaysOn` file (CLAUDE.md and anything it makes
 *                      mandatory reading) states a version, a count, a list of
 *                      issue/PR numbers or an "as of <date>" state
 *   DEAD_REFERENCE     markdown that is not generated (registered editorial or
 *                      checked files, markdown inside registered directories,
 *                      and README/CLAUDE/CONTRIBUTING/AGENTS) names a repo path
 *                      (backticked, or a link target) that does not exist.
 *                      Fenced code blocks and HTML comments are skipped. A
 *                      link resolves against its own file's directory (or the
 *                      repo root when it starts with "/"); a backticked path
 *                      also tries the repo root. `path §n` names `path`.
 *
 * Vendorable: it reads nothing hds-specific. Copy this file and
 * scripts/lib/gate-output.mjs into another repo, add docs/state-surfaces.json,
 * and run it. A referenced path that .gitignore covers counts as present (build
 * output). Optional registry keys: `ignoreReferences` (path prefixes to skip
 * outright), `alwaysOn` (files checked for derived facts) and
 * `alsoScan` (markdown files scanned even when unregistered; default README, CLAUDE, CONTRIBUTING,
 * AGENTS) and `registerAll` (directories whose markdown must all be registered).
 *
 * Usage:
 *   node scripts/check-state-surfaces.mjs [--root <dir>] [--registry <path>]
 *        [--today YYYY-MM-DD] [--run-checks] [--strict-review] [--json]
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
 * The prose of a markdown file, line for line: fenced code and HTML comments
 * are blanked (so line numbers still match the file). A fence closes only on a
 * fence of the same character at least as long as the one that opened it, so a
 * ```` block can hold a ``` block.
 * @param {string} text
 * @returns {string[]}
 */
export function proseLines(text) {
  let fence = null;
  let inComment = false;
  return text.split('\n').map((line) => {
    const m = line.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
    if (fence !== null) {
      if (m && m[1][0] === fence.ch && m[1].length >= fence.len && m[2].trim() === '') fence = null;
      return '';
    }
    if (m && !inComment) {
      fence = { ch: m[1][0], len: m[1].length };
      return '';
    }
    let out = '';
    let rest = line;
    while (rest.length > 0) {
      if (inComment) {
        const end = rest.indexOf('-->');
        if (end < 0) return out;
        rest = rest.slice(end + 3);
        inComment = false;
      } else {
        const start = rest.indexOf('<!--');
        if (start < 0) return out + rest;
        out += rest.slice(0, start);
        rest = rest.slice(start + 4);
        inComment = true;
      }
    }
    return out;
  });
}

/** "real/file.md §3" names real/file.md: a section pointer is not part of the path. */
const SECTION_TAIL = /\s+§\s*[\w.]+$/;

/**
 * Repo-path candidates in one markdown file: backticked spans, link targets and
 * `path §n` in prose, outside fenced code and HTML comments. `kind` is 'link'
 * (a relative target, or a root-absolute one) or 'code' (needs a slash plus a
 * known extension, or a trailing slash).
 */
export function extractReferences(text) {
  const refs = [];
  proseLines(text).forEach((line, i) => {
    for (const m of line.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      refs.push({ raw: m[1], kind: 'link', line: i + 1 });
    }
    for (const m of line.matchAll(/`([^`\n]+)`/g)) {
      refs.push({ raw: m[1].replace(SECTION_TAIL, ''), kind: 'code', line: i + 1 });
    }
    const bare = line.replace(/`[^`\n]*`/g, ' ').replace(/\]\([^)]*\)/g, ' ');
    for (const m of bare.matchAll(/(?<![\w./~@:#-])([\w-]+(?:\/[\w.-]+)+\.\w+)\s+§/g)) {
      refs.push({ raw: m[1], kind: 'code', line: i + 1 });
    }
  });
  return refs;
}

/**
 * The path a reference names, or null when it is not a repo path.
 * `fromRoot` marks a root-absolute link ("/docs/x.md"), which `p` keeps the
 * leading slash of for the message.
 * @returns {{ p: string, fromRoot: boolean } | null}
 */
function pathOf({ raw, kind }) {
  let p = raw.trim();
  if (!p || p.startsWith('#')) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(p) || p.includes('://')) return null; // url, mailto
  if (p.startsWith('//') || p.startsWith('~') || p.startsWith('@')) return null;
  const fromRoot = p.startsWith('/');
  if (fromRoot && kind !== 'link') return null;
  p = p.replace(/[#?].*$/, '').replace(/:\d+(-\d+)?$/, '');
  if (!p || p === '/') return null;
  if (/[*{}<>$|()[\]=,;\s'"\\!]/.test(p)) return null; // glob, placeholder, command
  if (kind === 'code' || fromRoot) {
    // A route like /ops/standing is not a file: root-absolute links need an extension too.
    const dir = p.endsWith('/');
    if (!fromRoot && !p.includes('/')) return null;
    if (!dir && !PATH_EXT.test(p)) return null;
    if (dir && p.split('/').filter(Boolean).length < (fromRoot ? 1 : 2)) return null;
  }
  return { p, fromRoot };
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
  // A pair like "(ops#292; hds#612)" is provenance, not a list of open work.
  const issues = line.match(ISSUE_REF) ?? [];
  if (issues.length >= 3) out.push({ kind: 'issue list', text: issues.join(', ') });
  const dated = line.match(
    /\b(?:as of|last updated|updated|current as of|status as of)\b[^.\n]{0,20}\d{4}-\d{2}-\d{2}/i,
  );
  if (dated) out.push({ kind: 'dated state', text: dated[0] });
  return out;
}

/**
 * True when a script's source imports runGenerator from the shared generator
 * runner (scripts/lib/generated-check.mjs) and calls it. The runner reads
 * --check itself, so such a script handles the flag without naming it (hds#644).
 * @param {string} source
 */
export function usesGeneratorRunner(source) {
  return (
    /import\s*\{[^}]*\brunGenerator\b[^}]*\}\s*from\s*['"][^'"]*\/generated-check\.mjs['"]/.test(
      source,
    ) && /\brunGenerator\(/.test(source)
  );
}

/**
 * What is wrong with a generated surface's `check` command, or null. The gate
 * cannot run every check (that is pretest's job), so it verifies statically
 * that the command is real: a node script that exists and, when the command
 * passes --check, one whose source handles that flag (or hands it to
 * runGenerator, which does).
 */
function checkProblem(root, check) {
  const m = /^node\s+(\S+)((?:\s+\S+)*)\s*$/.exec(String(check).trim());
  if (!m) {
    return `"check" must be a \`node <script> [args]\` command the gate can verify, not ${JSON.stringify(check)}`;
  }
  const [, script, rest] = m;
  if (!existsSync(join(root, script))) {
    return `"check" runs ${script}, which does not exist`;
  }
  const source = readFileSync(join(root, script), 'utf8');
  if (
    rest.split(/\s+/).includes('--check') &&
    !/['"`]--check['"`]/.test(source) &&
    !usesGeneratorRunner(source)
  ) {
    return `"check" passes --check to ${script}, whose source does not handle --check (a generator with no --check proves nothing; add one, or name a real checker)`;
  }
  return null;
}

/**
 * Which of `paths` (repo-root-relative) the repo's .gitignore covers (none
 * outside a git repo). A path git rejects (beyond a symlink, outside the repo)
 * aborts a batch, so a failed batch falls back to asking about each path alone.
 */
function gitIgnored(root, paths) {
  const inside = paths.filter((p) => p && !p.startsWith('..'));
  if (inside.length === 0) return new Set();
  const ask = (input) =>
    spawnSync('git', ['check-ignore', '--stdin'], { cwd: root, input, encoding: 'utf8' });
  const batch = ask(inside.join('\n'));
  if (batch.status === 0) return new Set(batch.stdout.split('\n').filter(Boolean));
  if (batch.status === 1) return new Set(); // asked, none ignored
  const out = new Set();
  for (const p of inside) {
    const one = ask(p);
    if (one.status === 0) for (const hit of one.stdout.split('\n').filter(Boolean)) out.add(hit);
  }
  return out;
}

/**
 * Repo-root-relative candidates a reference may name, nearest first. A directory
 * keeps its trailing slash: `.gitignore` patterns like `out/` match only with it.
 */
function candidates(file, { kind }, { p, fromRoot }) {
  const slash = p.endsWith('/') ? '/' : '';
  const clean = p.replace(/\/$/, '').replace(/^\//, '');
  if (fromRoot) return [clean + slash];
  const near = join(dirname(file), clean) + slash;
  return kind === 'link' ? [near] : [near, clean + slash];
}

function resolves(root, list) {
  return list.some((c) => existsSync(resolve(root, c)));
}

/**
 * Check the registry under `root`.
 * @param {{ root?: string, registry?: string, today?: string, runChecks?: boolean, strictReview?: boolean }} [opts]
 * @returns {{ violations: object[], summary: object, ok: boolean }}
 */
export function checkStateSurfaces({
  root = DEFAULT_ROOT,
  registry = DEFAULT_REGISTRY,
  today: now = today(),
  runChecks = false,
  strictReview = false,
} = {}) {
  const violations = [];
  const add = (file, rule, message, line = null, severity = 'error') =>
    violations.push({ file, line, rule, severity, message });
  const regPath = join(root, registry);
  const summary = { byKind: {}, scanned: 0 };
  const done = () => ({
    violations,
    summary,
    ok: !violations.some((v) => v.severity === 'error'),
  });

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
    if (s.kind === 'generated') {
      if (s.freshness !== undefined && s.freshness !== 'unchecked') {
        bad(`"freshness" can only be "unchecked", not ${JSON.stringify(s.freshness)}`);
      } else if (s.freshness === 'unchecked') {
        summary.unchecked = (summary.unchecked ?? 0) + 1;
        if (s.check) bad('"freshness": "unchecked" contradicts the "check" it also names');
      } else if (!s.check) {
        bad(
          'a generated surface must name a "check" command that proves it fresh, or say "freshness": "unchecked"',
        );
      }
    }
    if (s.check) {
      const problem = checkProblem(root, s.check);
      if (problem) bad(problem);
    }
    if (s.kind === 'editorial') {
      if (!s.owner) bad('an editorial surface needs an "owner"');
      if (!isDay(s.reviewedAt))
        bad(
          `"reviewedAt" must be a calendar day (YYYY-MM-DD), not ${JSON.stringify(s.reviewedAt)}`,
        );
      else if (Date.parse(s.reviewedAt) > nowMs)
        bad(`"reviewedAt" ${s.reviewedAt} is in the future (today is ${now})`);
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
          null,
          strictReview ? 'error' : 'warn',
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

  // Opt-in: every markdown file directly in a registerAll directory is classified.
  const paths = reg.surfaces.map((x) => x?.path).filter((x) => typeof x === 'string');
  for (const dir of reg.registerAll ?? []) {
    if (!existsSync(join(root, dir))) continue;
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      if (!e.isFile() || !/\.mdx?$/i.test(e.name)) continue;
      const rel = `${dir.replace(/\/$/, '')}/${e.name}`;
      if (!paths.some((x) => x === rel || rel.startsWith(`${x.replace(/\/$/, '')}/`))) {
        add(
          rel,
          'UNREGISTERED_DOC',
          `${rel} is in no ${registry} entry; register it as generated, checked or editorial (or git mv it to ${dir}/archive/ if it is history).`,
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
    proseLines(readFileSync(join(root, file), 'utf8')).forEach((line, i) => {
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
      const named = pathOf(ref);
      if (!named) continue;
      const bare = named.fromRoot ? named.p.slice(1) : named.p;
      if (ignore.some((prefix) => bare.startsWith(prefix))) continue;
      const where = candidates(file, ref, named);
      if (!resolves(root, where)) dead.push({ file, p: named.p, line: ref.line, where });
    }
  }
  // A path the repo gitignores is build output: absent from a clean checkout, not dead.
  const ignored = gitIgnored(root, [...new Set(dead.flatMap((d) => d.where))]);
  for (const { file, p, line, where } of dead) {
    if (where.some((w) => ignored.has(w))) continue;
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
    strictReview:
      argv.includes('--strict-review') || process.env.STATE_SURFACES_STRICT_REVIEW === '1',
  });
  if (!json) {
    const errors = result.violations.filter((v) => v.severity === 'error');
    for (const v of result.violations)
      console.error(
        `${v.file}:${v.line ?? '-'} ${v.severity === 'error' ? v.rule : `warn ${v.rule}`} ${v.message}`,
      );
    if (result.ok) {
      const kinds = Object.entries(result.summary.byKind)
        .map(([k, n]) => `${n} ${k}`)
        .join(', ');
      const unchecked = result.summary.unchecked
        ? `, ${result.summary.unchecked} not freshness-checked`
        : '';
      const warned = result.violations.length ? `, ${result.violations.length} warning(s)` : '';
      console.log(
        `✓ check-state-surfaces (${kinds}${unchecked}; ${result.summary.scanned} markdown file(s) scanned${warned})`,
      );
    } else {
      console.error(`✗ check-state-surfaces: ${errors.length} violation(s)`);
    }
  }
  emitResult(result, json);
  process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
