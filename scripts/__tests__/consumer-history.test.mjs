/**
 * Tests for scripts/lib/consumer-history.mjs (hds#658): the monthly adoption
 * ledger is sampled from real git history, one row per UTC month.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertTagsCurrent,
  countRawControls,
  hdsVersionAt,
  latestHarnessEntry,
  measureHistory,
  monthsBetween,
  readHdsTags,
  upsertHistory,
} from '../lib/consumer-history.mjs';

function sh(cwd, args, date) {
  const env = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', HOME: cwd };
  if (date) Object.assign(env, { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date });
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', env }).trim();
}

function initRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'hds-hist-'));
  sh(dir, ['init', '-q', '-b', 'main']);
  sh(dir, ['config', 'user.email', 't@example.com']);
  sh(dir, ['config', 'user.name', 't']);
  sh(dir, ['config', 'commit.gpgsign', 'false']);
  sh(dir, ['config', 'tag.gpgsign', 'false']);
  return dir;
}

function commit(dir, files, date) {
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(dir, rel, '..'), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  sh(dir, ['add', '-A']);
  sh(dir, ['commit', '-q', '-m', `at ${date}`], date);
  return sh(dir, ['rev-parse', 'HEAD']);
}

const pkg = (range) =>
  JSON.stringify({ name: 'app', dependencies: { '@hirobius/design-system': range } });

describe('monthsBetween', () => {
  it('ends each month at the next month start in UTC and rolls December into January', () => {
    const months = monthsBetween('2026-11', new Date('2027-01-05T00:00:00Z'));
    expect(months).toEqual([
      { month: '2026-11', end: '2026-12-01T00:00:00Z' },
      { month: '2026-12', end: '2027-01-01T00:00:00Z' },
      { month: '2027-01', end: '2027-02-01T00:00:00Z' },
    ]);
  });
});

describe('countRawControls', () => {
  it('counts lowercase tags in .tsx only, never <Button', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hds-raw-'));
    try {
      writeFileSync(join(dir, 'a.tsx'), '<button/><Button/><input /><inputs/><table>');
      writeFileSync(join(dir, 'b.ts'), '<button/>');
      expect(countRawControls(dir)).toEqual({
        button: 1,
        input: 1,
        select: 0,
        textarea: 0,
        table: 1,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('hds tags', () => {
  const at = (iso) => Date.parse(iso) / 1000;
  const tags = [
    { tag: 'v0.10.0', version: [0, 10, 0], at: at('2026-07-02T00:00:00Z') },
    { tag: 'v0.12.0', version: [0, 12, 0], at: at('2026-08-05T00:00:00Z') },
    { tag: 'v0.11.1', version: [0, 11, 1], at: at('2026-08-06T00:00:00Z') },
  ];

  it('picks the highest semver dated before the month ends, not the newest tag', () => {
    expect(hdsVersionAt(tags, '2026-08-01T00:00:00Z')).toBe('0.10.0');
    expect(hdsVersionAt(tags, '2026-09-01T00:00:00Z')).toBe('0.12.0');
    expect(hdsVersionAt(tags, '2026-07-01T00:00:00Z')).toBeNull();
  });

  it('fails loud when tags are missing or behind package.json', () => {
    expect(() => assertTagsCurrent([], '0.12.0')).toThrow(/git fetch --tags/);
    expect(() => assertTagsCurrent(tags, '0.13.0')).toThrow(
      /behind package.json 0.13.0.*git fetch --tags/,
    );
    expect(() => assertTagsCurrent(tags, '0.12.0')).not.toThrow();
  });

  it('reads annotated v* tags with their dates', () => {
    const dir = initRepo();
    try {
      commit(dir, { 'package.json': '{}' }, '2026-07-01T12:00:00Z');
      sh(dir, ['tag', '-a', 'v0.1.0', '-m', 'x'], '2026-07-02T00:00:00Z');
      sh(dir, ['tag', 'not-a-release']);
      expect(readHdsTags(dir)).toEqual([
        { tag: 'v0.1.0', version: [0, 1, 0], at: at('2026-07-02T00:00:00Z') },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('measureHistory over a two-month fixture', () => {
  let app;
  let july;
  let august;
  const hdsTags = [
    { tag: 'v0.10.0', version: [0, 10, 0], at: Date.parse('2026-07-02T00:00:00Z') / 1000 },
    { tag: 'v0.12.0', version: [0, 12, 0], at: Date.parse('2026-08-05T00:00:00Z') / 1000 },
  ];
  // Stand-in for measureConsumer: one "file" per src/*.tsx.
  const measure = (dir) => {
    const n = execFileSync('ls', [join(dir, 'src')], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean).length;
    return { files: n, components: n * 10 };
  };

  beforeAll(() => {
    app = initRepo();
    commit(app, { 'package.json': pkg('^0.8.0') }, '2026-05-20T12:00:00Z');
    commit(app, { 'package.json': pkg('^0.9.0') }, '2026-06-20T12:00:00Z');
    july = commit(
      app,
      {
        'package.json': pkg('^0.10.0'),
        'src/a.tsx': '<button>hi</button><input />',
        '.env.local': 'SECRET=1',
      },
      '2026-07-15T12:00:00Z',
    );
    // 07-31 evening Pacific is 08-01 in UTC: an August commit.
    commit(app, { 'src/b.tsx': '<select></select>' }, '2026-07-31T20:00:00-07:00');
    august = commit(
      app,
      { 'package.json': pkg('^0.12.0'), 'src/c.tsx': '<Button/>' },
      '2026-08-10T12:00:00Z',
    );
  });
  afterAll(() => rmSync(app, { recursive: true, force: true }));

  it('yields one row per month with counts, range, raw controls and hds version', () => {
    const out = measureHistory({
      root: app,
      ref: 'main',
      consumer: 'hirobius/ops',
      hdsTags,
      measure,
      now: new Date('2026-08-20T00:00:00Z'),
    });
    expect(out.consumer).toBe('hirobius/ops');
    expect(out.ref).toBe('main');
    expect(out.rows).toEqual([
      {
        month: '2026-07',
        commit: july,
        committedAt: '2026-07-15T12:00:00Z',
        files: 1,
        components: 10,
        rawControls: { button: 1, input: 1, select: 0, textarea: 0, table: 0 },
        versionRange: '^0.10.0',
        hdsVersion: '0.10.0',
      },
      {
        month: '2026-08',
        commit: august,
        committedAt: '2026-08-10T12:00:00Z',
        files: 3,
        components: 30,
        rawControls: { button: 1, input: 1, select: 1, textarea: 0, table: 0 },
        versionRange: '^0.12.0',
        hdsVersion: '0.12.0',
      },
    ]);
  });

  it('never exports anything but src and package.json', () => {
    const seen = [];
    measureHistory({
      root: app,
      ref: 'main',
      consumer: 'x',
      hdsTags,
      measure: (dir) => {
        seen.push(
          execFileSync('ls', ['-A', dir], { encoding: 'utf8' }).split('\n').filter(Boolean),
        );
        return { files: 0, components: 0 };
      },
      now: new Date('2026-07-20T00:00:00Z'),
    });
    expect(seen).toEqual([['package.json', 'src']]);
  });

  it('fails on a shallow clone cut inside the window, naming the fetch', () => {
    const shallow = mkdtempSync(join(tmpdir(), 'hds-shallow-'));
    try {
      execFileSync('git', ['clone', '-q', '--depth=1', `file://${app}`, shallow]);
      expect(() =>
        measureHistory({
          root: shallow,
          consumer: 'x',
          hdsTags,
          measure,
          now: new Date('2026-08-20'),
        }),
      ).toThrow(/shallow clone.*git fetch --depth=1000 origin main/);
    } finally {
      rmSync(shallow, { recursive: true, force: true });
    }
  });

  it('passes on a shallow clone deep enough to reach past July', () => {
    const deep = mkdtempSync(join(tmpdir(), 'hds-deep-'));
    try {
      execFileSync('git', ['clone', '-q', '--depth=4', `file://${app}`, deep]);
      // Shallow, with the boundary at the June commit: outside the window.
      expect(sh(deep, ['rev-parse', '--is-shallow-repository'])).toBe('true');
      const out = measureHistory({
        root: deep,
        consumer: 'x',
        hdsTags,
        measure,
        now: new Date('2026-08-20T00:00:00Z'),
      });
      expect(out.rows.map((r) => r.commit)).toEqual([july, august]);
    } finally {
      rmSync(deep, { recursive: true, force: true });
    }
  });

  it('fails when the ref has no commit before 2026-08-01', () => {
    const late = initRepo();
    try {
      commit(late, { 'src/a.tsx': '' }, '2026-08-10T12:00:00Z');
      expect(() =>
        measureHistory({
          root: late,
          ref: 'main',
          consumer: 'x',
          hdsTags,
          measure,
          now: new Date('2026-08-20'),
        }),
      ).toThrow(/no commit before 2026-08-01/);
    } finally {
      rmSync(late, { recursive: true, force: true });
    }
  });

  it('records a month with no src/ as files: null, not 0', () => {
    const bare = initRepo();
    try {
      commit(bare, { 'package.json': pkg('^0.10.0') }, '2026-07-10T00:00:00Z');
      const out = measureHistory({
        root: bare,
        ref: 'main',
        consumer: 'x',
        hdsTags,
        measure,
        now: new Date('2026-07-20T00:00:00Z'),
      });
      expect(out.rows[0]).toMatchObject({ files: null, components: null, rawControls: null });
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });
});

describe('upsertHistory and latestHarnessEntry', () => {
  it('replaces only the measured consumer and keeps order', () => {
    const a = { consumer: 'a', ref: 'r', rows: [1] };
    const b = { consumer: 'b', ref: 'r', rows: [2] };
    expect(upsertHistory([a, b], { ...a, rows: [9] })).toEqual([{ ...a, rows: [9] }, b]);
    expect(upsertHistory([a], b)).toEqual([a, b]);
    expect(upsertHistory(undefined, a)).toEqual([a]);
  });

  it('picks the last harness entry, skipping review entries', () => {
    const ledger = {
      entries: [
        { source: 'harness', date: '1' },
        { source: 'harness', date: '2' },
        { source: 'review' },
      ],
    };
    expect(latestHarnessEntry(ledger)).toEqual({ source: 'harness', date: '2' });
    expect(latestHarnessEntry({ entries: [] })).toBeNull();
  });
});
