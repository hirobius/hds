#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * hook-run.mjs — quiet runner for husky hooks.
 *
 *   node scripts/hook-run.mjs <hook> [args…]  (called by .husky/<hook>)
 *
 * The hook's own arguments (e.g. commit-msg's message file) are forwarded to
 * every stage as its positional parameters, so a stage reads them as "$1"….
 * Parses .husky/<hook> into stages (echo "<title>…" + the commands under it;
 * a `node scripts/run-lane.mjs <lane>` line becomes one stage per step of that
 * registry lane, hds#1095),
 * runs them serially via `sh -c`, and captures output to
 * $(git rev-parse --git-dir)/hook-logs/<hook>-<timestamp>.log (newest 5 kept).
 * Green: one summary line. Red: only the failing stage's excerpt, the full-log
 * path, and the stage's own exit code. Git's hook stdin (pre-push: one line per
 * pushed ref) is read once and fed to every stage, so the secret + PII scan
 * (ops#943) sees the refs. HOOK_VERBOSE=1 runs the hook file
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
import { expandHookLanes } from './lib/gate-lanes.mjs';

const hook = process.argv[2];
const hookArgs = process.argv.slice(3);
if (!hook) {
  console.error('usage: hook-run.mjs <hook>');
  process.exit(2);
}
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const hookFile = path.join(root, '.husky', hook);
const verbose = process.env.HOOK_VERBOSE === '1';

if (verbose) {
  const r = spawnSync('sh', [hookFile, ...hookArgs], {
    stdio: 'inherit',
    env: { ...process.env, HOOK_RUN_RAW: '1' },
  });
  process.exit(r.status ?? 1);
}

// A lane-backed hook needs the registry. If it is missing or broken the lane
// line stays unexpanded, parses to no stage, and the hook fails closed below.
let registry = null;
try {
  registry = JSON.parse(fs.readFileSync(path.join(root, 'docs/guardrails/registry.json'), 'utf8'));
} catch {
  /* no registry: hooks without a lane call parse as before */
}
const hookText = expandHookLanes(fs.readFileSync(hookFile, 'utf8'), registry);
const stages = parseHookStages(hookText).map((s) => ({
  name: s.name,
  cmd: s.commands.join(' && '),
}));

if (stages.length === 0) {
  console.error(`✗ hook-run: no stages parsed from ${hookFile}`);
  process.exit(2);
}

// Read once, before any stage runs: an empty stdin would let the pre-push
// secret + PII scan see no refs and pass everything (ops#943). Skip on a TTY
// (run by hand) so it never blocks waiting for input.
let hookStdin = '';
if (!process.stdin.isTTY) {
  try {
    hookStdin = fs.readFileSync(0, 'utf8');
  } catch {
    /* no stdin (closed or unreadable): stages get none, as before */
  }
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
  const r = spawnSync('sh', ['-c', cmd, hook, ...hookArgs], {
    encoding: 'utf8',
    input: hookStdin,
    maxBuffer: 256 * 1024 * 1024,
  });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const ms = performance.now() - start;
  if (logFile)
    fs.appendFileSync(logFile, `\n===== ${name} :: ${cmd} (${formatDuration(ms)}) =====\n${out}`);
  if (r.status !== 0) {
    console.error(`✗ ${hook}: ${name} failed (exit ${r.status ?? 'signal'}) — ${cmd}`);
    console.error(failureExcerpt(out));
    if (logFile) console.error(`full log: ${logFile}  (HOOK_VERBOSE=1 for live output)`);
    process.exit(r.status ?? 1);
  }
  labels.push(stageLabel(name, out));
}
console.log(summaryLine(hook, labels, performance.now() - t0));
