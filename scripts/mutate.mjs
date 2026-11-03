#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * mutate.mjs — `pnpm test:mutate`: diff-scoped mutation testing with
 * StrykerJS (hds#1089). Report-only: it never fails a build on score.
 *
 * Coverage says a line ran. Mutation testing says whether a test would fail
 * if that line were wrong: Stryker rewrites (mutates) the code one change at
 * a time and runs the tests that cover it. A mutant the tests kill was
 * noticed; a mutant that survives is a hole in the tests, named in the
 * report. See docs/mutation-testing.md for how reviewers read the report.
 *
 * Runs are scoped to a file set, never the whole repo:
 *
 *   pnpm test:mutate -- codemods/lib/semver.mjs   # these files
 *   pnpm test:mutate -- --diff                    # files this branch changed
 *   pnpm test:mutate -- --diff --base origin/main # (the default base)
 *   pnpm test:mutate                              # same as --diff
 *
 * The report lands in reports/mutation/ (index.html + mutation.json,
 * gitignored). Stryker v10 needs Node 22+; the repo's own engines floor is
 * lower because this is a dev-only tool, nothing here ships.
 *
 * One run at a time on a shared machine: a mutation run is a test suite run
 * many times over, so never run it alongside ralph/gate.sh or another full
 * suite.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPORT_JSON = path.join(ROOT, 'reports', 'mutation', 'mutation.json');
export const DEFAULT_BASE = 'origin/main';

const MUTATABLE = /\.(?:ts|js|mjs|jsx)$/;

/**
 * Whether a repo-relative path is worth mutating. Pure logic only: tests are
 * the judge, not the subject; .tsx is UI (slow, low signal per mutant, out of
 * scope for #1089); generated and built output proves nothing.
 */
export function isMutatable(file) {
  const f = file.split(path.sep).join('/');
  if (!MUTATABLE.test(f)) return false;
  if (f.endsWith('.tsx') || f.endsWith('.d.ts')) return false;
  if (/(?:^|\/)(?:node_modules|dist|docs-site|coverage|\.stryker-tmp)\//.test(f)) return false;
  if (/(?:^|\/)__tests__\//.test(f) || /(?:^|\/)__fixtures__\//.test(f)) return false;
  if (/\.(?:test|spec)\.[a-z]+$/.test(f)) return false;
  return true;
}

/** Parse the wrapper's arguments. Anything unrecognised is a file name. */
export function parseArgs(argv) {
  const parsed = { files: [], diff: false, base: DEFAULT_BASE, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--diff') parsed.diff = true;
    else if (arg === '--base') {
      i += 1;
      if (argv[i]) parsed.base = argv[i];
    } else if (arg.startsWith('--base=')) parsed.base = arg.slice('--base='.length);
    else if (arg === '--help' || arg === '-h') parsed.help = true;
    else if (arg !== '--') parsed.files.push(arg);
  }
  // Explicit files win; with none, the run is the diff.
  if (parsed.files.length === 0) parsed.diff = true;
  return parsed;
}

function gitLines(args, exec) {
  const out = exec('git', args, { cwd: ROOT, encoding: 'utf8' });
  if (out && out.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${String(out.stderr || '').trim()}`);
  }
  return String(out?.stdout || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * The files a branch changes: committed diff against the base, plus staged,
 * unstaged and untracked work, so a run before committing still scopes to
 * what is actually changing. `exec` is injectable for tests.
 */
export function diffFiles(base = DEFAULT_BASE, exec = spawnSync) {
  const found = new Set();
  for (const line of gitLines(
    ['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`],
    exec,
  ))
    found.add(line);
  for (const line of gitLines(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'], exec))
    found.add(line);
  for (const line of gitLines(['ls-files', '--others', '--exclude-standard'], exec))
    found.add(line);
  return [...found].filter(isMutatable).sort();
}

/** The Stryker CLI arguments for a resolved file set. */
export function buildStrykerArgs(files) {
  return ['run', '--mutate', files.join(',')];
}

const DETECTED = new Set(['Killed', 'Timeout']);
const UNDETECTED = new Set(['Survived', 'NoCoverage']);

/**
 * The headline numbers from a mutation-testing-elements report (the JSON
 * Stryker's json reporter writes): score over mutants the tests could in
 * principle detect, and the survivors a reviewer should read.
 */
export function summarizeReport(report) {
  const survivors = [];
  let detected = 0;
  let undetected = 0;
  for (const [file, data] of Object.entries(report.files || {})) {
    for (const mutant of data.mutants || []) {
      if (DETECTED.has(mutant.status)) detected += 1;
      else if (UNDETECTED.has(mutant.status)) {
        undetected += 1;
        if (mutant.status === 'Survived') {
          survivors.push({
            file,
            line: mutant.location?.start?.line ?? '?',
            mutator: mutant.mutatorName,
            replacement: mutant.replacement,
          });
        }
      }
    }
  }
  const total = detected + undetected;
  return {
    detected,
    undetected,
    total,
    score: total === 0 ? null : Math.round((detected / total) * 1000) / 10,
    survivors,
  };
}

/** The terminal summary: score first, then every surviving mutant. */
export function formatSummary(summary) {
  const lines = [
    `Mutation score (diff scope): ${summary.score === null ? 'n/a (no mutants)' : `${summary.score}%`} ` +
      `— ${summary.detected} killed/timed out, ${summary.undetected} not detected, ${summary.total} mutants.`,
    'Report: reports/mutation/index.html (detail) + reports/mutation/mutation.json (machine-readable).',
  ];
  if (summary.survivors.length > 0) {
    lines.push('Surviving mutants (tests did not notice these changes):');
    for (const s of summary.survivors) {
      lines.push(`  ${s.file}:${s.line}  ${s.mutator}  ->  ${s.replacement}`);
    }
  }
  return lines.join('\n');
}

function printHelp() {
  console.log(
    [
      'Usage:',
      '  pnpm test:mutate -- <file> [more files]   mutate these files',
      '  pnpm test:mutate -- --diff [--base <ref>] mutate files changed vs the base (default origin/main)',
      '  pnpm test:mutate                          same as --diff',
      '',
      'Report-only: the score never fails the run. Reports: reports/mutation/.',
      'Requires Node 22+ (Stryker v10). One run at a time — never alongside the gate.',
    ].join('\n'),
  );
}

/** @returns {number} the process exit code */
export function runMutate(argv = process.argv.slice(2), deps = {}) {
  const exec = deps.exec || spawnSync;
  const log = deps.log || console.log;
  const err = deps.err || console.error;
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor < 22) {
    err(`test:mutate needs Node 22+ (Stryker v10); this is Node ${process.versions.node}.`);
    return 1;
  }
  const parsed = parseArgs(argv);
  if (parsed.help) {
    printHelp();
    return 0;
  }
  let files = parsed.files.filter(isMutatable);
  if (parsed.diff) {
    try {
      files = diffFiles(parsed.base, exec);
    } catch (e) {
      err(e.message);
      return 1;
    }
  }
  if (files.length === 0) {
    log('test:mutate: no mutatable files in scope — nothing to run.');
    return 0;
  }
  const bin = path.join(
    ROOT,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'stryker.cmd' : 'stryker',
  );
  if (!existsSync(bin)) {
    err('test:mutate: Stryker is not installed. Run `pnpm install` first.');
    return 1;
  }
  log(`test:mutate: mutating ${files.length} file(s): ${files.join(', ')}`);
  const result = exec(bin, buildStrykerArgs(files), { cwd: ROOT, stdio: 'inherit' });
  if (result.error) {
    err(`test:mutate: could not start Stryker: ${result.error.message}`);
    return 1;
  }
  // Report-only: Stryker's config sets thresholds.break to null, so a low
  // score already exits 0. A non-zero exit here is a tool error, surfaced
  // as-is. The summary below is the review signal either way it is read.
  if (existsSync(REPORT_JSON)) {
    try {
      log(formatSummary(summarizeReport(JSON.parse(readFileSync(REPORT_JSON, 'utf8')))));
    } catch {
      err('test:mutate: could not read reports/mutation/mutation.json to summarize it.');
    }
  }
  return result.status ?? 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runMutate();
}
