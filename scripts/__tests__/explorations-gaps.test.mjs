/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * hds#628 phase 0 — the gap log: one JSON file per direction, validated, then
 * ranked across every screen by how many screens hit each gap. Pure functions
 * tested with small hand-built logs; the loader is tested against a temp dir.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  GAP_KINDS,
  aggregateGaps,
  collectGapLogs,
  gapKey,
  validateGapLog,
} from '../lib/explorations/gaps.mjs';

const tmpDirs = [];
const makeTmp = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'explorations-gaps-'));
  tmpDirs.push(dir);
  return dir;
};
afterAll(() => {
  for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
});

const gap = (over = {}) => ({
  screen: 'drops-inbox',
  direction: 'B',
  kind: 'component',
  needed: 'A file drop control with progress and a retry affordance',
  didInstead: 'A Button that opens a native picker, with progress as plain text',
  proposal: 'Add a FileDrop pattern (drop target, picker button, per-file progress, retry)',
  evidence: 'src/Capture.tsx:41; drops-inbox-B 390 light',
  ...over,
});

describe('GAP_KINDS', () => {
  it('is the five kinds named in hds#628', () => {
    expect(GAP_KINDS).toEqual(['token', 'component', 'pattern', 'rule', 'bug']);
  });
});

describe('validateGapLog', () => {
  it('accepts an empty log: a direction that needed nothing says so with []', () => {
    expect(validateGapLog([])).toEqual({ ok: true, problems: [], gaps: [] });
  });

  it('accepts a complete gap and returns it', () => {
    const r = validateGapLog([gap()]);
    expect(r.ok).toBe(true);
    expect(r.gaps).toEqual([gap()]);
  });

  it('accepts the optional id (a kebab-case name shared across screens)', () => {
    expect(validateGapLog([gap({ id: 'file-drop-control' })]).ok).toBe(true);
  });

  it('rejects anything that is not an array', () => {
    for (const bad of [{}, null, 'x', 3]) {
      const r = validateGapLog(bad);
      expect(r.ok).toBe(false);
      expect(r.problems.join('\n')).toMatch(/must be an array/);
    }
  });

  it('names every missing or blank field, with the gap number', () => {
    const r = validateGapLog([gap({ needed: '   ', proposal: undefined })]);
    expect(r.ok).toBe(false);
    expect(r.problems).toEqual(
      expect.arrayContaining([
        'gap 1: needed must be a non-empty string',
        'gap 1: missing proposal',
      ]),
    );
  });

  it('rejects a kind outside the five, listing the allowed ones', () => {
    const r = validateGapLog([gap({ kind: 'vibes' })]);
    expect(r.ok).toBe(false);
    expect(r.problems.join('\n')).toMatch(/kind "vibes".*token, component, pattern, rule, bug/);
  });

  it('rejects an unknown screen and an unknown direction', () => {
    const r = validateGapLog([gap({ screen: 'settings', direction: 'D' })]);
    expect(r.problems.join('\n')).toMatch(/screen "settings"/);
    expect(r.problems.join('\n')).toMatch(/direction "D"/);
  });

  it('rejects an unexpected key, so a typo cannot hide a field', () => {
    const r = validateGapLog([{ ...gap(), proposel: 'x' }]);
    expect(r.ok).toBe(false);
    expect(r.problems.join('\n')).toMatch(/unexpected key proposel/);
  });

  it('rejects an id that is not kebab-case', () => {
    const r = validateGapLog([gap({ id: 'File Drop' })]);
    expect(r.problems.join('\n')).toMatch(/id "File Drop" must be kebab-case/);
  });

  it('checks every gap against the screen and direction the file lives in', () => {
    const r = validateGapLog([gap(), gap({ screen: 'pitch' })], {
      screen: 'drops-inbox',
      direction: 'B',
    });
    expect(r.ok).toBe(false);
    expect(r.problems).toEqual([
      'gap 2: screen "pitch" does not match the directory it is in (drops-inbox)',
    ]);
  });

  it('reports every problem in the file, not only the first', () => {
    const r = validateGapLog([gap({ kind: 'nope' }), gap({ evidence: '' })]);
    expect(r.problems).toHaveLength(2);
  });
});

describe('gapKey: what counts as the same gap on two screens', () => {
  it('is the id when there is one, whatever the wording', () => {
    expect(gapKey(gap({ id: 'file-drop-control', needed: 'one wording' }))).toBe(
      'file-drop-control',
    );
    expect(gapKey(gap({ id: 'file-drop-control', needed: 'another wording' }))).toBe(
      'file-drop-control',
    );
  });

  it('is the kind plus the wording, case, spacing and punctuation folded, when there is no id', () => {
    const a = gapKey(gap({ id: undefined, needed: 'A file-drop control!' }));
    const b = gapKey(gap({ id: undefined, needed: '  a FILE  drop control ' }));
    expect(a).toBe(b);
    expect(a).toMatch(/^component:/);
  });

  it('does not merge two kinds that happen to share wording', () => {
    expect(gapKey(gap({ id: undefined, kind: 'token' }))).not.toBe(
      gapKey(gap({ id: undefined, kind: 'pattern' })),
    );
  });
});

describe('aggregateGaps: ranked by how many screens hit a gap', () => {
  const timeline = (screen, direction, over = {}) =>
    gap({
      screen,
      direction,
      id: 'activity-timeline',
      kind: 'pattern',
      needed: 'An activity timeline',
      ...over,
    });
  const fileDrop = (screen, direction) => gap({ screen, direction, id: 'file-drop-control' });
  const accent = (screen, direction) =>
    gap({
      screen,
      direction,
      id: 'supporting-accent',
      kind: 'token',
      needed: 'A supporting accent token',
    });

  const gaps = [
    timeline('pitch', 'A'),
    timeline('drops-inbox', 'B'),
    timeline('pitch', 'C'),
    fileDrop('ops-home', 'A'),
    fileDrop('drops-inbox', 'A'),
    fileDrop('drops-inbox', 'C'),
    accent('standing', 'B'),
    accent('leads', 'B'),
    accent('pitch', 'B'),
    accent('client-dashboard', 'C'),
  ];

  it('puts the gap hit by the most screens first, counting a screen once however many directions hit it', () => {
    const ranked = aggregateGaps(gaps);
    expect(ranked.map((g) => [g.key, g.screenCount, g.hits])).toEqual([
      ['supporting-accent', 4, 4],
      ['activity-timeline', 2, 3],
      ['file-drop-control', 2, 3],
    ]);
  });

  it('breaks a tie on screens by total hits, then by key, so the order never wobbles', () => {
    const ranked = aggregateGaps([
      fileDrop('ops-home', 'A'),
      fileDrop('drops-inbox', 'A'),
      timeline('pitch', 'A'),
      timeline('leads', 'A'),
      timeline('leads', 'B'),
    ]);
    expect(ranked.map((g) => g.key)).toEqual(['activity-timeline', 'file-drop-control']);
    const reversed = aggregateGaps(
      [
        fileDrop('ops-home', 'A'),
        fileDrop('drops-inbox', 'A'),
        timeline('pitch', 'A'),
        timeline('leads', 'A'),
        timeline('leads', 'B'),
      ].reverse(),
    );
    expect(reversed.map((g) => g.key)).toEqual(['activity-timeline', 'file-drop-control']);
  });

  it('breaks a full tie alphabetically by key', () => {
    const ranked = aggregateGaps([
      gap({ id: 'zebra-gap', screen: 'pitch' }),
      gap({ id: 'alpha-gap', screen: 'pitch' }),
    ]);
    expect(ranked.map((g) => g.key)).toEqual(['alpha-gap', 'zebra-gap']);
  });

  it('lists the screens in the order of the table in hds#628', () => {
    const [top] = aggregateGaps(gaps);
    expect(top.screens).toEqual(['standing', 'pitch', 'leads', 'client-dashboard']);
  });

  it('counts hits per direction', () => {
    const ranked = aggregateGaps(gaps);
    expect(ranked.find((g) => g.key === 'supporting-accent').directions).toEqual({
      A: 0,
      B: 3,
      C: 1,
    });
  });

  it('carries every distinct proposal, didInstead and the evidence with its screen and direction', () => {
    const ranked = aggregateGaps([
      fileDrop('ops-home', 'A'),
      { ...fileDrop('drops-inbox', 'B'), proposal: 'A second, different proposal' },
      fileDrop('drops-inbox', 'C'),
    ]);
    const [g] = ranked;
    expect(g.proposals).toHaveLength(2);
    expect(g.proposals).toContain('A second, different proposal');
    expect(g.evidence).toEqual([
      { screen: 'ops-home', direction: 'A', evidence: expect.any(String) },
      { screen: 'drops-inbox', direction: 'B', evidence: expect.any(String) },
      { screen: 'drops-inbox', direction: 'C', evidence: expect.any(String) },
    ]);
  });

  it('takes the most common kind when two logs disagree, and keeps both', () => {
    const ranked = aggregateGaps([
      gap({ id: 'x', kind: 'component', screen: 'pitch' }),
      gap({ id: 'x', kind: 'pattern', screen: 'leads' }),
      gap({ id: 'x', kind: 'pattern', screen: 'standing' }),
    ]);
    expect(ranked[0].kind).toBe('pattern');
    expect(ranked[0].kinds).toEqual(['component', 'pattern']);
  });

  it('merges gaps without an id by their folded wording', () => {
    const ranked = aggregateGaps([
      gap({ screen: 'pitch', needed: 'A phone action bar' }),
      gap({ screen: 'leads', needed: 'a phone  action-bar.' }),
    ]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].screenCount).toBe(2);
    expect(ranked[0].id).toBeNull();
  });

  it('is empty for no gaps', () => {
    expect(aggregateGaps([])).toEqual([]);
  });

  it('does not mutate its input', () => {
    const copy = structuredClone(gaps);
    aggregateGaps(gaps);
    expect(gaps).toEqual(copy);
  });
});

describe('collectGapLogs: every direction under a runs/ directory', () => {
  const write = (root, date, dirId, content) => {
    const dir = path.join(root, date, dirId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'gaps.json'), JSON.stringify(content));
  };

  it('reads <date>/<screen>-<A|B|C>/gaps.json for every direction', () => {
    const root = makeTmp();
    write(root, '2026-10-13', 'pitch-A', [gap({ screen: 'pitch', direction: 'A' })]);
    write(root, '2026-10-13', 'pitch-B', []);
    const r = collectGapLogs(root);
    expect(r.problems).toEqual([]);
    expect(r.logs.map((l) => l.id)).toEqual(['pitch-A', 'pitch-B']);
    expect(r.gaps).toHaveLength(1);
  });

  it('uses the newest date for a direction that was run twice, so a re-run is not double counted', () => {
    const root = makeTmp();
    write(root, '2026-10-13', 'pitch-A', [gap({ screen: 'pitch', direction: 'A', id: 'old' })]);
    write(root, '2026-10-20', 'pitch-A', [gap({ screen: 'pitch', direction: 'A', id: 'new' })]);
    const r = collectGapLogs(root);
    expect(r.gaps.map((g) => g.id)).toEqual(['new']);
  });

  it('reports an invalid log by direction and keeps its gaps out of the ranking', () => {
    const root = makeTmp();
    write(root, '2026-10-13', 'pitch-A', [{ screen: 'pitch' }]);
    write(root, '2026-10-13', 'leads-B', [gap({ screen: 'leads', direction: 'B' })]);
    const r = collectGapLogs(root);
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0]).toMatchObject({ id: 'pitch-A', date: '2026-10-13' });
    expect(r.gaps.map((g) => g.screen)).toEqual(['leads']);
  });

  it('reports a gaps.json that is not JSON', () => {
    const root = makeTmp();
    const dir = path.join(root, '2026-10-13', 'pitch-A');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'gaps.json'), '{ nope');
    const r = collectGapLogs(root);
    expect(r.problems[0].problems.join('\n')).toMatch(/not valid JSON/);
  });

  it('ignores a directory that is not <screen>-<A|B|C> and a date folder that is not a date', () => {
    const root = makeTmp();
    write(root, '2026-10-13', 'scratch', []);
    write(root, 'notes', 'pitch-A', []);
    expect(collectGapLogs(root)).toEqual({ logs: [], gaps: [], problems: [] });
  });

  it('is empty for a runs directory that does not exist', () => {
    expect(collectGapLogs(path.join(makeTmp(), 'missing'))).toEqual({
      logs: [],
      gaps: [],
      problems: [],
    });
  });
});
