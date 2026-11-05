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
 * Exit: the failing command's code, 0 when all pass, 2 for an unknown lane.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from './lib/guardrail-core.mjs';
import { laneCommands, runLane } from './lib/gate-lanes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [lane] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dryRun = process.argv.includes('--dry-run');

const loaded = loadRegistry();
if (!loaded.ok) {
  console.error(`✗ run-lane: ${loaded.error.message}`);
  process.exit(2);
}
const commands = lane ? laneCommands(loaded.registry, lane) : null;
if (!commands) {
  const known = Object.keys(loaded.registry.lanes ?? {}).join(', ');
  console.error(`✗ run-lane: unknown lane '${lane ?? ''}' (known: ${known})`);
  process.exit(2);
}

if (dryRun) {
  for (const cmd of commands) console.log(cmd);
  process.exit(0);
}

process.exit(
  runLane(commands, (cmd) => {
    const r = spawnSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true });
    return r.status ?? 1;
  }),
);
