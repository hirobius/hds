/**
 * scripts/upgrade/build-ledger.mjs (hds#447, hds#450): builds the ledger of a
 * release that shipped before ledgers existed from inputs frozen with it, the
 * two release snapshots and upgrade/sources/<version>/, and nothing else, so a
 * later edit to a live file (the CHANGELOG, a codemod's data) can never
 * rewrite a shipped ledger.
 *
 * The fixture release below is written out by hand, and so is the ledger it
 * must produce: the expected steps are read off the fixture, not recomputed.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLedger, readSources, sourceVersions } from '../upgrade/build-ledger.mjs';
import { formatJson } from '../upgrade/format.mjs';
import { releaseVersions } from '../upgrade/history.mjs';
import { changelogSource } from '../upgrade/ledger.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const CLI = join(REPO, 'scripts/upgrade/build-ledger.mjs');
const PKG = '@hirobius/design-system';

const temps = [];
afterEach(() => {
  while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
});

function snapshot(version, entries, dependencies = {}, peerDependencies = {}) {
  return {
    format: 1,
    name: PKG,
    version,
    entries,
    exportsKeys: Object.keys(entries).sort(),
    dependencies,
    peerDependencies,
    engines: { node: '>=20' },
    bin: {},
    files: ['dist'],
  };
}

const PREV = snapshot(
  '1.0.0',
  {
    '.': {
      Box: 'src/box',
      Button: 'src/button',
      Chart: 'src/chart',
      HdsBox: 'src/box',
      Page: 'src/page',
      Tile: 'src/tile',
      buttonVariants: 'src/button',
    },
    './patterns': {},
  },
  { lodash: '^4.0.0' },
);
const NEXT = snapshot('1.1.0', {
  '.': { Box: 'src/box', Button: 'src/button', Grid: 'src/grid' },
  './patterns': { Page: 'src/page' },
});

const RELEASE = {
  $comment: 'A fixture release.',
  version: '1.1.0',
  previous: '1.0.0',
  date: '2026-10-01',
  summary: 'Page moves to /patterns; Chart, Tile and HdsBox go.',
  backfilled: true,
  names: {
    moved: {
      from: '.',
      to: './patterns',
      plain: `{name} is no longer exported from the package root; import it from ${PKG}/patterns instead.`,
      auto: 'hds-move',
    },
    renamed: {
      data: 'renames.json',
      plain:
        '{name} is removed from the package root; use {to}, the same component under its bare name.',
      auto: 'hds-rename',
      source: 'codemods/rename.mjs',
    },
    folded: {
      data: 'removed.json',
      plain: '{name} is removed; use {to} instead.',
      auto: { Tile: 'hds-tile' },
      source: 'codemods/removed-1.1.json',
    },
    removed: {
      data: 'removed.json',
      plain:
        '{name} is removed with no drop-in replacement, so rewrite or delete the code that imports it.',
      privatePlain:
        "{name} is no longer exported, so style its component through the component's props instead.",
      source: 'codemods/removed-1.1.json',
    },
  },
  steps: [
    {
      kind: 'look',
      each: ['Card', 'Dialog'],
      subject: '{name}-shadow',
      impact: 'look',
      plain: '{name} casts a softer shadow.',
      detect: { jsx: ['{name}'] },
      needle: 'softer shadow',
      source: 'CHANGELOG.md:7',
    },
    {
      kind: 'deprecated',
      each: { HdsBox: 'Box' },
      subject: '{name}-gap',
      impact: 'none',
      removeIn: '2.0.0',
      plain: "{name}'s gap prop is deprecated; use {to}'s gap instead.",
      detect: { regex: ['<{name}\\b[^>]*\\sgap='] },
      needle: 'gap prop',
      source: 'CHANGELOG.md:9',
    },
    {
      kind: 'behavior',
      subject: 'Button-keys',
      impact: 'behavior',
      plain: 'Button no longer toggles on Enter.',
      detect: { jsx: ['Button'] },
      source: 'MIGRATIONS.md',
    },
  ],
};

const DATA = {
  'removed.json': {
    $comment: 'A frozen copy of the release codemod data.',
    release: '1.1.0',
    modules: { 'src/chart.tsx': ['Chart'], 'src/button.tsx': ['buttonVariants'] },
    replaced: { 'src/tile.tsx': { Tile: 'Grid' } },
  },
  'renames.json': { $comment: 'A frozen rename map.', renames: { HdsBox: 'Box' } },
};

/** A temp repo with only the snapshots and the frozen sources: no CHANGELOG, no codemods. */
function fixtureRepo({ prev = PREV, next = NEXT, release = RELEASE, data = DATA } = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'hds-build-ledger-'));
  temps.push(repo);
  const write = (rel, value) => {
    mkdirSync(dirname(join(repo, rel)), { recursive: true });
    writeFileSync(join(repo, rel), JSON.stringify(value, null, 2));
  };
  write(`docs/api/releases/${prev.version}.json`, prev);
  write(`docs/api/releases/${next.version}.json`, next);
  write(`upgrade/sources/${release.version}/release.json`, release);
  for (const [file, value] of Object.entries(data)) {
    write(`upgrade/sources/${release.version}/${file}`, value);
  }
  return repo;
}

const imports = (from, name) => ({ imports: [{ from, names: [name] }] });
const DIFF = 'snapshot diff 1.0.0..1.1.0';

const EXPECTED = {
  version: '1.1.0',
  date: '2026-10-01',
  bump: 'minor',
  summary: 'Page moves to /patterns; Chart, Tile and HdsBox go.',
  backfilled: true,
  steps: [
    {
      id: '1.1.0/removed/Chart',
      kind: 'removed',
      impact: 'breaking',
      plain:
        'Chart is removed with no drop-in replacement, so rewrite or delete the code that imports it.',
      detect: imports(PKG, 'Chart'),
      facts: ['removed:.:Chart'],
      source: 'codemods/removed-1.1.json',
    },
    {
      id: '1.1.0/removed/buttonVariants',
      kind: 'removed',
      impact: 'breaking',
      plain:
        "buttonVariants is no longer exported, so style its component through the component's props instead.",
      detect: imports(PKG, 'buttonVariants'),
      facts: ['removed:.:buttonVariants'],
      source: 'codemods/removed-1.1.json',
    },
    {
      id: '1.1.0/moved/Page',
      kind: 'moved',
      impact: 'breaking',
      plain: `Page is no longer exported from the package root; import it from ${PKG}/patterns instead.`,
      auto: { codemod: 'hds-move', args: [] },
      detect: imports(PKG, 'Page'),
      facts: ['moved:.:Page'],
      source: DIFF,
    },
    {
      id: '1.1.0/renamed/HdsBox',
      kind: 'renamed',
      impact: 'breaking',
      plain:
        'HdsBox is removed from the package root; use Box, the same component under its bare name.',
      auto: { codemod: 'hds-rename', args: [] },
      detect: imports(PKG, 'HdsBox'),
      facts: ['removed:.:HdsBox'],
      source: 'codemods/rename.mjs',
    },
    {
      id: '1.1.0/folded/Tile',
      kind: 'folded',
      impact: 'breaking',
      plain: 'Tile is removed; use Grid instead.',
      auto: { codemod: 'hds-tile', args: [] },
      detect: imports(PKG, 'Tile'),
      facts: ['removed:.:Tile'],
      source: 'codemods/removed-1.1.json',
    },
    {
      id: '1.1.0/deprecated/HdsBox-gap',
      kind: 'deprecated',
      impact: 'none',
      plain: "HdsBox's gap prop is deprecated; use Box's gap instead.",
      detect: { regex: ['<HdsBox\\b[^>]*\\sgap='] },
      removeIn: '2.0.0',
      backfilled: true,
      source: 'CHANGELOG.md:9',
    },
    {
      id: '1.1.0/look/Card-shadow',
      kind: 'look',
      impact: 'look',
      plain: 'Card casts a softer shadow.',
      detect: { jsx: ['Card'] },
      backfilled: true,
      source: 'CHANGELOG.md:7',
    },
    {
      id: '1.1.0/look/Dialog-shadow',
      kind: 'look',
      impact: 'look',
      plain: 'Dialog casts a softer shadow.',
      detect: { jsx: ['Dialog'] },
      backfilled: true,
      source: 'CHANGELOG.md:7',
    },
    {
      id: '1.1.0/behavior/Button-keys',
      kind: 'behavior',
      impact: 'behavior',
      plain: 'Button no longer toggles on Enter.',
      detect: { jsx: ['Button'] },
      source: 'MIGRATIONS.md',
    },
    {
      id: '1.1.0/dependency/lodash',
      kind: 'dependency',
      impact: 'breaking',
      plain:
        'HDS no longer installs lodash, so add it to your own dependencies if your code imports it.',
      detect: { bareImports: ['lodash'] },
      range: '^4.0.0',
      facts: ['dependency-removed:lodash'],
      source: DIFF,
    },
  ],
};

describe('buildLedger', () => {
  it('builds a release from its two snapshots and upgrade/sources alone (the fixture repo has no CHANGELOG or codemods)', () => {
    expect(buildLedger('1.1.0', { repo: fixtureRepo() })).toEqual(EXPECTED);
  });

  it('writes fields in schema order, so the committed bytes are stable', () => {
    const text = formatJson(buildLedger('1.1.0', { repo: fixtureRepo() }));
    expect(text).toBe(formatJson(EXPECTED));
  });

  it('refuses a removed name that no rule classifies, naming it', () => {
    const prev = {
      ...PREV,
      entries: { ...PREV.entries, '.': { ...PREV.entries['.'], Mystery: 'src/m' } },
    };
    expect(() => buildLedger('1.1.0', { repo: fixtureRepo({ prev }) })).toThrow(
      /Mystery left \. in 1\.1\.0, but no rule in upgrade\/sources\/1\.1\.0 classifies it/,
    );
  });

  it('refuses a fact that needs a step and has none, naming the fact', () => {
    const prev = { ...PREV, peerDependencies: { react: { range: '^18.0.0', optional: false } } };
    const next = { ...NEXT, peerDependencies: { react: { range: '^19.0.0', optional: false } } };
    expect(() => buildLedger('1.1.0', { repo: fixtureRepo({ prev, next }) })).toThrow(
      /facts with no step: peer-changed:react/,
    );
  });

  it('accepts a hand step that lists such a fact', () => {
    const prev = { ...PREV, peerDependencies: { react: { range: '^18.0.0', optional: false } } };
    const next = { ...NEXT, peerDependencies: { react: { range: '^19.0.0', optional: false } } };
    const peer = {
      kind: 'peer',
      subject: 'react',
      impact: 'breaking',
      plain: 'HDS now needs React 19.',
      range: '^18.0.0',
      facts: ['peer-changed:react'],
      needle: 'React 19',
      source: 'CHANGELOG.md:11',
    };
    const release = { ...RELEASE, steps: [...RELEASE.steps, peer] };
    const ledger = buildLedger('1.1.0', { repo: fixtureRepo({ prev, next, release }) });
    expect(ledger.steps.find((s) => s.id === '1.1.0/peer/react').facts).toEqual([
      'peer-changed:react',
    ]);
  });

  it('refuses a step that lists a fact the diff does not have', () => {
    const stale = { ...RELEASE.steps[2], facts: ['removed:.:Nope'] };
    const release = { ...RELEASE, steps: [RELEASE.steps[0], RELEASE.steps[1], stale] };
    expect(() => buildLedger('1.1.0', { repo: fixtureRepo({ release }) })).toThrow(
      /1\.1\.0\/behavior\/Button-keys lists removed:\.:Nope, which the 1\.0\.0 -> 1\.1\.0 diff does not have/,
    );
  });

  it('refuses a CHANGELOG citation without the needle it was found by', () => {
    const { needle: _needle, ...bare } = RELEASE.steps[0];
    const release = { ...RELEASE, steps: [bare] };
    expect(() => buildLedger('1.1.0', { repo: fixtureRepo({ release }) })).toThrow(
      /look\/\{name\}-shadow cites CHANGELOG\.md:7 with no needle/,
    );
  });
});

describe('the committed ledgers (upgrade/releases) and their sources (upgrade/sources)', () => {
  it('builds every ledger that has sources byte for byte, and build-ledger.mjs --check agrees', () => {
    const versions = sourceVersions();
    expect(versions).toContain('0.20.0');
    for (const version of versions) {
      expect(readFileSync(join(REPO, `upgrade/releases/${version}.json`), 'utf8'), version).toBe(
        formatJson(buildLedger(version)),
      );
    }
    const check = spawnSync(process.execPath, [CLI, '--check'], { encoding: 'utf8' });
    expect(check.status, check.stderr).toBe(0);
  });

  it('has frozen sources for every backfilled ledger', () => {
    const backfilled = releaseVersions(join(REPO, 'upgrade/releases')).filter(
      (v) => JSON.parse(readFileSync(join(REPO, `upgrade/releases/${v}.json`), 'utf8')).backfilled,
    );
    expect(sourceVersions()).toEqual(backfilled);
  });

  it('cites each CHANGELOG line that its needle still finds in that release section', () => {
    const changelog = readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8');
    for (const version of sourceVersions()) {
      for (const step of readSources(version).release.steps) {
        if (!step.source.startsWith('CHANGELOG.md:')) continue;
        expect(changelogSource(changelog, version, step.needle), `${version} ${step.subject}`).toBe(
          step.source,
        );
      }
    }
  });
});

describe('build-ledger.mjs CLI', () => {
  it('--check exits 1 and names the ledger when a committed file is stale', () => {
    const repo = fixtureRepo();
    mkdirSync(join(repo, 'upgrade/releases'), { recursive: true });
    writeFileSync(join(repo, 'upgrade/releases/1.1.0.json'), '{}\n');
    const res = spawnSync(process.execPath, [CLI, '--check', '--repo', repo, '1.1.0'], {
      encoding: 'utf8',
    });
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('upgrade/releases/1.1.0.json');
  });

  it('writes the ledger, after which --check passes', () => {
    const repo = fixtureRepo();
    expect(spawnSync(process.execPath, [CLI, '--repo', repo], { encoding: 'utf8' }).status).toBe(0);
    expect(readFileSync(join(repo, 'upgrade/releases/1.1.0.json'), 'utf8')).toBe(
      formatJson(EXPECTED),
    );
    const res = spawnSync(process.execPath, [CLI, '--check', '--repo', repo], { encoding: 'utf8' });
    expect(res.status, res.stderr).toBe(0);
  });

  it('rejects an unknown flag with usage', () => {
    const res = spawnSync(process.execPath, [CLI, '--chek'], { encoding: 'utf8' });
    expect(res.status).toBe(2);
    expect(res.stderr).toMatch(/usage/);
  });
});
