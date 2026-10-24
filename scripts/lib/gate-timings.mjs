/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Gate timings (TEMPORARY — review/remove on 2026-10-31, hds#912).
 *
 * Shared by ralph/gate.sh (via scripts/gate-timings.mjs) and scripts/hook-run.mjs
 * (pre-push): per-step "⏱" lines, a slowest-first summary table, one JSON line
 * per run in .gate-timings.jsonl, and the median/p90 report over the last N runs.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

export const TIMINGS_FILE = '.gate-timings.jsonl';

const secs = (ms) => (ms / 1000).toFixed(1);

/** "⏱ <step> <seconds>s" — printed right after each step finishes. */
export function stepLine(name, ms) {
  return `⏱ ${name} ${secs(ms)}s`;
}

/** Summary table, slowest step first, with the run total. */
export function formatTable(steps, totalMs) {
  const rows = [...steps].sort((a, b) => b.ms - a.ms);
  const width = Math.max(4, ...rows.map((s) => s.name.length));
  const line = (name, sec, ok) => `${name.padEnd(width)}  ${sec.padStart(7)}  ${ok}`;
  return [
    line('step', 'seconds', 'ok'),
    line('-'.repeat(width), '-------', '--'),
    ...rows.map((s) => line(s.name, secs(s.ms), s.ok ? '✓' : '✗')),
    line('-'.repeat(width), '-------', '--'),
    line('total', secs(totalMs), steps.every((s) => s.ok) ? '✓' : '✗'),
  ].join('\n');
}

export function buildRecord({ runner, steps, totalMs, sha, ts = new Date().toISOString() }) {
  return {
    ts,
    runner,
    steps: steps.map(({ name, ms, ok }) => ({ name, ms: Math.round(ms), ok: Boolean(ok) })),
    totalMs: Math.round(totalMs),
    sha,
  };
}

/** HEAD sha, or null outside a repo. */
export function headSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

export function appendRecord(file, record) {
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`);
}

/** Records from a .jsonl file, skipping blank or corrupt lines. */
export function readRecords(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((l) => {
      if (!l.trim()) return [];
      try {
        return [JSON.parse(l)];
      } catch {
        return [];
      }
    });
}

/** Nearest-rank percentile (p in 0..100) of a numeric array. */
export function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1];
}

/**
 * Per-runner, per-step median and p90 over the last `last` runs of each runner.
 * Returns [{ runner, runs, steps: [{ name, n, median, p90 }], total: { median, p90 } }],
 * steps sorted slowest median first.
 */
export function summarize(records, { last = 20, runner } = {}) {
  const runners = [...new Set(records.map((r) => r.runner))].filter((r) => !runner || r === runner);
  return runners.map((name) => {
    const runs = records.filter((r) => r.runner === name).slice(-last);
    const byStep = new Map();
    for (const run of runs)
      for (const s of run.steps ?? []) {
        if (!byStep.has(s.name)) byStep.set(s.name, []);
        byStep.get(s.name).push(s.ms);
      }
    const steps = [...byStep]
      .map(([step, ms]) => ({
        name: step,
        n: ms.length,
        median: percentile(ms, 50),
        p90: percentile(ms, 90),
      }))
      .sort((a, b) => b.median - a.median);
    const totals = runs.map((r) => r.totalMs);
    return {
      runner: name,
      runs: runs.length,
      steps,
      total: { median: percentile(totals, 50), p90: percentile(totals, 90) },
    };
  });
}

export function formatReport(summary) {
  if (summary.length === 0) return `no runs recorded in ${TIMINGS_FILE} yet`;
  return summary
    .map(({ runner, runs, steps, total }) => {
      const width = Math.max(5, ...steps.map((s) => s.name.length));
      const line = (a, n, m, p) =>
        `${a.padEnd(width)}  ${n.padStart(4)}  ${m.padStart(8)}  ${p.padStart(8)}`;
      return [
        `${runner} — last ${runs} run${runs === 1 ? '' : 's'}`,
        line('step', 'runs', 'median s', 'p90 s'),
        ...steps.map((s) => line(s.name, String(s.n), secs(s.median), secs(s.p90))),
        line('total', String(runs), secs(total.median), secs(total.p90)),
      ].join('\n');
    })
    .join('\n\n');
}
