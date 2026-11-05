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
 * Usage: node scripts/check-figma-release.mjs
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runDriftCheck } from './check-figma-drift.mjs';
import { parseSnapshotFile, tokensFileHash } from './lib/figma-snapshot.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BEHIND = 'Figma is behind code';
const FIX =
  'Fix: run figma/push delta.js through use_figma, take a snapshot, then pnpm figma:snapshot --ingest <file> (after the token change), and commit figma/snapshot.json. Runbook: figma/README.md.';

const COVERAGE_FIX =
  'Fix: draw each in the library through use_figma, add its node as an @figma tag in the component JSDoc (or a figma/mapping-overrides.json entry), then pnpm manifest:generate && pnpm figma:disposition --write.';

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
 * @param {{ root: string }} options
 * @returns {{ exitCode: 0|1, output: string }}
 */
export function runReleaseGate({ root }) {
  const problems = [];
  const drift = runDriftCheck({ root });
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
    output: `✗ ${BEHIND}: refusing to publish.\n- ${problems.join('\n- ')}${tokenProblems ? `\n${FIX}` : ''}`,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { exitCode, output } = runReleaseGate({ root: ROOT });
  (exitCode === 0 ? console.log : console.error)(output);
  process.exit(exitCode);
}
