#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * build-stats-json.mjs (ops#681)
 *
 * Writes public/hds-stats.json: the one generated, checked source of the HDS
 * numbers that other repos (folio, the ops docs) read instead of typing them.
 * Every value is computed from the repo; nothing in this file is a literal
 * count.
 *
 *   components.publicModules  `export * from './app/components/…'` lines of src/index.ts
 *                             (the number the README counts block states)
 *   components.core           components carrying `core: true` in the manifest
 *   components.patterns       pattern modules re-exported by src/patterns.ts
 *   tokens.total              DTCG leaf tokens in hirobius.tokens.json
 *   contrast.textPairs        PAIRS of scripts/check-contrast.mjs (each in light and dark)
 *   contrast.nonTextPairs     NONTEXT_PAIRS of scripts/check-contrast.mjs
 *   typography.styleCount     typographyRamp.styleCount of the manifest
 *   consumers                 the product-app / token-level-site split, as
 *                             docs/data/consumer-usage.json declares it, with that
 *                             file as `source` and the day it was confirmed
 *                             (null while the snapshot says it is unconfirmed)
 *   version                   package.json version
 *   delivery                  counted offline from git (never the GitHub API), at
 *                             `git merge-base HEAD origin/main`, so it always describes a
 *                             commit on main:
 *     .commitsOnMain          commits reachable from that commit
 *     .mergedPullRequests     PRs merged into main (squash or merge commit): distinct N
 *                             over main's first-parent subjects, where a subject that
 *                             starts "Merge pull request #N" is PR N and any other takes
 *                             its last "(#N)". A squash subject names the number its
 *                             author typed, so a wrong one counts as that number (the
 *                             #491/#490 case); expect the count to be off by such slips
 *     .firstCommitDate        day of the root commit (YYYY-MM-DD)
 *     .changelogVersions      versions with a `## x.y.z` heading in CHANGELOG.md at that
 *                             commit. Not "releases": git tags and docs/api/releases each
 *                             miss some versions, and a heading is not proof of a publish
 *     .asOf, .asOfDate        that commit and its day (%cs)
 *   generatedFrom             the commit the numbers were computed on top of
 *
 * The counting rules are build-readme-counts.mjs's and lib/core-set.mjs's, so
 * the README and this file cannot disagree about how a number is counted.
 *
 * `generatedFrom` is provenance, not a value: it is the HEAD of the checkout
 * that last changed a number, and it is kept while the numbers hold (a commit
 * cannot name its own sha). `--check` therefore compares every field but it.
 * `delivery` is refreshed only on purpose: `pnpm stats:build --delivery`. Every
 * other run, a write or `--check`, keeps the committed block, so two PRs that
 * each regenerate the stats do not conflict on a count that moves with every
 * commit. A refresh that cannot count (a shallow clone, no origin/main, no git)
 * keeps the committed block or omits the field when there is none; it never
 * writes a guessed number. Release CI (depth-1 checkout, changeset:version runs
 * this script) therefore republishes the committed block as it is. *
 * Run: pnpm stats:build  (also part of `pnpm tokens`, after the README counts it shares rules with)
 *      pnpm stats:build --delivery  (also recounts `delivery`; needs a full clone with origin/main)
 * Check: node scripts/build-stats-json.mjs --check  (exit 1 when the file would change; writes nothing)
 *        --root <dir> reads and writes under <dir> (tests).
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { collectCounts } from './build-readme-counts.mjs';
import { runGenerator, rootFromArgv } from './lib/generated-check.mjs';
import { NONTEXT_PAIRS, PAIRS } from './lib/contrast-pairs.mjs';
import { collectCoreSet, countCore } from './lib/core-set.mjs';

export const STATS_PATH = 'public/hds-stats.json';
const CONSUMER_SNAPSHOT = 'docs/data/consumer-usage.json';

const readJson = (root, rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));

/** The split exactly as the snapshot declares it, or null until a human confirms it. */
function consumerSplit(snapshot) {
  if (!snapshot.consumersConfirmed) return null;
  const { productApps, tokenLevelSites } = snapshot.consumers;
  return {
    productApps,
    tokenLevelSites,
    source: CONSUMER_SNAPSHOT,
    confirmedAt: snapshot.consumersConfirmedAt,
  };
}

/** Every number of public/hds-stats.json except `generatedFrom`, read from the repo at `root`. */
export function collectStats(root) {
  const { components, tokens } = collectCounts(root);
  const coreSet = collectCoreSet(root);
  return {
    $comment:
      'Generated by scripts/build-stats-json.mjs (pnpm stats:build); do not edit. Every number is computed from the repo and checked by pretest.',
    version: readJson(root, 'package.json').version,
    components: {
      publicModules: components,
      core: countCore(coreSet.core),
      patterns: coreSet.patterns.length,
    },
    tokens: { total: tokens },
    contrast: { textPairs: PAIRS.length, nonTextPairs: NONTEXT_PAIRS.length },
    typography: {
      styleCount: readJson(root, 'public/hds-manifest.json').typographyRamp.styleCount,
    },
    consumers: consumerSplit(readJson(root, CONSUMER_SNAPSHOT)),
  };
}

const gitOut = (root, args) =>
  execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 64 * 1024 * 1024,
  }).trim();

/** A merge-commit subject names its PR first; a squash subject ends with it. */
const MERGE_PR = /^Merge pull request #(\d+)\b/;
const PR_REF = /\(#(\d+)\)/g;

/** The PR a first-parent subject merged, or null when it names none. */
export function prOfSubject(subject) {
  const merge = MERGE_PR.exec(subject);
  if (merge) return Number(merge[1]);
  const refs = [...subject.matchAll(PR_REF)];
  return refs.length ? Number(refs[refs.length - 1][1]) : null;
}

/**
 * Delivery counts at the merge-base of HEAD and origin/main, or null when they
 * cannot be counted truthfully: no git, a shallow clone, or no origin/main.
 */
export function collectDelivery(root) {
  try {
    if (gitOut(root, ['rev-parse', '--is-shallow-repository']) !== 'false') return null;
    const base = gitOut(root, ['merge-base', 'HEAD', 'refs/remotes/origin/main']);
    const prs = new Set();
    for (const subject of gitOut(root, ['log', '--first-parent', '--format=%s', base]).split(
      '\n',
    )) {
      const pr = prOfSubject(subject);
      if (pr !== null) prs.add(pr);
    }
    const roots = gitOut(root, ['log', '--max-parents=0', '--format=%cs', base]).split('\n').sort();
    let changelog = '';
    try {
      changelog = gitOut(root, ['show', `${base}:CHANGELOG.md`]);
    } catch {
      changelog = '';
    }
    return {
      commitsOnMain: Number(gitOut(root, ['rev-list', '--count', base])),
      mergedPullRequests: prs.size,
      firstCommitDate: roots[0],
      changelogVersions: new Set(changelog.match(/^## \d+\.\d+\.\d+\S*/gm) ?? []).size,
      asOf: base,
      asOfDate: gitOut(root, ['show', '-s', '--format=%cs', base]),
    };
  } catch {
    return null;
  }
}

/**
 * Which delivery block the file carries: only an explicit refresh takes a fresh
 * count; otherwise, or when nothing can be counted, the committed block stays,
 * and the field is left out when there is none.
 */
export function pickDelivery({ fresh, committed, refresh }) {
  return refresh ? (fresh ?? committed) : committed;
}

/** The commit `root` is checked out at, or null outside a git checkout. */
function headSha(root) {
  try {
    return execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/** The committed file's parsed content, or null when absent or unreadable. */
function committedStats(root) {
  const path = join(root, STATS_PATH);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * The file's text: the numbers, then `generatedFrom`. While the committed
 * numbers equal today's, its `generatedFrom` stays; a changed number takes the
 * current HEAD.
 */
export function renderStats(root, { refreshDelivery = false } = {}) {
  const stats = collectStats(root);
  const committed = committedStats(root);
  const held = committed && isDeepStrictEqual(withoutProvenance(committed), stats);
  const generatedFrom = held ? committed.generatedFrom : headSha(root);
  const delivery = pickDelivery({
    fresh: refreshDelivery ? collectDelivery(root) : null,
    committed: committed?.delivery,
    refresh: refreshDelivery,
  });
  const out = { ...stats, ...(delivery ? { delivery } : {}), generatedFrom };
  return `${JSON.stringify(out, null, 2)}\n`;
}

function withoutProvenance(stats) {
  const { generatedFrom: _generatedFrom, delivery: _delivery, ...numbers } = stats;
  return numbers;
}

// ── CLI ───────────────────────────────────────────────────────────────────────
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ROOT = rootFromArgv(join(dirname(fileURLToPath(import.meta.url)), '..'));
  await runGenerator({
    root: ROOT,
    outputs: {
      [STATS_PATH]: renderStats(ROOT, {
        refreshDelivery: process.argv.includes('--delivery') && !process.argv.includes('--check'),
      }),
    },
    label: 'build-stats-json',
    fix: 'pnpm stats:build',
  });
}
