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

/**
 * @param {{ root: string }} options
 * @returns {{ exitCode: 0|1, output: string }}
 */
export function runReleaseGate({ root }) {
  const problems = [];
  const drift = runDriftCheck({ root });
  if (drift.exitCode === 2 || !existsSync(join(root, 'figma', 'snapshot.json'))) {
    problems.push('there is no Figma snapshot (figma/snapshot.json).');
  } else if (drift.exitCode !== 0) {
    const count = drift.report
      ? `${drift.report.items.length} drift item(s)`
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
  if (!problems.length)
    return { exitCode: 0, output: '✓ check-figma-release — Figma matches code' };
  return {
    exitCode: 1,
    output: `✗ ${BEHIND}: refusing to publish.\n- ${problems.join('\n- ')}\n${FIX}`,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { exitCode, output } = runReleaseGate({ root: ROOT });
  (exitCode === 0 ? console.log : console.error)(output);
  process.exit(exitCode);
}
