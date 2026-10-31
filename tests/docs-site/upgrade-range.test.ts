/**
 * Seam under test: upgradeRange, the pure merge behind the /upgrade/?from=X&to=Y
 * page (hds#464). It folds every release ledger in (from, to] into one list:
 * codemods to run (each once), removals, manual edits and look changes.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { upgradeRange } from '../../docs-site/lib/upgrade-range';
import type { LedgerRelease } from '../../docs-site/lib/upgrade-ledger';

const rel = (version: string, steps: LedgerRelease['steps']): LedgerRelease => ({
  version,
  date: '2026-01-01',
  bump: 'minor',
  summary: `s${version}`,
  steps,
});
const step = (id: string, kind: string, impact: string, extra = {}) => ({
  id,
  kind,
  impact,
  plain: `do ${id}`,
  ...extra,
});
const cm = { codemod: 'hds-x', args: ['--a'] };

const FIX = [
  rel('0.2.0', [
    step('0.2.0/moved/A', 'moved', 'breaking', { auto: cm }),
    step('0.2.0/removed/B', 'removed', 'breaking'),
  ]),
  rel('0.10.0', [
    step('0.10.0/moved/C', 'moved', 'breaking', { auto: cm }),
    step('0.10.0/look/D', 'look', 'look'),
    step('0.10.0/behavior/E', 'behavior', 'behavior'),
    step('0.10.0/value-changed/F', 'value-changed', 'none'),
  ]),
  rel('0.1.0', [step('0.1.0/removed/Z', 'removed', 'breaking')]),
  rel('0.11.0', [step('0.11.0/manual/G', 'manual', 'breaking')]),
];

describe('upgradeRange', () => {
  it('takes releases after from up to and including to, in numeric order', () => {
    const r = upgradeRange(FIX, '0.1.0', '0.10.0');
    expect(r.error).toBeUndefined();
    expect(r.releases.map((x) => x.version)).toEqual(['0.2.0', '0.10.0']);
  });

  it('lists each codemod command once, with the steps it covers', () => {
    const r = upgradeRange(FIX, '0.1.0', '0.11.0');
    expect(r.codemods).toEqual([
      { command: 'hds-x --a', steps: ['0.2.0/moved/A', '0.10.0/moved/C'] },
    ]);
  });

  it('splits the rest into removals, manual edits and look changes; skips no-impact steps', () => {
    const r = upgradeRange(FIX, '0.1.0', '0.11.0');
    expect(r.removals.map((s) => s.id)).toEqual(['0.2.0/removed/B']);
    expect(r.manual.map((s) => s.id)).toEqual(['0.10.0/behavior/E', '0.11.0/manual/G']);
    expect(r.looks.map((s) => s.id)).toEqual(['0.10.0/look/D']);
  });

  it('reports a missing, unknown or backwards range instead of guessing', () => {
    expect(upgradeRange(FIX, null, '0.2.0').error).toMatch(/from/);
    expect(upgradeRange(FIX, '0.1.0', '9.9.9').error).toMatch(/9\.9\.9/);
    expect(upgradeRange(FIX, '0.10.0', '0.2.0').error).toMatch(/newer/);
  });

  it('accepts a from below the ledger floor (any earlier install)', () => {
    expect(upgradeRange(FIX, '0.0.5', '0.2.0').releases.map((x) => x.version)).toEqual([
      '0.1.0',
      '0.2.0',
    ]);
  });

  it('merges the real ledger 0.16.0 → 0.20.0', () => {
    const dir = join(__dirname, '..', '..', 'upgrade/releases');
    const all = readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as LedgerRelease);
    const r = upgradeRange(all, '0.16.0', '0.20.0');
    expect(r.releases.map((x) => x.version)).toEqual([
      '0.17.0',
      '0.18.0',
      '0.19.0',
      '0.19.1',
      '0.20.0',
    ]);
    expect(r.codemods.map((c) => c.command)).toContain('hds-patterns-subpath');
    expect(r.removals.length).toBeGreaterThan(0);
  });
});
