#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Release gate (hds#801): publishing waits for Figma. Fails when
 *   1. the model built from hirobius.tokens.json differs from figma/snapshot.json
 *      (any drift, unlike `check-figma-drift --ci`, which only fails on
 *      drift a push cannot explain), or
 *   2. the snapshot's `tokensHash` (hirobius.tokens.json's sha256 when it was
 *      ingested) is missing or differs from the file now. A hash, not a
 *      commit: squash merges leave a branch's commits unreachable from main.
 *   3. a component figma/disposition.json classes `library` has no Figma node:
 *      no @figma tag (its figmaUrl) and no entry in figma/mapping-overrides.json
 *      (hds#801 step 3, folds in #762). Slot, layout and internal components
 *      are absent from Figma on purpose (hds#235) and never count. The table's
 *      freshness is pretest's `figma:disposition --check`, not this gate's.
 *   4. a Hirobius/Meta value in Figma (the library cover: meta/version,
 *      releasedAt, commit, docsUrl, repoUrl, npmName; scripts/lib/figma-meta.mjs)
 *      differs from what code reads now, above all meta/version against the
 *      version being released. Each named on its own line, with a reminder,
 *      even though step 1 counts it as drift too. meta/commit may name a
 *      commit that is not HEAD's history: the Version PR head the ops agent
 *      synced from before the squash merge. The gate takes Figma's meta/commit
 *      when the snapshot's `syncedHash` (syncedInputsHash at ingest) equals the
 *      content now (syncedCommitStandIn, hds#1359); any other change fails.
 *
 * --meta runs step 4 alone: `pnpm release:local` runs it before the build,
 * so a laptop release cannot ship with a stale cover.
 *
 * Baseline: figma/release-drift-baseline.json may list `extra` items
 * ({ kind: 'extra', name, reason }) the gate lets through. An extra is a
 * variable, mode or style Figma holds that code no longer has; Sync and
 * delta.js never delete, and the prune that does is Adrian's alone (the
 * promote plugin), so an agent cannot clear one. Nothing else can be
 * baselined, and an entry that is no longer drift fails as stale, so the
 * file only ever shrinks. No file means no baseline: drift must be 0.
 *
 * `pnpm release` (the script release.yml publishes through) runs this first.
 * Exit 0 clean · 1 refuse to publish. Never talks to Figma.
 *
 * Usage: node scripts/check-figma-release.mjs [--meta]
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runDriftCheck } from './check-figma-drift.mjs';
import { parseSnapshotFile, tokensFileHash } from './lib/figma-snapshot.mjs';
import {
  readFigmaMeta,
  metaGaps,
  snapshotMeta,
  syncedInputsCommit,
  syncedInputsHash,
  deepenSyncedHistory,
} from './lib/figma-meta.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BEHIND = 'Figma is behind code';
const FIX =
  'Fix: run figma/push delta.js through use_figma, take a snapshot, then pnpm figma:snapshot --ingest <file> (after the token change), and commit figma/snapshot.json. Runbook: figma/README.md.';

const COVERAGE_FIX =
  'Fix: draw each in the library through use_figma, add its node as an @figma tag in the component JSDoc (or a figma/mapping-overrides.json entry), then pnpm manifest:generate && pnpm figma:disposition --write.';

const META_FIX =
  'Reminder: the library cover reads Hirobius/Meta. For a release, push it from the Version PR head before the merge (pnpm figma:push, or figma/push delta.js through use_figma), refresh the snapshot by the snapshot-diff route (figma/push/use-figma/snapshot-diff.js through use_figma, then pnpm figma:snapshot --from-diff <file>), commit figma/snapshot.json, and publish the library.';

/** The committed snapshot file, parsed, or null when absent or unreadable. */
function readSnapshotFile(root) {
  const path = join(root, 'figma', 'snapshot.json');
  if (!existsSync(path)) return null;
  try {
    return parseSnapshotFile(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * The meta/commit Figma shows, when Figma was synced from exactly the content
 * now checked out: the snapshot's `syncedHash` equals syncedInputsHash(root).
 * The ops agent pushes and ingests on the Version PR head, before the merge; a
 * squash merge keeps that tree under a new sha, so meta/commit cannot be HEAD's,
 * but the content proves the sync (hds#1359). Null otherwise: then meta/commit
 * must be the last synced-input commit, as before.
 */
export function syncedCommitStandIn(root) {
  const file = readSnapshotFile(root);
  if (!file?.syncedHash || file.syncedHash !== syncedInputsHash(root)) return null;
  return snapshotMeta(file.snapshot).commit ?? null;
}

/** readFigmaMeta options: the caller's, plus the stand-in commit when there is one. */
function metaOptionsFor(root, options) {
  if (!existsSync(join(root, 'package.json'))) return options;
  const commit = syncedCommitStandIn(root);
  return commit ? { ...options, commit } : options;
}

/**
 * Every Hirobius/Meta value code sets (readFigmaMeta) against Figma's, from
 * figma/snapshot.json. `actual` is null when the snapshot is missing or holds
 * no such variable.
 * @param {string} root
 * @param {{ git?: Function }} [options]  passed to readFigmaMeta.
 * @returns {Array<{ key: string, name: string, expected: string, actual: string|null, ok: boolean }>}
 */
export function metaReleaseGaps(root, options = {}) {
  const snapshotPath = join(root, 'figma', 'snapshot.json');
  let snapshot = { collections: [] };
  if (existsSync(snapshotPath)) {
    try {
      snapshot = parseSnapshotFile(readFileSync(snapshotPath, 'utf8')).snapshot;
    } catch {
      /* unreadable snapshot: nothing to read */
    }
  }
  return metaGaps(readFigmaMeta(root, metaOptionsFor(root, options)), snapshot);
}

/** meta/version alone: `{ expected, actual, ok }`, expected null without a package.json. */
export function metaVersionGap(root, options = {}) {
  const gap = metaReleaseGaps(root, options).find((g) => g.key === 'version');
  return gap
    ? { expected: gap.expected, actual: gap.actual, ok: gap.ok }
    : { expected: null, actual: null, ok: false };
}

/**
 * The step-4 problem lines (empty when every meta value matches). A root with
 * no package.json (a fixture mini-root) builds no meta, so it has none.
 */
function metaProblems(root, options) {
  // With a stand-in commit the history is not read, so a shallow clone is fine.
  const standIn = existsSync(join(root, 'package.json')) && syncedCommitStandIn(root);
  const synced =
    existsSync(join(root, 'package.json')) && !standIn ? syncedInputsCommit(root, options) : null;
  const shallow =
    synced && !synced.complete
      ? [
          'this is a shallow clone: meta/commit cannot be read from the history. Run git fetch --unshallow, then run this check again.',
        ]
      : [];
  return shallow.concat(
    metaReleaseGaps(root, options)
      .filter((g) => !g.ok)
      .map((g) => {
        const subject = g.key === 'version' ? 'this release is' : 'code says';
        return g.actual === null
          ? `there is no ${g.name} in Figma (figma/snapshot.json) but ${subject} ${g.expected}.`
          : `${g.name} is ${g.actual} in Figma but ${subject} ${g.expected}.`;
      }),
  );
}

/**
 * Step 4 alone (`--meta`).
 * @param {{ root: string, git?: Function }} options
 * @returns {{ exitCode: 0|1, output: string }}
 */
export function runMetaGate({ root, ...options }) {
  const problems = metaProblems(root, options);
  if (!problems.length) {
    const version = metaVersionGap(root, options).expected;
    return {
      exitCode: 0,
      output: `✓ check-figma-release — Figma Hirobius/Meta matches code (meta/version ${version})`,
    };
  }
  return {
    exitCode: 1,
    output: `✗ ${BEHIND}: refusing to publish.\n- ${problems.join('\n- ')}\n${META_FIX}`,
  };
}

const BASELINE = join('figma', 'release-drift-baseline.json');
const key = (item) => `${item.kind} ${item.name}`;

/**
 * Splits drift items into baselined and not, and names baseline problems.
 * @param {string} root
 * @param {Array<{kind: string, name: string}>} items
 * @returns {{ open: object[], baselined: object[], problems: string[] }}
 */
export function applyDriftBaseline(root, items) {
  const path = join(root, BASELINE);
  if (!existsSync(path)) return { open: items, baselined: [], problems: [] };
  const { accepted = [] } = JSON.parse(readFileSync(path, 'utf8'));
  const problems = [];
  const bad = accepted.filter((e) => e.kind !== 'extra');
  if (bad.length)
    problems.push(
      `${BASELINE}: only \`extra\` items can be baselined (an agent can push the rest with delta.js): ${bad.map(key).join(', ')}.`,
    );
  const allowed = new Set(accepted.filter((e) => e.kind === 'extra').map(key));
  const present = new Set(items.map(key));
  const stale = [...allowed].filter((k) => !present.has(k));
  if (stale.length)
    problems.push(
      `${BASELINE} has stale entries that are no longer drift; delete them: ${stale.join(', ')}.`,
    );
  return {
    open: items.filter((i) => !allowed.has(key(i))),
    baselined: items.filter((i) => allowed.has(key(i))),
    problems,
  };
}

/**
 * `library` components with no Figma node. `table: false` when
 * figma/disposition.json is missing, which the gate treats as a failure.
 * @param {string} root
 * @returns {{ missing: string[], table: boolean }}
 */
export function componentCoverageGaps(root) {
  const tablePath = join(root, 'figma', 'disposition.json');
  if (!existsSync(tablePath)) return { missing: [], table: false };
  const { components = [] } = JSON.parse(readFileSync(tablePath, 'utf8'));
  const overridesPath = join(root, 'figma', 'mapping-overrides.json');
  const mapped = new Set();
  if (existsSync(overridesPath)) {
    for (const entry of JSON.parse(readFileSync(overridesPath, 'utf8')).overrides ?? []) {
      // Same reading as figma-disposition mappedByOverride: "Card.Progress" -> CardProgress.
      const target = String(entry.mapsTo ?? '')
        .split('(')[0]
        .trim();
      if (target) mapped.add(target.replace(/\./g, ''));
    }
  }
  const missing = components
    .filter((c) => c.class === 'library' && !c.figmaUrl && !mapped.has(c.name))
    .map((c) => c.name)
    .sort();
  return { missing, table: true };
}

/**
 * @param {{ root: string, git?: Function }} options  git: passed to readFigmaMeta.
 * @returns {{ exitCode: 0|1, output: string }}
 */
export function runReleaseGate({ root, ...options }) {
  const problems = [];
  const drift = runDriftCheck({ root, meta: metaOptionsFor(root, options) });
  const base = drift.report
    ? applyDriftBaseline(root, drift.report.items)
    : { open: null, baselined: [], problems: [] };
  problems.push(...base.problems);
  if (drift.exitCode === 2 || !existsSync(join(root, 'figma', 'snapshot.json'))) {
    problems.push('there is no Figma snapshot (figma/snapshot.json).');
  } else if (drift.exitCode !== 0 && !(base.open && base.open.length === 0)) {
    const count = drift.report
      ? `${base.open.length} drift item(s)${base.baselined.length ? ` (plus ${base.baselined.length} baselined)` : ''}`
      : 'a snapshot that does not verify';
    problems.push(
      `${count} between hirobius.tokens.json and figma/snapshot.json:\n${drift.output}`,
    );
  }
  if (existsSync(join(root, 'figma', 'snapshot.json'))) {
    try {
      const { tokensHash } = parseSnapshotFile(
        readFileSync(join(root, 'figma', 'snapshot.json'), 'utf8'),
      );
      if (!tokensHash) {
        problems.push(
          'the snapshot records no tokensHash (it predates the hash); re-run pnpm figma:snapshot --ingest.',
        );
      } else if (tokensHash !== tokensFileHash(root)) {
        problems.push('hirobius.tokens.json changed after the snapshot was ingested.');
      }
    } catch {
      /* no or unreadable snapshot: already reported above */
    }
  }
  const tokenProblems = problems.length;
  const meta = metaProblems(root, options);
  problems.push(...meta);
  const coverage = componentCoverageGaps(root);
  if (!coverage.table) {
    problems.push(
      'there is no figma/disposition.json, so component coverage is unmeasured; run pnpm figma:disposition --write.',
    );
  } else if (coverage.missing.length) {
    problems.push(
      `${coverage.missing.length} library component(s) with no Figma node: ${coverage.missing.join(', ')}. ${COVERAGE_FIX}`,
    );
  }
  if (!problems.length) {
    const note = base.baselined.length
      ? ` (${base.baselined.length} extra(s) baselined in ${BASELINE}, awaiting Adrian's prune)`
      : '';
    return { exitCode: 0, output: `✓ check-figma-release — Figma matches code${note}` };
  }
  return {
    exitCode: 1,
    output: `✗ ${BEHIND}: refusing to publish.\n- ${problems.join('\n- ')}${tokenProblems ? `\n${FIX}` : ''}${meta.length ? `\n${META_FIX}` : ''}`,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // CI checks out at depth 1, where meta/commit would read as HEAD: fetch the
  // history first. If that fails, the gate names the shallow clone and refuses.
  const synced = syncedCommitStandIn(ROOT) ? null : syncedInputsCommit(ROOT);
  if (synced && !synced.complete && !deepenSyncedHistory(ROOT)) {
    console.error('check-figma-release: could not fetch the full git history (shallow clone).');
  }
  const gate = process.argv.includes('--meta') ? runMetaGate : runReleaseGate;
  const { exitCode, output } = gate({ root: ROOT });
  (exitCode === 0 ? console.log : console.error)(output);
  process.exit(exitCode);
}
