#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * gate-timings.mjs — build-time measurement for the local gates.
 *
 * TEMPORARY: added 2026-10-24 to get a week of numbers before optimizing the
 * gate. Review the data and remove this script, scripts/lib/gate-timings.mjs,
 * the timing wrapper in ralph/gate.sh, the pre-push branch in
 * scripts/hook-run.mjs, the `timings:report` package script and the
 * .gate-timings.jsonl ignore line on 2026-10-31 (tracked in hds#912).
 *
 *   node scripts/gate-timings.mjs finish --runner gate --steps <tsv> --total-ms <n>
 *       Reads "<name>\t<ms>\t<0|1>" lines, prints the slowest-first table and
 *       appends one JSON line to .gate-timings.jsonl. Used by ralph/gate.sh.
 *   node scripts/gate-timings.mjs report [N] [--runner gate|pre-push]
 *       Median and p90 per step over the last N runs (default 20).
 *       `pnpm timings:report` runs this.
 */
import fs from 'node:fs';
import {
  TIMINGS_FILE,
  appendRecord,
  buildRecord,
  formatReport,
  formatTable,
  headSha,
  readRecords,
  summarize,
} from './lib/gate-timings.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const flag = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? undefined : rest[i + 1];
};

if (cmd === 'finish') {
  const steps = fs
    .readFileSync(flag('steps'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [name, ms, ok] = l.split('\t');
      return { name, ms: Number(ms), ok: ok === '1' };
    });
  const totalMs = Number(flag('total-ms'));
  console.log(formatTable(steps, totalMs));
  appendRecord(
    TIMINGS_FILE,
    buildRecord({ runner: flag('runner'), steps, totalMs, sha: headSha() }),
  );
} else if (cmd === 'report') {
  const n = Number(rest.find((a) => /^\d+$/.test(a)) ?? 20);
  console.log(
    formatReport(summarize(readRecords(TIMINGS_FILE), { last: n, runner: flag('runner') })),
  );
} else {
  console.error(
    'usage: gate-timings.mjs finish --runner <r> --steps <tsv> --total-ms <n> | report [N] [--runner <r>]',
  );
  process.exit(2);
}
