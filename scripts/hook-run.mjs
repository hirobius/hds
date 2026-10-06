#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * hook-run.mjs — quiet runner for husky hooks.
 *
 *   node scripts/hook-run.mjs <hook>        (called by .husky/<hook>)
 *
 * Parses .husky/<hook> into stages (echo "<title>…" + the commands under it),
 * runs them serially via `sh -c`, and captures output to
 * $(git rev-parse --git-dir)/hook-logs/<hook>-<timestamp>.log (newest 5 kept).
 * Green: one summary line. Red: only the failing stage's excerpt, the full-log
 * path, and the stage's own exit code. HOOK_VERBOSE=1 runs the hook file
 * as-is with full streaming output. Same commands, same exit codes.
 */
import { spawnSync, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import {
  failureExcerpt,
  formatDuration,
  openLog,
  parseHookStages,
  stageLabel,
  summaryLine,
} from './lib/hook-output.mjs';

const hook = process.argv[2];
if (!hook) {
  console.error('usage: hook-run.mjs <hook>');
  process.exit(2);
}
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const hookFile = path.join(root, '.husky', hook);
const verbose = process.env.HOOK_VERBOSE === '1';

if (verbose) {
  const r = spawnSync('sh', [hookFile], {
    stdio: 'inherit',
    env: { ...process.env, HOOK_RUN_RAW: '1' },
  });
  process.exit(r.status ?? 1);
}

const stages = parseHookStages(fs.readFileSync(hookFile, 'utf8')).map((s) => ({
  name: s.name,
  cmd: s.commands.join(' && '),
}));

if (stages.length === 0) {
  console.error(`✗ hook-run: no stages parsed from ${hookFile}`);
  process.exit(2);
}

let logFile = null;
{
  try {
    const gitDir = execFileSync('git', ['rev-parse', '--absolute-git-dir'], {
      encoding: 'utf8',
    }).trim();
    logFile = openLog(gitDir, hook);
  } catch {
    /* no git dir: run without a log */
  }
}

const t0 = performance.now();
const labels = [];
for (const { name, cmd } of stages) {
  const start = performance.now();
  const r = spawnSync('sh', ['-c', cmd], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (logFile)
    fs.appendFileSync(
      logFile,
      `\n===== ${name} :: ${cmd} (${formatDuration(performance.now() - start)}) =====\n${out}`,
    );
  if (r.status !== 0) {
    console.error(`✗ ${hook}: ${name} failed (exit ${r.status ?? 'signal'}) — ${cmd}`);
    console.error(failureExcerpt(out));
    if (logFile) console.error(`full log: ${logFile}  (HOOK_VERBOSE=1 for live output)`);
    process.exit(r.status ?? 1);
  }
  labels.push(stageLabel(name, out));
}
console.log(summaryLine(hook, labels, performance.now() - t0));
