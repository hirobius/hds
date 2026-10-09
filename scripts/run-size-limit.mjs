#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * run-size-limit — the `size-limit` package script. Runs size-limit against
 * .size-limit.cjs exactly as before (same output, same exit code) and, when it
 * fails, appends the performance-optimization skill pointer so a bundle-budget
 * failure says what to do next and never "raise the limit".
 *
 *   pnpm size-limit [size-limit args]
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PERF_BUDGET_HINT } from './lib/perf-budget-hint.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BIN = path.join(
  ROOT,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'size-limit.cmd' : 'size-limit',
);

/** @returns {number} the process exit code */
export function runSizeLimit(args = [], { spawn = spawnSync, err = console.error } = {}) {
  const res = spawn(BIN, ['--config', '.size-limit.cjs', ...args], { cwd: ROOT, stdio: 'inherit' });
  if (res.status === 0) return 0;
  err(`\n${PERF_BUDGET_HINT}`);
  return res.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exit(runSizeLimit(process.argv.slice(2)));
}
