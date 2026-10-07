/**
 * scripts/upgrade/history.mjs (hds#450): the release history the upgrade
 * command walks. The oldest committed snapshot (docs/api/releases) is the
 * floor; every later snapshot has a ledger (upgrade/releases), and every fact
 * between two consecutive snapshots that needs a step is listed by a step of
 * the newer release's ledger.
 *
 * The fixtures are tiny hand-written snapshots and ledgers in a temp dir, so
 * each expected problem is read off the fixture, not recomputed.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { floor, historyProblems, releaseVersions } from '../upgrade/history.mjs';
import { compareVersions } from '../upgrade/schema.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');

const temps = [];
afterEach(() => {
  while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
});

function snapshot(version, entries, extra = {}) {
  return {
    format: 1,
    name: '@hirobius/design-system',
    version,
    entries,
    exportsKeys: Object.keys(entries).sort(),
    dependencies: {},
    peerDependencies: {},
    engines: { node: '>=20' },
    bin: {},
    files: ['dist'],
    ...extra,
  };
}

function ledger(version, bump, steps = []) {
  return { version, date: '2026-10-01', bump, summary: 'Test.', backfilled: true, steps };
}

/** A temp repo holding the given snapshots and ledgers. */
function history({ snapshots, ledgers }) {
  const root = mkdtempSync(join(tmpdir(), 'hds-history-'));
  temps.push(root);
  const snapshotsDir = join(root, 'snapshots');
  const ledgersDir = join(root, 'ledgers');
  mkdirSync(snapshotsDir);
  mkdirSync(ledgersDir);
  for (const snap of snapshots) {
    writeFileSync(join(snapshotsDir, `${snap.version}.json`), JSON.stringify(snap));
  }
  for (const led of ledgers) {
    writeFileSync(join(ledgersDir, `${led.version}.json`), JSON.stringify(led));
  }
  return { snapshotsDir, ledgersDir };
}

const V1 = snapshot('1.0.0', { '.': { Foo: 'm/foo', Bar: 'm/bar' } });
const V2 = snapshot('1.1.0', { '.': { Bar: 'm/bar', Baz: 'm/baz' } });

const removedFoo = {
  id: '1.1.0/removed/Foo',
  kind: 'removed',
  impact: 'breaking',
  plain: 'Foo is removed.',
  facts: ['removed:.:Foo'],
  source: 'test',
};

describe('historyProblems', () => {
  it('passes when every fact that needs a step is listed by a step; additions need none', () => {
    const dirs = history({
      snapshots: [V1, V2],
      ledgers: [ledger('1.1.0', 'minor', [removedFoo])],
    });
    expect(historyProblems(dirs)).toEqual([]);
  });

  it('fails when an export removed between two consecutive snapshots has no step', () => {
    const dirs = history({ snapshots: [V1, V2], ledgers: [ledger('1.1.0', 'minor')] });
    expect(historyProblems(dirs)).toEqual([
      '1.1.0: removed:.:Foo (1.0.0 -> 1.1.0) has no step in upgrade/releases/1.1.0.json',
    ]);
  });

  it('fails when an export moved to another entry has no step', () => {
    const before = snapshot('2.0.0', { '.': { Page: 'm/page' }, './patterns': {} });
    const after = snapshot('2.1.0', { '.': {}, './patterns': { Page: 'm/page' } });
    const dirs = history({ snapshots: [before, after], ledgers: [ledger('2.1.0', 'minor')] });
    expect(historyProblems(dirs)).toEqual([
      '2.1.0: moved:.:Page (2.0.0 -> 2.1.0) has no step in upgrade/releases/2.1.0.json',
    ]);
  });

  it('checks every consecutive pair, not only the newest', () => {
    const v3 = snapshot('1.2.0', { '.': { Baz: 'm/baz' } });
    const dirs = history({
      snapshots: [V1, V2, v3],
      ledgers: [ledger('1.1.0', 'minor'), ledger('1.2.0', 'minor')],
    });
    expect(historyProblems(dirs)).toEqual([
      '1.1.0: removed:.:Foo (1.0.0 -> 1.1.0) has no step in upgrade/releases/1.1.0.json',
      '1.2.0: removed:.:Bar (1.1.0 -> 1.2.0) has no step in upgrade/releases/1.2.0.json',
    ]);
  });

  it('fails when a dependency, peer, engine, exports key or bin goes with no step', () => {
    const before = snapshot(
      '3.0.0',
      { '.': {} },
      {
        dependencies: { lodash: '^4.0.0' },
        peerDependencies: { react: { range: '^18.0.0', optional: false } },
        bin: { 'hds-x': 'codemods/x.mjs' },
        exportsKeys: ['.', './old.css'],
      },
    );
    const after = snapshot(
      '3.1.0',
      { '.': {} },
      {
        peerDependencies: { react: { range: '^19.0.0', optional: false } },
        engines: { node: '>=22' },
      },
    );
    const dirs = history({ snapshots: [before, after], ledgers: [ledger('3.1.0', 'minor')] });
    expect(historyProblems(dirs).map((p) => p.split(' ')[1])).toEqual([
      'exports-key-removed:./old.css',
      'dependency-removed:lodash',
      'peer-changed:react',
      'engines-changed:node',
      'bin-removed:hds-x',
    ]);
  });

  it('fails when a snapshot after the floor has no ledger', () => {
    const dirs = history({ snapshots: [V1, V2], ledgers: [] });
    expect(historyProblems(dirs)).toEqual([
      '1.1.0: docs/api/releases/1.1.0.json has no ledger upgrade/releases/1.1.0.json',
    ]);
  });

  it('fails when a ledger has no snapshot, or names the wrong bump', () => {
    const dirs = history({
      snapshots: [V1, V2],
      ledgers: [ledger('1.1.0', 'patch', [removedFoo]), ledger('1.2.0', 'minor')],
    });
    expect(historyProblems(dirs)).toEqual([
      '1.1.0: bump is patch, but 1.0.0 -> 1.1.0 is a minor',
      '1.2.0: upgrade/releases/1.2.0.json has no snapshot docs/api/releases/1.2.0.json',
    ]);
  });

  it('fails when a step lists a fact the snapshot diff does not have', () => {
    const stale = { ...removedFoo, facts: ['removed:.:Foo', 'removed:.:Qux'] };
    const dirs = history({ snapshots: [V1, V2], ledgers: [ledger('1.1.0', 'minor', [stale])] });
    expect(historyProblems(dirs)).toEqual([
      '1.1.0: step 1.1.0/removed/Foo lists removed:.:Qux, which is not in the 1.0.0 -> 1.1.0 diff',
    ]);
  });
});

describe('floor and releaseVersions', () => {
  it('lists versions oldest first, by semver rather than by file name', () => {
    const dirs = history({
      snapshots: [snapshot('0.10.0', {}), snapshot('0.9.0', {}), snapshot('0.10.1', {})],
      ledgers: [],
    });
    expect(releaseVersions(dirs.snapshotsDir)).toEqual(['0.9.0', '0.10.0', '0.10.1']);
    expect(floor(dirs.snapshotsDir)).toBe('0.9.0');
  });
});

describe('the committed history (docs/api/releases, upgrade/releases)', () => {
  // Starts with, not equals: `changeset version` writes each new release's
  // snapshot and ledger (hds#451), so the list grows with every release.
  it('starts at the 0.16.0 floor, and every later release has a ledger that covers its diff', () => {
    expect(floor()).toBe('0.16.0');
    expect(releaseVersions().slice(0, 6)).toEqual([
      '0.16.0',
      '0.17.0',
      '0.18.0',
      '0.19.0',
      '0.19.1',
      '0.20.0',
    ]);
    expect(historyProblems()).toEqual([]);
  });
});

// historyProblems() reads only committed snapshots, so a release that shipped
// with neither snapshot nor ledger (0.21.0 did) is invisible to it. The list of
// what npm published is what it is checked against: upgrade/published.json,
// updated by hand when a release publishes until hds#451 does it.
describe('every published release (upgrade/published.json)', () => {
  const { versions } = JSON.parse(readFileSync(join(REPO, 'upgrade/published.json'), 'utf8'));
  const has = (rel) => existsSync(join(REPO, rel));

  it("is npm's version list, oldest first, through 0.21.0", () => {
    expect([...versions].sort(compareVersions)).toEqual(versions);
    expect(new Set(versions).size).toBe(versions.length);
    expect(versions).toEqual(expect.arrayContaining(['0.16.0', '0.20.0', '0.21.0']));
  });

  it('has a snapshot and a ledger for each release after the 0.16.0 floor, and a snapshot for the floor', () => {
    const missing = [];
    for (const version of versions.filter((v) => !v.includes('-'))) {
      if (compareVersions(version, floor()) < 0) continue;
      if (!has(`docs/api/releases/${version}.json`))
        missing.push(`docs/api/releases/${version}.json`);
      if (version !== floor() && !has(`upgrade/releases/${version}.json`)) {
        missing.push(`upgrade/releases/${version}.json`);
      }
    }
    expect(missing).toEqual([]);
    expect(floor()).toBe('0.16.0');
  });

  it('lists every committed snapshot, so none records a version npm never published', () => {
    for (const version of releaseVersions()) expect(versions, version).toContain(version);
  });
});
