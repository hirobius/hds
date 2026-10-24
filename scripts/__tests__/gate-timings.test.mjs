import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  appendRecord,
  buildRecord,
  formatReport,
  formatTable,
  percentile,
  readRecords,
  stepLine,
  summarize,
} from '../lib/gate-timings.mjs';

describe('gate timings', () => {
  it('prints a step line in seconds', () => {
    expect(stepLine('pnpm test', 12345)).toBe('⏱ pnpm test 12.3s');
  });

  it('sorts the table slowest first and ends with the total', () => {
    const table = formatTable(
      [
        { name: 'fast', ms: 100, ok: true },
        { name: 'slow', ms: 9000, ok: false },
      ],
      9100,
    ).split('\n');
    expect(table[2]).toMatch(/^slow\s+9\.0\s+✗$/);
    expect(table[3]).toMatch(/^fast\s+0\.1\s+✓$/);
    expect(table.at(-1)).toMatch(/^total\s+9\.1\s+✗$/);
  });

  it('round-trips records through the jsonl file and skips corrupt lines', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'timings-')), 't.jsonl');
    const rec = buildRecord({
      runner: 'gate',
      steps: [{ name: 'a', ms: 10.6, ok: 1 }],
      totalMs: 11.2,
      sha: 'abc',
      ts: '2026-10-24T00:00:00.000Z',
    });
    appendRecord(file, rec);
    fs.appendFileSync(file, 'not json\n');
    expect(readRecords(file)).toEqual([
      {
        ts: '2026-10-24T00:00:00.000Z',
        runner: 'gate',
        steps: [{ name: 'a', ms: 11, ok: true }],
        totalMs: 11,
        sha: 'abc',
      },
    ]);
  });

  it('computes nearest-rank median and p90', () => {
    const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(v, 50)).toBe(5);
    expect(percentile(v, 90)).toBe(9);
    expect(percentile([], 50)).toBe(0);
  });

  it('summarizes the last N runs per runner', () => {
    const run = (runner, ms) => ({ runner, steps: [{ name: 's', ms, ok: true }], totalMs: ms });
    const records = [run('gate', 1000), run('gate', 2000), run('gate', 3000), run('pre-push', 50)];
    const [gate] = summarize(records, { last: 2, runner: 'gate' });
    expect(gate).toMatchObject({ runner: 'gate', runs: 2, total: { median: 2000, p90: 3000 } });
    expect(gate.steps).toEqual([{ name: 's', n: 2, median: 2000, p90: 3000 }]);
    expect(summarize(records)).toHaveLength(2);
    expect(formatReport([])).toMatch(/no runs recorded/);
  });
});
