import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  summarize,
  failureExcerpt,
  pruneLogs,
  newLogPath,
  formatDuration,
} from '../lib/hook-logs.mjs';

describe('summarize', () => {
  it('names stages, folds the gate stage into a count, and shows duration', () => {
    const log = [
      '▸ typecheck',
      'noise',
      '▸ pre-commit gates',
      '── [a] ──',
      '✓ run-gates: all 18 gate(s) passed',
      '▸ lint',
    ].join('\n');
    expect(summarize('pre-commit', log, 12400)).toBe(
      '✓ pre-commit: typecheck, 18 gates, lint (12.4s)',
    );
  });
  it('reports warned gates', () => {
    const log =
      '▸ gates\n⚠ run-gates: 2 gate(s) warned (not blocking):\n✓ run-gates: no blocking failures (16 passed, 2 warned)';
    expect(summarize('pre-commit', log, 1000)).toContain('2 warned');
  });
  it('is one line even with no stages', () => {
    expect(summarize('commit-msg', 'x\ny', 50)).toBe('✓ commit-msg: ok (0.1s)');
  });
});

describe('failureExcerpt', () => {
  it('starts at the failing gate banner, not the whole log', () => {
    const log = [
      '▸ typecheck',
      'fine',
      '▸ gates',
      '── [g1] ──',
      'ok',
      '── [g2] ──',
      'BAD thing',
      '',
    ].join('\n');
    expect(failureExcerpt(log)).toBe('── [g2] ──\nBAD thing');
  });
  it('starts at the last stage marker when no banner follows', () => {
    expect(failureExcerpt('▸ a\nx\n▸ lint\nerr 1\nerr 2\n')).toBe('▸ lint\nerr 1\nerr 2');
  });
  it('falls back to the whole log', () => {
    expect(failureExcerpt('boom\n')).toBe('boom');
  });
  it('caps very long output and points at the log', () => {
    const log = '▸ x\n' + Array.from({ length: 50 }, (_, i) => `l${i}`).join('\n');
    const out = failureExcerpt(log, 10).split('\n');
    expect(out).toHaveLength(11);
    expect(out.at(-1)).toMatch(/more line\(s\) in the full log/);
  });
});

describe('pruneLogs', () => {
  it('keeps the newest N logs for one hook and leaves others alone', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hooklogs-'));
    try {
      for (let i = 1; i <= 8; i++)
        writeFileSync(join(dir, `pre-commit-2026100${i}-000000-1.log`), '');
      writeFileSync(join(dir, 'pre-push-20261001-000000-1.log'), '');
      pruneLogs(dir, 'pre-commit', 5);
      const left = readdirSync(dir).sort();
      expect(left.filter((f) => f.startsWith('pre-commit-'))).toHaveLength(5);
      expect(left).toContain('pre-commit-20261008-000000-1.log');
      expect(left).not.toContain('pre-commit-20261001-000000-1.log');
      expect(left).toContain('pre-push-20261001-000000-1.log');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('helpers', () => {
  it('formats durations and log names', () => {
    expect(formatDuration(12345)).toBe('12.3s');
    expect(newLogPath('/x', 'pre-push', new Date('2026-10-06T01:02:03.456Z'))).toMatch(
      /^\/x\/pre-push-20261006-010203-\d+\.log$/,
    );
  });
});
