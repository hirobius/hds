import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanFiles, reportAndExit } from '../lib/violation-gate-cli.mjs';
import { rankGapGroups, gapKey } from '../lib/explorations/gap-rank.mjs';

describe('scanFiles', () => {
  it('passes repo-relative paths and concatenates violations', () => {
    const root = mkdtempSync(join(tmpdir(), 'vgc-'));
    try {
      writeFileSync(join(root, 'a.css'), 'one');
      writeFileSync(join(root, 'b.css'), 'two');
      const seen = [];
      const out = scanFiles(
        [join(root, 'a.css'), join(root, 'b.css')],
        (text, rel) => {
          seen.push(rel);
          return [{ file: rel, line: 1, rule: 'r', message: text }];
        },
        root,
      );
      expect(seen).toEqual(['a.css', 'b.css']);
      expect(out.map((v) => v.message)).toEqual(['one', 'two']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('reportAndExit', () => {
  afterEach(() => vi.restoreAllMocks());

  const run = (violations, jsonMode) => {
    const out = [];
    const err = [];
    vi.spyOn(console, 'log').mockImplementation((m) => out.push(String(m)));
    vi.spyOn(console, 'error').mockImplementation((m) => err.push(String(m)));
    vi.spyOn(process.stdout, 'write').mockImplementation((m) => {
      out.push(String(m));
      return true;
    });
    const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`exit:${code}`);
    });
    let code;
    try {
      reportAndExit({
        violations,
        jsonMode,
        gate: 'check-x',
        okMessage: '[ok] check-x',
        failHeading: (n) => `${n} thing${n === 1 ? '' : 's'}`,
        footer: ['Fix: it.', '  Or exempt.'],
      });
    } catch (e) {
      code = e.message;
    }
    exit.mockRestore();
    return { code, out: out.join(''), err: err.join('\n') };
  };

  const v = { file: 'a.css', line: 3, rule: 'r', message: 'bad', sample: 'x: y' };

  it('prints the ok line and exits 0 when clean', () => {
    const r = run([], false);
    expect(r.code).toBe('exit:0');
    expect(r.out).toContain('[ok] check-x');
  });

  it('prints the located list and footer and exits 1', () => {
    const r = run([v], false);
    expect(r.code).toBe('exit:1');
    expect(r.err).toContain('✗ check-x: 1 thing:');
    expect(r.err).toContain('a.css:3  [r] bad');
    expect(r.err).toContain('Fix: it.\n  Or exempt.');
  });

  it('omits the line suffix and sample when absent', () => {
    const r = run([{ file: 'tokens.json', line: null, rule: 'r', message: 'bad' }], false);
    expect(r.err).toContain('  tokens.json  [r] bad');
    expect(r.err).not.toContain('tokens.json:');
  });

  it('emits the --json contract', () => {
    const r = run([v], true);
    expect(r.code).toBe('exit:1');
    const json = JSON.parse(r.out);
    expect(json.ok).toBe(false);
    expect(json.summary.total).toBe(1);
    expect(json.violations[0]).toMatchObject({ file: 'a.css', line: 3, severity: 'error' });
  });
});

describe('rankGapGroups', () => {
  const gap = (screen, direction, over = {}) => ({
    screen,
    direction,
    kind: 'token',
    needed: 'A spacing token',
    didInstead: 'hardcoded',
    proposal: 'add one',
    evidence: 'e',
    ...over,
  });
  const opts = { compareScreens: (a, b) => a.localeCompare(b), letters: ['A', 'B'] };

  it('counts a screen once and ranks by screens then hits', () => {
    const ranked = rankGapGroups(
      [
        gap('s1', 'A'),
        gap('s1', 'B'),
        gap('s2', 'A', { needed: 'a spacing TOKEN!' }),
        gap('s1', 'A', { needed: 'other', kind: 'bug' }),
      ],
      opts,
    );
    expect(ranked[0]).toMatchObject({ screenCount: 2, hits: 3, directions: { A: 2, B: 1 } });
    expect(ranked[1].kind).toBe('bug');
  });

  it('keys on id when present', () => {
    expect(gapKey({ id: 'x-y', kind: 'bug', needed: 'q' })).toBe('x-y');
  });
});
