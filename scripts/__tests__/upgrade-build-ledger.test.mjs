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
function fixtureRepo({
  prev = PREV,
  next = NEXT,
  release = RELEASE,
  data = DATA,
  notes = {},
} = {}) {
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
  for (const [name, value] of Object.entries(notes)) {
    write(`upgrade/sources/${release.version}/notes/${name}.json`, value);
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

// A release that shipped with upgrade notes (hds#448) but before the compiler
// (hds#451): its changesets' notes, upgrade/pending/<changeset>.json as
// `changeset version` left them, are frozen under notes/, and release.json
// cites each changeset's CHANGELOG entry. Their steps were written before the
// release, so they are not backfilled, and they carry over field for field.
describe('buildLedger from frozen upgrade notes', () => {
  const chartGone = {
    impact: 'breaking',
    plain: 'Chart is removed, so draw charts with your own library.',
    steps: [
      {
        id: 'removed/Chart',
        kind: 'removed',
        impact: 'breaking',
        plain: 'Chart is removed, so draw charts with your own library.',
        detect: { imports: [{ from: PKG, names: ['Chart'] }], jsx: ['Chart'] },
        facts: ['removed:.:Chart'],
      },
    ],
  };
  const fontsOptIn = {
    impact: 'look',
    plain: 'Add the fonts.css import, or text renders in the system font.',
    steps: [
      {
        id: 'manual/fonts-css',
        kind: 'manual',
        impact: 'look',
        plain: 'Add the fonts.css import, or text renders in the system font.',
        detect: { regex: ['@hirobius/design-system/tokens\\.css[\'"]'] },
        done: { regex: ['@hirobius/design-system/fonts\\.css[\'"]'] },
        source: 'MIGRATIONS.md',
      },
    ],
  };
  const coreFlag = { impact: 'additive', plain: 'The manifest marks the core set.' };
  const NOTES = { 'drop-chart': chartGone, 'fonts-opt-in': fontsOptIn, 'core-flag': coreFlag };
  const CITES = {
    'drop-chart': { needle: 'abc1234: Chart', source: 'CHANGELOG.md:12' },
    'fonts-opt-in': { needle: 'def5678: Fonts', source: 'CHANGELOG.md:14' },
    'core-flag': { needle: 'fed4321: Core', source: 'CHANGELOG.md:16' },
  };
  // Chart is the note's to explain: the frozen codemod data leaves it out, so
  // no name rule classifies it. The other names still go through the rules.
  const release = { ...RELEASE, notes: CITES };
  const data = {
    ...DATA,
    'removed.json': { ...DATA['removed.json'], modules: { 'src/button.tsx': ['buttonVariants'] } },
  };

  it('carries each note step over with its version and its changeset entry, not backfilled', () => {
    const ledger = buildLedger('1.1.0', { repo: fixtureRepo({ release, data, notes: NOTES }) });
    expect(ledger.steps.find((step) => step.id === '1.1.0/removed/Chart')).toEqual({
      id: '1.1.0/removed/Chart',
      kind: 'removed',
      impact: 'breaking',
      plain: 'Chart is removed, so draw charts with your own library.',
      detect: { imports: [{ from: PKG, names: ['Chart'] }], jsx: ['Chart'] },
      facts: ['removed:.:Chart'],
      source: 'CHANGELOG.md:12',
    });
    // A step's own source wins over its note's citation; done carries over.
    expect(ledger.steps.find((step) => step.id === '1.1.0/manual/fonts-css')).toEqual({
      id: '1.1.0/manual/fonts-css',
      kind: 'manual',
      impact: 'look',
      plain: 'Add the fonts.css import, or text renders in the system font.',
      detect: { regex: ['@hirobius/design-system/tokens\\.css[\'"]'] },
      done: { regex: ['@hirobius/design-system/fonts\\.css[\'"]'] },
      source: 'MIGRATIONS.md',
    });
  });

  it('lets the note explain the facts it lists, so no name rule has to classify them', () => {
    const ledger = buildLedger('1.1.0', { repo: fixtureRepo({ release, data, notes: NOTES }) });
    const chart = ledger.steps.filter((step) => step.facts?.includes('removed:.:Chart'));
    expect(chart.map((step) => step.id)).toEqual(['1.1.0/removed/Chart']);
    // The other names still go through the rules.
    expect(ledger.steps.map((step) => step.id)).toEqual(
      expect.arrayContaining(['1.1.0/removed/buttonVariants', '1.1.0/moved/Page']),
    );
  });

  it('adds no step for a note that has none, and refuses a frozen note release.json does not cite', () => {
    const ledger = buildLedger('1.1.0', { repo: fixtureRepo({ release, data, notes: NOTES }) });
    const { 'core-flag': _core, ...stepped } = NOTES;
    const { 'core-flag': _cite, ...steppedCites } = CITES;
    const without = { ...release, notes: steppedCites };
    expect(
      buildLedger('1.1.0', { repo: fixtureRepo({ release: without, data, notes: stepped }) }),
    ).toEqual(ledger);
    expect(() =>
      buildLedger('1.1.0', { repo: fixtureRepo({ release: without, data, notes: NOTES }) }),
    ).toThrow(/notes\/core-flag\.json is not cited/);
  });

  // A hand-written look or behavior note often has no step: `pnpm upgrade:note`
  // writes steps only for diff facts. Its plain line is the change, so the
  // ledger records it as one step rather than dropping it.
  it('records the plain line of a look, behavior or breaking note with no steps as one step', () => {
    const plain = {
      tooltip: 'Tooltip now opens after 300ms, so update tests that expect it at once.',
      shadow: 'Card has a softer shadow.',
      select: 'Select fires onChange once per pick, so remove any dedupe you added.',
    };
    const notes = {
      ...NOTES,
      tooltip: { impact: 'behavior', plain: plain.tooltip },
      shadow: { impact: 'look', plain: plain.shadow },
      select: { impact: 'breaking', plain: plain.select },
    };
    const cites = {
      ...CITES,
      tooltip: { needle: '1111111: Tooltip', source: 'CHANGELOG.md:18' },
      shadow: { needle: '2222222: Card', source: 'CHANGELOG.md:20' },
      select: { needle: '3333333: Select', source: 'CHANGELOG.md:22' },
    };
    const repo = fixtureRepo({ release: { ...release, notes: cites }, data, notes });
    const ledger = buildLedger('1.1.0', { repo });
    const own = ['/shadow', '/tooltip', '/select', '/core-flag'];
    expect(ledger.steps.filter((step) => own.some((end) => step.id.endsWith(end)))).toEqual([
      {
        id: '1.1.0/look/shadow',
        kind: 'look',
        impact: 'look',
        plain: plain.shadow,
        source: 'CHANGELOG.md:20',
      },
      {
        id: '1.1.0/behavior/tooltip',
        kind: 'behavior',
        impact: 'behavior',
        plain: plain.tooltip,
        source: 'CHANGELOG.md:18',
      },
      // No step kind says breaking: a breaking change with no step is a manual one.
      {
        id: '1.1.0/manual/select',
        kind: 'manual',
        impact: 'breaking',
        plain: plain.select,
        source: 'CHANGELOG.md:22',
      },
    ]);
  });

  it('refuses a note cited with no needle, a note file that is missing, and a note the schema rejects', () => {
    const bare = { ...release, notes: { ...CITES, 'drop-chart': { source: 'CHANGELOG.md:12' } } };
    expect(() =>
      buildLedger('1.1.0', { repo: fixtureRepo({ release: bare, data, notes: NOTES }) }),
    ).toThrow(/note drop-chart cites CHANGELOG\.md:12 with no needle/);
    const { 'fonts-opt-in': _fonts, ...missing } = NOTES;
    expect(() =>
      buildLedger('1.1.0', { repo: fixtureRepo({ release, data, notes: missing }) }),
    ).toThrow(/upgrade\/sources\/1\.1\.0\/notes\/fonts-opt-in\.json/);
    const todo = {
      ...NOTES,
      'core-flag': {
        impact: 'additive',
        plain: 'TODO: one sentence a consumer can act on, ending in a full stop.',
      },
    };
    expect(() =>
      buildLedger('1.1.0', { repo: fixtureRepo({ release, data, notes: todo }) }),
    ).toThrow(/notes\/core-flag\.json.*TODO/);
  });

  it('still refuses a note step listing a fact the diff does not have', () => {
    const stale = {
      ...NOTES,
      'drop-chart': {
        ...chartGone,
        steps: [{ ...chartGone.steps[0], facts: ['removed:.:Chart', 'removed:.:Nope'] }],
      },
    };
    expect(() =>
      buildLedger('1.1.0', { repo: fixtureRepo({ release, data, notes: stale }) }),
    ).toThrow(
      /1\.1\.0\/removed\/Chart lists removed:\.:Chart, removed:\.:Nope|lists removed:\.:Nope/,
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

  // Backfilled ledgers (0.17.0 to 0.21.0) and the ones compile.mjs --release
  // records at changeset version (hds#451) alike: every ledger is built from
  // inputs frozen with its release.
  it('has frozen sources for every ledger', () => {
    const ledgers = releaseVersions(join(REPO, 'upgrade/releases'));
    expect(ledgers).toEqual(expect.arrayContaining(['0.17.0', '0.20.0', '0.21.0']));
    expect(sourceVersions()).toEqual(ledgers);
  });

  it('cites each CHANGELOG line that its needle still finds in that release section', () => {
    const changelog = readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8');
    for (const version of sourceVersions()) {
      const { release } = readSources(version);
      const cites = [
        ...(release.steps ?? []).map((step) => [step.subject, step]),
        ...Object.entries(release.notes ?? {}),
      ];
      for (const [what, cite] of cites) {
        if (!cite.source.startsWith('CHANGELOG.md:')) continue;
        expect(changelogSource(changelog, version, cite.needle), `${version} ${what}`).toBe(
          cite.source,
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
