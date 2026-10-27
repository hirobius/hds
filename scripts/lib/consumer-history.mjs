/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * consumer-history.mjs (hds#658) — the monthly adoption ledger's sampler.
 *
 * For each calendar month (UTC) from 2026-07 to the current one, it takes the
 * last first-parent commit of a consumer's ref before the month ended, exports
 * only `src` and `package.json` at that commit to a temp dir (`git archive`, so
 * no `.env*` ever lands on disk), and asks the caller's `measure(dir)` for its
 * counts. The ref's tip is the current month's row. Git runs through
 * execFileSync arg arrays only.
 *
 * Fails loud (throws) on the three ways a ledger would quietly lie: a shallow
 * clone whose history is cut inside the window, a ref with no commit before
 * 2026-08-01 (wrong ref or truncated history), and an hds checkout whose tags
 * are behind its package.json (`git fetch --tags`).
 *
 * @module consumer-history
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const HISTORY_FROM = '2026-07';
const WINDOW_START = '2026-07-01T00:00:00Z';
const FIRST_MONTH_END = '2026-08-01T00:00:00Z';
const RAW_CONTROL_RE = /<(button|input|select|textarea|table)\b/g;
const RAW_CONTROLS = ['button', 'input', 'select', 'textarea', 'table'];
const PACKAGE = '@hirobius/design-system';

const git = (root, ...args) =>
  execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

/**
 * Each month from `from` to the month of `now`, with the instant it ends.
 * Built with Date.UTC, so December rolls over into January.
 *
 * @param {string} from 'YYYY-MM'
 * @param {Date} now
 * @returns {{ month: string, end: string }[]} `end` is an ISO instant ending in Z
 */
export function monthsBetween(from, now) {
  const [y0, m0] = from.split('-').map(Number);
  const last = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const out = [];
  for (let i = y0 * 12 + (m0 - 1); i <= last; i++) {
    const y = Math.floor(i / 12);
    const m = i % 12;
    const end = new Date(Date.UTC(y, m + 1, 1)).toISOString().replace('.000Z', 'Z');
    out.push({ month: `${y}-${String(m + 1).padStart(2, '0')}`, end });
  }
  return out;
}

function* tsxFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== 'node_modules') yield* tsxFiles(full);
    } else if (full.endsWith('.tsx')) yield full;
  }
}

/**
 * Lowercase raw control tags in `src/**\/*.tsx` (`<Button` never counts).
 * @param {string} srcDir
 * @returns {Record<'button'|'input'|'select'|'textarea'|'table', number>}
 */
export function countRawControls(srcDir) {
  const counts = Object.fromEntries(RAW_CONTROLS.map((t) => [t, 0]));
  for (const file of tsxFiles(srcDir))
    for (const m of readFileSync(file, 'utf8').matchAll(RAW_CONTROL_RE)) counts[m[1]]++;
  return counts;
}

/** 'v0.12.3' → [0, 12, 3], or null for anything that is not plain semver. */
const semver = (v) => {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(v);
  return m ? m.slice(1).map(Number) : null;
};
const cmpSemver = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** The hds checkout's `v*` tags: `{ tag, version, at }` (at = unix seconds). */
export function readHdsTags(hdsRoot) {
  const out = git(
    hdsRoot,
    'for-each-ref',
    'refs/tags/v*',
    '--format=%(refname:short) %(creatordate:unix)',
  );
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [tag, at] = line.split(' ');
      return { tag, version: semver(tag), at: Number(at) };
    })
    .filter((t) => t.version);
}

/**
 * The highest semver among tags dated on or before `end` (not the newest one
 * created: a backport tag can be cut after a higher release), or null.
 */
export function hdsVersionAt(tags, end) {
  const cutoff = Date.parse(end) / 1000;
  const eligible = tags.filter((t) => t.at < cutoff);
  if (eligible.length === 0) return null;
  return eligible.reduce((a, b) => (cmpSemver(b.version, a.version) > 0 ? b : a)).tag.slice(1);
}

/** Throws unless the hds checkout has tags reaching its package.json version. */
export function assertTagsCurrent(tags, packageVersion) {
  const fix = 'run `git fetch --tags` in the hds checkout';
  if (tags.length === 0) throw new Error(`consumer:usage --history: no v* tags; ${fix}.`);
  const top = tags.reduce((a, b) => (cmpSemver(b.version, a.version) > 0 ? b : a));
  const pkg = semver(packageVersion);
  if (pkg && cmpSemver(top.version, pkg) < 0)
    throw new Error(
      `consumer:usage --history: newest tag ${top.tag} is behind package.json ${packageVersion}; ${fix}.`,
    );
}

/** Throws when a shallow clone's history is cut inside the window. */
function assertDeepEnough(root) {
  if (git(root, 'rev-parse', '--is-shallow-repository') !== 'true') return;
  const shallowFile = git(root, 'rev-parse', '--git-path', 'shallow');
  const path = shallowFile.startsWith('/') ? shallowFile : join(root, shallowFile);
  const boundary = readFileSync(path, 'utf8').split('\n').filter(Boolean);
  const cutoff = Date.parse(WINDOW_START) / 1000;
  const cut = boundary.filter(
    (sha) => Number(git(root, 'show', '-s', '--format=%ct', sha)) >= cutoff,
  );
  if (cut.length > 0)
    throw new Error(
      `consumer:usage --history: ${root} is a shallow clone cut inside the window (boundary ${cut[0].slice(0, 7)}). ` +
        'Run `git fetch --depth=1000 origin main` (or `git fetch --unshallow` where allowed), then re-run.',
    );
}

/** `src` and `package.json` of `sha`, extracted into `dir`; returns which existed. */
function exportCommit(root, sha, dir) {
  const present = git(root, 'ls-tree', '--name-only', sha, 'src', 'package.json')
    .split('\n')
    .filter(Boolean);
  if (present.length === 0) return present;
  const tar = join(dir, '.export.tar');
  execFileSync('git', ['-C', root, 'archive', '--format=tar', '-o', tar, sha, ...present]);
  execFileSync('tar', ['-xf', tar, '-C', dir]);
  rmSync(tar);
  return present;
}

function versionRange(dir) {
  const pkgPath = join(dir, 'package.json');
  if (!existsSync(pkgPath)) return null;
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  for (const k of ['dependencies', 'devDependencies', 'peerDependencies'])
    if (pkg[k]?.[PACKAGE]) return pkg[k][PACKAGE];
  return null;
}

/**
 * The monthly ledger of one consumer.
 *
 * @param {{
 *   root: string,              consumer checkout (full, or deep enough)
 *   ref?: string,              default origin/main
 *   consumer: string,          id in consumers.apps
 *   hdsTags: { tag: string, version: number[], at: number }[],
 *   measure: (dir: string) => { files: number, components: number },
 *   now?: Date,
 * }} opts `measure` gets a dir holding the commit's `src/`.
 * @returns {{ consumer: string, ref: string, rows: object[] }}
 */
export function measureHistory({
  root,
  ref = 'origin/main',
  consumer,
  hdsTags,
  measure,
  now = new Date(),
}) {
  assertDeepEnough(root);
  const lastBefore = (end) => git(root, 'rev-list', '-1', '--first-parent', `--before=${end}`, ref);
  if (!lastBefore(FIRST_MONTH_END))
    throw new Error(
      `consumer:usage --history: ${ref} in ${root} has no commit before ${FIRST_MONTH_END.slice(0, 10)} (wrong ref, or history truncated).`,
    );
  const rows = [];
  for (const { month, end } of monthsBetween(HISTORY_FROM, now)) {
    const commit = lastBefore(end);
    const dir = mkdtempSync(join(tmpdir(), 'hds-history-'));
    try {
      const present = exportCommit(root, commit, dir);
      const hasSrc = present.includes('src');
      const usage = hasSrc ? measure(dir) : { files: null, components: null };
      rows.push({
        month,
        commit,
        committedAt: new Date(Number(git(root, 'show', '-s', '--format=%ct', commit)) * 1000)
          .toISOString()
          .replace('.000Z', 'Z'),
        files: usage.files,
        components: usage.components,
        rawControls: hasSrc ? countRawControls(join(dir, 'src')) : null,
        versionRange: versionRange(dir),
        hdsVersion: hdsVersionAt(hdsTags, end),
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  return { consumer, ref, rows };
}

/** `history` with `entry` in place of that consumer's entry (others untouched, order kept). */
export function upsertHistory(history = [], entry) {
  const i = history.findIndex((h) => h.consumer === entry.consumer);
  if (i === -1) return [...history, entry];
  return history.map((h, j) => (j === i ? entry : h));
}

/** The newest `source: "harness"` entry of eval/consistency/ledger.json, or null. */
export function latestHarnessEntry(ledger) {
  const runs = (ledger.entries ?? []).filter((e) => e.source === 'harness');
  return runs.length ? runs.at(-1) : null;
}
