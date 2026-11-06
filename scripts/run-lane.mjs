#!/usr/bin/env node
/**
 * scripts/run-lane.mjs — run one registry lane (hds#1095).
 *
 *   node scripts/run-lane.mjs check:fast
 *   node scripts/run-lane.mjs check:full --dry-run
 *
 * A lane is the ordered command list under `lanes` in
 * docs/guardrails/registry.json. Commands run one at a time through the shell,
 * stopping at the first failure — the same as the `&&` chain it replaced.
 * A named step prints its title first, as the hook `echo` it replaced did.
 * `--dry-run` prints only the commands (ralph/gate.sh reads them).
 * Exit: the failing command's code, 0 when all pass, 2 for an unknown lane.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from './lib/guardrail-core.mjs';
import { laneStages, runLane } from './lib/gate-lanes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [lane] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dryRun = process.argv.includes('--dry-run');

const loaded = loadRegistry();
if (!loaded.ok) {
  console.error(`✗ run-lane: ${loaded.error.message}`);
  process.exit(2);
}
const stages = lane ? laneStages(loaded.registry, lane) : null;
if (!stages) {
  const known = Object.keys(loaded.registry.lanes ?? {}).join(', ');
  console.error(`✗ run-lane: unknown lane '${lane ?? ''}' (known: ${known})`);
  process.exit(2);
}

if (dryRun) {
  for (const { run } of stages) console.log(run);
  process.exit(0);
}

process.exit(
  runLane(stages, ({ title, run }) => {
    if (title !== run) console.log(`${title}…`);
    const r = spawnSync(run, { cwd: ROOT, stdio: 'inherit', shell: true });
    return r.status ?? 1;
  }),
);
