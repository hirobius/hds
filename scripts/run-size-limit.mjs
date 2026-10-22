#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * run-size-limit — the `size-limit` package script. Runs size-limit against
 * .size-limit.cjs exactly as before (same output, same exit code) and, when it
 * fails, appends the performance-optimization skill pointer so a bundle-budget
 * failure says what to do next and never "raise the limit".
 *
 * The Button-only budget measures dist/probe/button-only.js, which only
 * scripts/build-button-probe.mjs writes. When that file is missing or older
 * than dist/hirobius-ui.js, this builds it first, so `pnpm size-limit` after a
 * bare `pnpm build:lib` no longer fails on a file nobody built.
 *
 *   pnpm size-limit [size-limit args]
 */
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
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

const MAIN = path.join(ROOT, 'dist', 'hirobius-ui.js');
const PROBE = path.join(ROOT, 'dist', 'probe', 'button-only.js');

/** The probe needs (re)building when the main entry exists and the probe is missing or older. */
export const buttonProbe = {
  needsBuild() {
    if (!existsSync(MAIN)) return false; // size-limit reports the missing dist itself
    return !existsSync(PROBE) || statSync(PROBE).mtimeMs < statSync(MAIN).mtimeMs;
  },
};

/** @returns {number} the process exit code */
export function runSizeLimit(
  args = [],
  { spawn = spawnSync, err = console.error, probe = buttonProbe } = {},
) {
  if (probe.needsBuild()) {
    const built = spawn(process.execPath, [path.join(ROOT, 'scripts', 'build-button-probe.mjs')], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    if (built.status !== 0) return built.status ?? 1;
  }
  const res = spawn(BIN, ['--config', '.size-limit.cjs', ...args], { cwd: ROOT, stdio: 'inherit' });
  if (res.status === 0) return 0;
  err(`\n${PERF_BUDGET_HINT}`);
  return res.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exit(runSizeLimit(process.argv.slice(2)));
}
