import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  failureExcerpt,
  formatDuration,
  stageLabel,
  summaryLine,
  pruneLogs,
  parseHookStages,
  shortName,
} from '../lib/hook-output.mjs';

describe('failureExcerpt', () => {
  it('returns short output unchanged', () => {
    expect(failureExcerpt('a\nb\n')).toBe('a\nb');
  });
  it('keeps the last N lines plus earlier error-like lines', () => {
    const lines = Array.from({ length: 100 }, (_, i) => (i === 3 ? '✗ boom' : `line ${i}`));
    const out = failureExcerpt(lines.join('\n'), 10);
    expect(out).toContain('✗ boom');
    expect(out).toContain('line 99');
    expect(out).not.toContain('line 50');
    expect(out.split('\n').length).toBeLessThan(15);
  });
});

describe('summary helpers', () => {
  it('formats durations', () => {
    expect(formatDuration(42_000)).toBe('42s');
    expect(formatDuration(372_000)).toBe('6m12s');
  });
  it('adds the test count from vitest output', () => {
    expect(stageLabel('test', ' Tests  1920 passed (1920)')).toBe('test (1920)');
    expect(stageLabel('test', '\x1b[2m      Tests \x1b[22m \x1b[32m4171 passed\x1b[39m')).toBe(
      'test (4171)',
    );
    expect(stageLabel('typecheck', '')).toBe('typecheck');
  });
  it('builds one line', () => {
    expect(summaryLine('pre-push', ['a', 'b'], 61_000)).toBe('✓ pre-push: a, b (1m01s)');
  });
});

describe('pruneLogs', () => {
  it('keeps the newest 5 logs of the given hook only', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hl-'));
    for (let i = 0; i < 8; i++) fs.writeFileSync(path.join(dir, `pre-push-2026-0${i}.log`), '');
    fs.writeFileSync(path.join(dir, 'pre-commit-2026-00.log'), '');
    pruneLogs(dir, 'pre-push', 5);
    const left = fs.readdirSync(dir).sort();
    expect(left.filter((n) => n.startsWith('pre-push'))).toHaveLength(5);
    expect(left).toContain('pre-push-2026-07.log');
    expect(left).toContain('pre-commit-2026-00.log');
  });
});

describe('parseHookStages', () => {
  it('skips the guard line and comments, groups commands under each echo', () => {
    const hook = [
      'set -e',
      '[ -n "$HOOK_RUN_RAW" ] || exec node scripts/hook-run.mjs x',
      '# note',
      'echo "Tests (pnpm test)…"',
      'pnpm test',
      'echo "Join"',
      'node scripts/check-sync-map.mjs',
      'node scripts/check-sync-map.mjs --check',
    ].join('\n');
    const stages = parseHookStages(hook);
    expect(stages.map((s) => s.name)).toEqual(['test', 'sync-map']);
    expect(stages[1].commands).toHaveLength(2);
  });
  it('derives short names', () => {
    expect(shortName('pnpm exec lint-staged')).toBe('lint-staged');
    expect(shortName('node scripts/verify-tokens.mjs')).toBe('tokens');
    expect(shortName('pnpm smoke:consumer')).toBe('smoke:consumer');
  });
});
