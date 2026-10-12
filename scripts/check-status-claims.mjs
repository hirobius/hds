#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-status-claims — keeps the figures root status.json and the README assert
 * in step with their derivable source, so a hand-typed number cannot go stale
 * unnoticed (the hds#285 class of bug).
 *
 * Today the one claim with a derivable source is agent consistency: `--check`
 * compares status.json's `consistency` object and the README "Agent
 * consistency" line with the latest eval/consistency/ledger.json entry
 * (hds#343, scripts/lib/consistency/status-sync.mjs).
 *
 *   node scripts/check-status-claims.mjs --check      # exit 1 on drift
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkRepo as checkConsistency } from './lib/consistency/status-sync.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function main() {
  const consistency = checkConsistency(ROOT);
  if (!consistency.ok) {
    console.error('✗ agent-consistency figures have drifted from eval/consistency/ledger.json:');
    for (const problem of consistency.problems) console.error(`  ${problem}`);
    console.error(
      '  Update status.json `consistency` and the README "Agent consistency" line to match the latest ledger entry (node scripts/eval-consistency.mjs --summary prints the line).',
    );
    process.exitCode = 1;
    return;
  }
  console.log('✓ status.json consistency and README match the latest consistency ledger entry');
}

main();
