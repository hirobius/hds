/**
 * scripts/lib/hook-logs.mjs
 *
 * Shared helpers for the token-lean git hooks: hook output goes to a log file
 * under `<git-dir>/hook-logs/`, and the terminal gets one line on success or the
 * failing stage's output plus the log path on failure. `HOOK_VERBOSE=1` bypasses
 * all of it (see scripts/hook-quiet.mjs and scripts/run-gates.mjs).
 *
 * Stage convention: hooks print `▸ <stage name>` before each stage so the summary
 * can name them and the failure excerpt can start at the stage that broke.
 *
 * @module hook-logs
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const KEEP_LOGS = 5;
export const STAGE_MARK = '▸ ';
export const GATE_BANNER = /^── \[.+\] ──$/;
const MAX_EXCERPT_LINES = 300;

/** Absolute git dir for `cwd` (worktree-safe); null outside a repo. */
export function gitDir(cwd = process.cwd()) {
  const r = spawnSync('git', ['rev-parse', '--absolute-git-dir'], { cwd, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

export function logDirFor(cwd = process.cwd()) {
  const g = gitDir(cwd);
  return g ? path.join(g, 'hook-logs') : null;
}

/** `<dir>/<name>-<UTC timestamp>-<pid>.log` — sortable, unique per run. */
export function newLogPath(dir, name, now = new Date()) {
  const ts = now.toISOString().replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-');
  return path.join(dir, `${name}-${ts}-${process.pid}.log`);
}

/** Delete all but the newest `keep` logs for `name` (lexical order == time order). */
export function pruneLogs(dir, name, keep = KEEP_LOGS) {
  let files;
  try {
    files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(`${name}-`) && f.endsWith('.log'))
      .sort();
  } catch {
    return;
  }
  for (const f of files.slice(0, Math.max(0, files.length - keep))) {
    try {
      fs.unlinkSync(path.join(dir, f));
    } catch {
      /* best effort */
    }
  }
}

export function formatDuration(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * One-line summary of a green run: stage names (the run-gates stage becomes
 * "N gates"), plus a warned count when a non-blocking gate warned.
 */
export function summarize(hook, log, ms) {
  const stages = log
    .split('\n')
    .filter((l) => l.startsWith(STAGE_MARK))
    .map((l) => l.slice(STAGE_MARK.length).trim());
  const gates =
    /run-gates: (?:all (\d+) gate\(s\) passed|no blocking failures \((\d+) passed, (\d+) warned\))/.exec(
      log,
    );
  const warned = /run-gates: (\d+) gate\(s\) warned/.exec(log);
  const parts = stages.map((s) => (gates && /gates/.test(s) ? `${gates[1] ?? gates[2]} gates` : s));
  let body = parts.join(', ') || 'ok';
  if (warned) body += ` (${warned[1]} warned, see log)`;
  return `✓ ${hook}: ${body} (${formatDuration(ms)})`;
}

/**
 * Output of the stage that failed: from the nearest stage marker or gate banner
 * above the end of the log, else the whole log.
 */
export function failureExcerpt(log, maxLines = MAX_EXCERPT_LINES) {
  const lines = log.replace(/\n$/, '').split('\n');
  let start = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].startsWith(STAGE_MARK) || GATE_BANNER.test(lines[i])) {
      start = i;
      break;
    }
  }
  const out = lines.slice(start);
  if (out.length > maxLines) {
    const hidden = out.length - maxLines;
    return [...out.slice(0, maxLines), `… ${hidden} more line(s) in the full log`].join('\n');
  }
  return out.join('\n');
}
