/**
 * scripts/upgrade/compile.mjs (hds#451): the release compiler. From the
 * committed ledgers (upgrade/releases/<version>.json) it generates
 * UPGRADING.md, upgrade/index.json and the `release` object of status.json,
 * and `--check` keeps all three byte-equal to what it would write. At
 * `changeset version` time (`--release`) it also records the new release:
 * its snapshot, its frozen notes and ledger, and an Upgrade block at the top
 * of its CHANGELOG section.
 *
 * Each case runs on a throwaway repo. The expected text is written out by
 * hand from the fixture ledgers, not recomputed the way the compiler does.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkUpgradeLedger } from '../check-upgrade-ledger.mjs';
import {
  LISTS,
  compileHistory,
  compileOutputs,
  releaseSections,
  upgradeBlock,
} from '../upgrade/compile.mjs';
import { formatJson } from '../upgrade/format.mjs';
import { Index } from '../upgrade/schema.mjs';
import { snapshotFromSource } from '../upgrade/snapshot.mjs';
import {
  cleanUpRepos,
  editPkg,
  note,
  releasedRepo,
  removeCallout,
} from './helpers/upgrade-repo.mjs';

const PKG = '@hirobius/design-system';
const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const CLI = join(REPO, 'scripts/upgrade/compile.mjs');
const run = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
const read = (root, rel) => readFileSync(join(root, rel), 'utf8');

const temps = [];
afterEach(() => {
  while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
  cleanUpRepos();
});

function write(root, rel, text) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
}
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

/** Steps of the fixture 0.11.0 release, one per list, in ledger order (kind, then id). */
const STEPS_0_11 = [
  {
    id: '0.11.0/removed/Chart',
    kind: 'removed',
    impact: 'breaking',
    plain: 'Chart is removed, so draw charts with your own library.',
    detect: { imports: [{ from: PKG, names: ['Chart'] }] },
    facts: ['removed:.:Chart'],
    source: 'CHANGELOG.md:7',
  },
  {
    id: '0.11.0/moved/Page',
    kind: 'moved',
    impact: 'breaking',
    plain: `Page is no longer exported from the package root; import it from ${PKG}/patterns instead.`,
    auto: { codemod: 'hds-move', args: [] },
    detect: { imports: [{ from: PKG, names: ['Page'] }] },
    facts: ['moved:.:Page'],
    source: 'snapshot diff 0.10.0..0.11.0',
  },
  {
    id: '0.11.0/deprecated/Tile',
    kind: 'deprecated',
    impact: 'none',
    plain: 'Tile still works but is deprecated; use Card instead.',
    detect: { imports: [{ from: PKG, names: ['Tile'] }] },
    removeIn: '1.0.0',
    source: 'CHANGELOG.md:9',
  },
  {
    id: '0.11.0/deprecated/space-names',
    kind: 'deprecated',
    impact: 'none',
    plain:
      "The spacing names 'tight' and 'loose' still work but are deprecated; use 'sm' and 'lg'.",
    detect: { regex: ["'(?:tight|loose)'"] },
    removeIn: '1.0.0',
    source: 'CHANGELOG.md:10',
  },
  {
    id: '0.11.0/look/Card-shadow',
    kind: 'look',
    impact: 'look',
    plain: 'Card has a softer shadow.',
    detect: { jsx: ['Card'] },
    source: 'CHANGELOG.md:11',
  },
  {
    id: '0.11.0/behavior/Alert-role',
    kind: 'behavior',
    impact: 'behavior',
    plain:
      'An info Alert now has role="status", so tests that find it by role must look for status.',
    detect: { jsx: ['Alert'] },
    source: 'CHANGELOG.md:12',
  },
  {
    id: '0.11.0/dependency/lodash',
    kind: 'dependency',
    impact: 'breaking',
    plain:
      'HDS no longer installs lodash, so add it to your own dependencies if your code imports it.',
    range: '^4.0.0',
    detect: { bareImports: ['lodash'] },
    facts: ['dependency-removed:lodash'],
    source: 'snapshot diff 0.10.0..0.11.0',
  },
];

const LEDGER_0_11 = {
  version: '0.11.0',
  date: '2026-10-01',
  bump: 'minor',
  summary: 'Page moves to /patterns and Chart is removed; Tile is deprecated.',
  backfilled: false,
  steps: STEPS_0_11,
};

/** 0.12.0 removes Tile, which 0.11.0 deprecated, so Tile is no longer Coming next. */
const LEDGER_0_12 = {
  version: '0.12.0',
  date: '2026-10-02',
  bump: 'minor',
  summary: 'Tile is removed.',
  backfilled: false,
  steps: [
    {
      id: '0.12.0/removed/Tile',
      kind: 'removed',
      impact: 'breaking',
      plain: 'Tile is removed, so use Card instead.',
      detect: { imports: [{ from: PKG, names: ['Tile'] }] },
      facts: ['removed:.:Tile'],
      source: 'CHANGELOG.md:7',
    },
    {
      id: '0.12.0/deprecated/Hero',
      kind: 'deprecated',
      impact: 'none',
      plain: 'Hero and HeroProps still work but are deprecated; use Banner instead.',
      detect: { imports: [{ from: `${PKG}/patterns`, names: ['Hero', 'HeroProps'] }] },
      removeIn: '0.14.0',
      source: 'CHANGELOG.md:9',
    },
  ],
};

const LEDGER_0_12_1 = {
  version: '0.12.1',
  date: '2026-10-03',
  bump: 'patch',
  summary: 'Docs only; nothing for a consumer to change.',
  backfilled: false,
  steps: [],
};

const STATUS = { updatedAt: '2026-10-01T00:00:00Z', phase: 'active', headline: 'Fixture.' };

/**
 * A repo with snapshots from the 0.10.0 floor, ledgers after it and a
 * package.json at the newest release, with or without the `design-system` bin.
 */
function historyRepo({
  command = false,
  ledgers = [LEDGER_0_11, LEDGER_0_12, LEDGER_0_12_1],
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'hds-compile-'));
  temps.push(root);
  const latest = ledgers.at(-1).version;
  const bin = { 'hds-move': 'codemods/move.mjs' };
  if (command) bin['design-system'] = 'codemods/upgrade.mjs';
  write(root, 'package.json', json({ name: PKG, version: latest, bin }));
  write(root, 'docs/api/releases/0.10.0.json', '{}\n');
  for (const ledger of ledgers) {
    write(root, `docs/api/releases/${ledger.version}.json`, '{}\n');
    write(root, `upgrade/releases/${ledger.version}.json`, json(ledger));
  }
  write(root, 'status.json', json(STATUS));
  return root;
}

describe('UPGRADING.md: the first lines', () => {
  it('say the file only knows releases up to the installed version, and name the one command as coming in 0.22.0 while the bin is absent', () => {
    const { upgrading } = compileOutputs({ repo: historyRepo() });
    expect(upgrading.split('\n').slice(0, 4)).toEqual([
      `# Upgrading ${PKG}`,
      '',
      'This file only knows the releases up to the version you have installed, 0.12.1. For newer releases, read the newest copy at https://github.com/hirobius/hds/blob/main/UPGRADING.md. From 0.22.0, `npx @hirobius/design-system@latest upgrade` fetches the newest steps and applies them for you.',
      '',
    ]);
  });

  it('lead with the one command once package.json#bin has design-system', () => {
    const { upgrading } = compileOutputs({ repo: historyRepo({ command: true }) });
    expect(upgrading.split('\n').slice(0, 4)).toEqual([
      `# Upgrading ${PKG}`,
      '',
      'This file only knows the releases up to the version you have installed, 0.12.1. For newer releases, run `npx @hirobius/design-system@latest upgrade`: it always fetches the newest steps.',
      '',
    ]);
  });
});

describe('UPGRADING.md: how to upgrade, then every release, newest first', () => {
  it('without the one command: the manual route, then each release with its non-empty lists in order', () => {
    const { upgrading } = compileOutputs({ repo: historyRepo() });
    expect(upgrading.split('\n').slice(4).join('\n')).toBe(
      [
        '## How to upgrade',
        '',
        `1. Install the exact version: \`pnpm add ${PKG}@0.12.1\`. \`pnpm update\` never crosses a 0.x minor.`,
        '2. For each release you cross, run the codemods listed under Fixed for you.',
        '3. Then work through its Do by hand list.',
        '',
        'This file covers every release after 0.10.0; from an older version, first reach 0.10.0 with the notes in CHANGELOG.md. MIGRATIONS.md has longer guides for the big releases.',
        '',
        '## 0.12.1',
        '',
        'Released 2026-10-03 (patch). Docs only; nothing for a consumer to change.',
        '',
        'Nothing in this release asks anything of you.',
        '',
        '## 0.12.0',
        '',
        'Released 2026-10-02 (minor). Tile is removed.',
        '',
        '### Coming next',
        '',
        '- Hero and HeroProps still work but are deprecated; use Banner instead. Removed in 0.14.0.',
        '',
        '### Do by hand',
        '',
        '- Tile is removed, so use Card instead.',
        '',
        '## 0.11.0',
        '',
        'Released 2026-10-01 (minor). Page moves to /patterns and Chart is removed; Tile is deprecated.',
        '',
        '### Fixed for you',
        '',
        'Run each codemod once from your project root:',
        '',
        '```sh',
        `npx -p ${PKG}@0.12.1 hds-move --root .`,
        '```',
        '',
        `- Page is no longer exported from the package root; import it from ${PKG}/patterns instead. Codemod: \`hds-move\`.`,
        '',
        '### Looks different',
        '',
        '- Card has a softer shadow.',
        '',
        // Every step lands in one list: 0.12.0 removed Tile sooner than
        // announced, and the deprecation says so, linking that release.
        '### Coming next',
        '',
        '- Tile still works but is deprecated; use Card instead. Removed early, in [0.12.0](#0120) (planned for 1.0.0).',
        "- The spacing names 'tight' and 'loose' still work but are deprecated; use 'sm' and 'lg'. Removed in 1.0.0.",
        '',
        // Breaking first, then behavior; ledger order within each.
        '### Do by hand',
        '',
        '- Chart is removed, so draw charts with your own library.',
        '- HDS no longer installs lodash, so add it to your own dependencies if your code imports it.',
        '- An info Alert now has role="status", so tests that find it by role must look for status.',
        '',
        '<!-- Generated by scripts/upgrade/compile.mjs from upgrade/releases/*.json; do not edit. Run node scripts/upgrade/compile.mjs to regenerate. -->',
        '',
      ].join('\n'),
    );
  });

  it('with the one command: the command first, and Fixed for you says the command runs the codemods', () => {
    const { upgrading } = compileOutputs({ repo: historyRepo({ command: true }) });
    const lines = upgrading.split('\n');
    expect(lines.slice(4, 12)).toEqual([
      '## How to upgrade',
      '',
      '```sh',
      'npx @hirobius/design-system@latest upgrade',
      '```',
      '',
      "It finds the version you have, moves you to the newest release, runs each release's codemods (Fixed for you) and lists what is left for you (Do by hand). It works from 0.10.0 on; from an older version, first reach 0.10.0 with the notes in CHANGELOG.md. MIGRATIONS.md has longer guides for the big releases.",
      '',
    ]);
    const fixed = lines.indexOf('### Fixed for you');
    expect(lines.slice(fixed, fixed + 5)).toEqual([
      '### Fixed for you',
      '',
      'The upgrade command runs these codemods for you.',
      '',
      `- Page is no longer exported from the package root; import it from ${PKG}/patterns instead. Codemod: \`hds-move\`.`,
    ]);
  });
});

describe('a deprecation a later release takes away, use by use', () => {
  const PATTERNS = `${PKG}/patterns`;
  const deprecations = {
    ...LEDGER_0_11,
    steps: [
      {
        id: '0.11.0/deprecated/Hero',
        kind: 'deprecated',
        impact: 'none',
        plain: 'Hero, HeroProps and Banner still work but are deprecated; use Section instead.',
        detect: { imports: [{ from: PATTERNS, names: ['Hero', 'HeroProps', 'Banner'] }] },
        removeIn: '1.0.0',
        source: 'x',
      },
      {
        id: '0.11.0/deprecated/kept-utilities',
        kind: 'deprecated',
        impact: 'none',
        plain: 'The utilities pt-1, pb-8 and p-16 still ship but are deprecated.',
        detect: { classes: ['pt-1', 'pb-8', 'p-16'] },
        removeIn: '1.0.0',
        source: 'x',
      },
    ],
  };
  const removals = {
    ...LEDGER_0_12,
    steps: [
      {
        id: '0.12.0/removed/HeroProps',
        kind: 'removed',
        impact: 'breaking',
        plain: 'HeroProps is removed; use SectionProps instead.',
        detect: { imports: [{ from: PATTERNS, names: ['HeroProps'] }] },
        source: 'x',
      },
      {
        id: '0.12.0/removed/pt-1',
        kind: 'removed',
        impact: 'look',
        plain:
          'The pt-1 utility is no longer in styles.css, so generate it with your own Tailwind.',
        detect: { classes: ['pt-1'] },
        source: 'x',
      },
    ],
  };

  it('keeps the rest in upgrade/index.json: each name, class or subject still deprecated', () => {
    const { index } = compileOutputs({ repo: historyRepo({ ledgers: [deprecations, removals] }) });
    expect(JSON.parse(index).deprecated).toEqual([
      { name: 'Banner', entry: './patterns', removeIn: '1.0.0', step: '0.11.0/deprecated/Hero' },
      { name: 'Hero', entry: './patterns', removeIn: '1.0.0', step: '0.11.0/deprecated/Hero' },
      { name: 'p-16', removeIn: '1.0.0', step: '0.11.0/deprecated/kept-utilities' },
      { name: 'pb-8', removeIn: '1.0.0', step: '0.11.0/deprecated/kept-utilities' },
    ]);
  });

  it('keeps the deprecation in Coming next, naming what went and when', () => {
    const { upgrading } = compileOutputs({
      repo: historyRepo({ ledgers: [deprecations, removals] }),
    });
    expect(upgrading).toContain(
      [
        '### Coming next',
        '',
        '- Hero, HeroProps and Banner still work but are deprecated; use Section instead. `HeroProps` was removed in [0.12.0](#0120); the rest is removed in 1.0.0.',
        '- The utilities pt-1, pb-8 and p-16 still ship but are deprecated. `pt-1` was removed in [0.12.0](#0120); the rest is removed in 1.0.0.',
        '',
      ].join('\n'),
    );
  });

  it('lands every step of every committed release in exactly one bullet of one list', () => {
    const sections = releaseSections(compileHistory());
    for (const { ledger, lists } of sections) {
      const placed = LISTS.flatMap((list) =>
        lists[list].flatMap((bullet) => bullet.steps.map((step) => step.id)),
      );
      expect(placed.sort(), ledger.version).toEqual(ledger.steps.map((step) => step.id).sort());
    }
    expect(sections.map((s) => s.ledger.version)).toContain('0.17.0');
  });
});

describe('UPGRADING.md: steps that share one sentence share one bullet', () => {
  const PATTERNS = `${PKG}/patterns`;
  const removed = (name) => ({
    id: `0.13.0/removed/${name}`,
    kind: 'removed',
    impact: 'breaking',
    plain: `${name} is removed with no drop-in replacement, so rewrite or delete the code that imports it.`,
    detect: { imports: [{ from: PKG, names: [name] }] },
    source: 'x',
  });
  const moved = (name) => ({
    id: `0.13.0/moved/${name}`,
    kind: 'moved',
    impact: 'breaking',
    plain: `${name} is no longer exported from the package root; import it from ${PATTERNS} instead.`,
    auto: { codemod: 'hds-move', args: [] },
    detect: { imports: [{ from: PKG, names: [name] }] },
    source: 'x',
  });
  const dependency = (name) => ({
    id: `0.13.0/dependency/${name}`,
    kind: 'dependency',
    impact: 'breaking',
    plain: `HDS no longer installs ${name}, so add it to your own dependencies if your code imports it.`,
    detect: { bareImports: [name] },
    source: 'x',
  });
  const LEDGER_0_13 = {
    version: '0.13.0',
    date: '2026-10-04',
    bump: 'minor',
    summary: 'Removals.',
    backfilled: false,
    steps: [
      removed('Alpha'),
      removed('Beta'),
      removed('Gamma'),
      // Alpha's name is in this sentence too, so it cannot join a group.
      { ...removed('Delta'), plain: 'Delta is removed; use Alpha instead.' },
      moved('Page'),
      moved('Shell'),
      dependency('@scope/pkg'),
      dependency('lodash'),
    ],
  };

  it('lists the names after the shared sentence, in step order, codemod and all', () => {
    const { upgrading } = compileOutputs({
      repo: historyRepo({ ledgers: [LEDGER_0_11, LEDGER_0_12, LEDGER_0_13] }),
    });
    const section = upgrading.slice(upgrading.indexOf('## 0.13.0'), upgrading.indexOf('## 0.12.0'));
    expect(section).toContain(
      `- Each of these is no longer exported from the package root; import it from ${PATTERNS} instead: \`Page\` and \`Shell\`. Codemod: \`hds-move\`.\n`,
    );
    expect(section).toContain(
      [
        '### Do by hand',
        '',
        '- Each of these is removed with no drop-in replacement, so rewrite or delete the code that imports it: `Alpha`, `Beta` and `Gamma`.',
        '- Delta is removed; use Alpha instead.',
        '- HDS no longer installs each of these, so add it to your own dependencies if your code imports it: `@scope/pkg` and `lodash`.',
        '',
      ].join('\n'),
    );
  });

  it('groups the same way in the Upgrade block, so a big release still fits in five lines', () => {
    const block = upgradeBlock(LEDGER_0_13, { command: false, bin: { 'hds-move': 'x.mjs' } });
    expect(block.slice(6)).toEqual([
      `- Fixed for you: run \`npx -p ${PKG}@0.13.0 hds-move --root .\` (2 steps).`,
      '- Do by hand: Each of these is removed with no drop-in replacement, so rewrite or delete the code that imports it: `Alpha`, `Beta` and `Gamma`.',
      '- Do by hand: Delta is removed; use Alpha instead.',
      '- Do by hand: HDS no longer installs each of these, so add it to your own dependencies if your code imports it: `@scope/pkg` and `lodash`.',
      '- Every step is also in [UPGRADING.md](https://github.com/hirobius/hds/blob/main/UPGRADING.md#0130).',
      '',
    ]);
  });
});

describe('UPGRADING.md: a bullet never says the same thing twice', () => {
  const step = (id, plain, extra = {}) => ({
    id,
    kind: id.split('/')[1],
    impact: 'breaking',
    plain,
    detect: { imports: [{ from: PKG, names: [id.split('/')[2]] }] },
    source: 'x',
    ...extra,
  });
  const deprecated = (id, plain, removeIn) =>
    step(id, plain, {
      impact: 'none',
      removeIn,
      ...(id.endsWith('gap-names') ? { detect: { regex: ["gap='tight'"] } } : {}),
    });
  const ledgers = [
    {
      ...LEDGER_0_11,
      steps: [
        step('0.11.0/moved/Page', 'Page moves to /patterns (hds-move rewrites it).', {
          auto: { codemod: 'hds-move', args: [] },
        }),
        step('0.11.0/moved/Shell', 'Shell moves to /patterns (hds-move rewrites it).', {
          auto: { codemod: 'hds-move', args: ['--only', 'Shell'] },
        }),
        deprecated(
          '0.11.0/deprecated/Badge',
          'Badge still works but is removed in 0.12.0; use Tag instead.',
          '0.12.0',
        ),
        deprecated(
          '0.11.0/deprecated/gap-names',
          'The gap names still work and are Removed in 1.0.0 with no replacement.',
          '1.0.0',
        ),
        deprecated(
          '0.11.0/deprecated/Early',
          'Early still works but is removed in 1.0.0; use Late instead.',
          '1.0.0',
        ),
      ],
    },
    {
      ...LEDGER_0_12,
      steps: [
        step('0.12.0/removed/Badge', 'Badge is removed; use Tag instead.'),
        step('0.12.0/removed/Early', 'Early is removed; use Late instead.'),
      ],
    },
  ];

  it('drops a tail the plain line already says, and keeps one that adds a fact', () => {
    const { upgrading } = compileOutputs({ repo: historyRepo({ ledgers }) });
    const section = upgrading.slice(upgrading.indexOf('## 0.11.0'));
    expect(section).toContain(
      [
        '- Page moves to /patterns (hds-move rewrites it).',
        '- Shell moves to /patterns (hds-move rewrites it). Codemod: `hds-move --only Shell`.',
        '',
      ].join('\n'),
    );
    expect(section).toContain(
      [
        '### Coming next',
        '',
        '- Badge still works but is removed in 0.12.0; use Tag instead.',
        '- The gap names still work and are Removed in 1.0.0 with no replacement.',
        '- Early still works but is removed in 1.0.0; use Late instead. Removed early, in [0.12.0](#0120) (planned for 1.0.0).',
        '',
      ].join('\n'),
    );
  });

  it('does the same in the Upgrade block', () => {
    const block = upgradeBlock(ledgers[0], { command: true, bin: {} });
    expect(block).toContain(
      '- Coming next: Badge still works but is removed in 0.12.0; use Tag instead.',
    );
  });
});

describe('UPGRADING.md: plain lines stay plain text', () => {
  it('escapes what GitHub would read as markup, and leaves an underscore inside a word alone', () => {
    const ledger = {
      ...LEDGER_0_12,
      steps: [
        {
          ...LEDGER_0_12.steps[0],
          plain:
            'Replace each <Tile> with <Card tone>, read semantic.motion.*.$value and get_component, not _private or [x] or ~old~.',
        },
      ],
    };
    const { upgrading } = compileOutputs({ repo: historyRepo({ ledgers: [LEDGER_0_11, ledger] }) });
    expect(upgrading).toContain(
      '- Replace each \\<Tile> with \\<Card tone>, read semantic.motion.\\*.\\$value and get_component, not \\_private or \\[x] or \\~old\\~.\n',
    );
  });
});

describe('upgrade/index.json', () => {
  it('lists every release with its breaking count, the 0.10.0 floor and what is deprecated today', () => {
    const { index } = compileOutputs({ repo: historyRepo() });
    const expected = {
      package: PKG,
      latest: '0.12.1',
      floor: '0.10.0',
      versions: [
        {
          version: '0.11.0',
          date: '2026-10-01',
          bump: 'minor',
          breaking: 3,
          summary: 'Page moves to /patterns and Chart is removed; Tile is deprecated.',
        },
        {
          version: '0.12.0',
          date: '2026-10-02',
          bump: 'minor',
          breaking: 1,
          summary: 'Tile is removed.',
        },
        {
          version: '0.12.1',
          date: '2026-10-03',
          bump: 'patch',
          breaking: 0,
          summary: 'Docs only; nothing for a consumer to change.',
        },
      ],
      // Soonest removal first. Tile is not here: 0.12.0 removed it.
      deprecated: [
        { name: 'Hero', entry: './patterns', removeIn: '0.14.0', step: '0.12.0/deprecated/Hero' },
        {
          name: 'HeroProps',
          entry: './patterns',
          removeIn: '0.14.0',
          step: '0.12.0/deprecated/Hero',
        },
        { name: 'space-names', removeIn: '1.0.0', step: '0.11.0/deprecated/space-names' },
      ],
    };
    expect(index).toBe(json(expected));
    expect(Index.safeParse(JSON.parse(index)).success).toBe(true);
  });
});

describe('the release object of status.json', () => {
  it('names the newest release, its counts, the floor and how to upgrade to it', () => {
    const repo = historyRepo({ ledgers: [LEDGER_0_11, LEDGER_0_12] });
    expect(compileOutputs({ repo }).release).toEqual({
      version: '0.12.0',
      date: '2026-10-02',
      bump: 'minor',
      summary: 'Tile is removed.',
      breaking: 1,
      doByHand: 1,
      floor: '0.10.0',
      upgrade: `pnpm add ${PKG}@0.12.0`,
    });
    const withCommand = historyRepo({ command: true });
    expect(compileOutputs({ repo: withCommand }).release).toMatchObject({
      version: '0.12.1',
      breaking: 0,
      doByHand: 0,
      upgrade: 'npx @hirobius/design-system@latest upgrade',
    });
  });
});

describe('compile.mjs writes the generated files, and --check keeps them byte-equal', () => {
  it('writes UPGRADING.md, upgrade/index.json and status.json release, keeping every other status field', () => {
    const repo = historyRepo();
    expect(run(['--repo', repo]).status).toBe(0);
    const outputs = compileOutputs({ repo });
    expect(read(repo, 'UPGRADING.md')).toBe(outputs.upgrading);
    expect(read(repo, 'upgrade/index.json')).toBe(outputs.index);
    // After headline, every other field as it was; the file stays 2-space JSON.
    expect(read(repo, 'status.json')).toBe(json({ ...STATUS, release: outputs.release }));
    expect(run(['--check', '--repo', repo]).status).toBe(0);
  });

  it('--check fails on a hand edit to UPGRADING.md, naming the file and the command that fixes it', () => {
    const repo = historyRepo();
    run(['--repo', repo]);
    const edited = read(repo, 'UPGRADING.md').replace('Card has a softer shadow.', 'Card is fine.');
    write(repo, 'UPGRADING.md', edited);
    const res = run(['--check', '--repo', repo]);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('UPGRADING.md');
    expect(res.stderr).toContain('node scripts/upgrade/compile.mjs');
    // --check never writes.
    expect(read(repo, 'UPGRADING.md')).toBe(edited);
  });

  it('--check fails on a stale upgrade/index.json or a status.json without its release, and ignores other status edits', () => {
    const repo = historyRepo();
    run(['--repo', repo]);
    const status = JSON.parse(read(repo, 'status.json'));
    write(repo, 'status.json', json({ ...status, headline: 'Edited by hand.' }));
    expect(run(['--check', '--repo', repo]).status).toBe(0);

    const { release: _release, ...bare } = status;
    write(repo, 'status.json', json(bare));
    write(repo, 'upgrade/index.json', '{}\n');
    const res = run(['--check', '--repo', repo, '--json']);
    expect(res.status).toBe(1);
    const { ok, violations } = JSON.parse(res.stdout);
    expect(ok).toBe(false);
    expect(violations.map((v) => [v.file, v.rule])).toEqual([
      ['upgrade/index.json', 'compiled-stale'],
      ['status.json', 'compiled-stale'],
    ]);
  });

  it('--check fails when a generated file is missing', () => {
    const res = run(['--check', '--repo', historyRepo()]);
    expect(res.status).toBe(1);
    expect(res.stderr).toMatch(/UPGRADING\.md/);
  });
});

describe("the Upgrade block at the top of a release's CHANGELOG section", () => {
  const step = (id, impact, plain, extra = {}) => ({
    id: `0.13.0/${id}`,
    kind: id.split('/')[0],
    impact,
    plain,
    source: 'x',
    ...extra,
  });
  const ledger = (steps) => ({ ...LEDGER_0_12, version: '0.13.0', steps });
  const bin = { 'hds-move': 'codemods/move.mjs' };

  it('leads with the exact install while the one command is absent, then the steps, then UPGRADING.md', () => {
    const block = upgradeBlock(
      ledger([
        step('removed/Chart', 'breaking', 'Chart is removed, so draw charts yourself.'),
        step('moved/Page', 'breaking', 'Page moved to /patterns.', {
          auto: { codemod: 'hds-move', args: [] },
        }),
        step('look/Card-shadow', 'look', 'Card has a softer shadow.'),
      ]),
      { command: false, bin },
    );
    expect(block).toEqual([
      '### Upgrade',
      '',
      '```sh',
      `pnpm add ${PKG}@0.13.0`,
      '```',
      '',
      `- Fixed for you: run \`npx -p ${PKG}@0.13.0 hds-move --root .\` (1 step).`,
      '- Do by hand: Chart is removed, so draw charts yourself.',
      '- Looks different: Card has a softer shadow.',
      '- Every step is also in [UPGRADING.md](https://github.com/hirobius/hds/blob/main/UPGRADING.md#0130).',
      '',
    ]);
  });

  it('leads with the one command once the package has it, and keeps to five lines plus the command', () => {
    const hand = [1, 2, 3, 4, 5].map((n) =>
      step(`behavior/B${n}`, 'behavior', `Behavior ${n} changed.`),
    );
    const block = upgradeBlock(
      ledger([
        step('moved/Page', 'breaking', 'Page moved.', { auto: { codemod: 'hds-move', args: [] } }),
        step('moved/Hero', 'breaking', 'Hero moved.', { auto: { codemod: 'hds-move', args: [] } }),
        ...hand,
        step('look/Card-shadow', 'look', 'Card has a softer shadow.'),
      ]),
      { command: true, bin },
    );
    expect(block).toEqual([
      '### Upgrade',
      '',
      '```sh',
      'npx @hirobius/design-system@latest upgrade',
      '```',
      '',
      '- Fixed for you: 2 steps, applied by the command above.',
      '- Do by hand: Behavior 1 changed.',
      '- Do by hand: Behavior 2 changed.',
      '- Do by hand: Behavior 3 changed.',
      '- And 3 more: see [UPGRADING.md](https://github.com/hirobius/hds/blob/main/UPGRADING.md#0130).',
      '',
    ]);
  });

  it('says so when nothing in the release asks anything of a consumer', () => {
    expect(upgradeBlock(ledger([]), { command: false, bin }).slice(6)).toEqual([
      '- Nothing in this release asks anything of you.',
      '',
    ]);
  });
});

// Fixture changesets live in temp repos; the path is built from a constant so
// tests/removed-0.20-release-notes.test.ts (no test names a real changeset) holds.
const CHANGESETS = '.changeset';

describe('compile.mjs --release, right after changeset version', () => {
  const calloutGone = {
    impact: 'breaking',
    plain: 'Callout is removed, so replace it with Alert.',
    steps: [
      {
        id: 'removed/Callout',
        kind: 'removed',
        impact: 'breaking',
        plain: 'Callout is removed, so replace it with Alert.',
        detect: { imports: [{ from: PKG, names: ['Callout'] }] },
        facts: ['removed:.:Callout'],
      },
    ],
  };
  const softShadow = {
    impact: 'look',
    plain: 'Card has a softer shadow.',
    steps: [
      { id: 'look/Card-shadow', kind: 'look', impact: 'look', plain: 'Card has a softer shadow.' },
    ],
  };
  const git = (root, ...args) =>
    spawnSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], { cwd: root, encoding: 'utf8' });

  /**
   * The 0.20.0 fixture with three changesets and their notes, committed, then
   * what `changeset version` leaves: the changesets gone, package.json at
   * 0.21.0 and a 0.21.0 section at the top of CHANGELOG.md. `late` has a note
   * but its changeset never reached git, so its entry cannot be found.
   */
  function versionedRepo() {
    const root = releasedRepo();
    removeCallout(root);
    const changesets = {
      'drop-callout': ['minor', 'Callout is removed; use Alert.'],
      'soft-shadow': ['patch', 'Card has a softer shadow.'],
      docs: ['patch', 'Docs only.'],
    };
    for (const [name, [bump, text]] of Object.entries(changesets)) {
      write(
        root,
        `${CHANGESETS}/${name}.md`,
        `---\n'${PKG}': ${bump}\n---\n\n${text}\nMore detail.\n`,
      );
    }
    note(root, 'drop-callout', calloutGone);
    note(root, 'soft-shadow', softShadow);
    note(root, 'docs', { impact: 'none' });
    write(
      root,
      'CHANGELOG.md',
      '# Changelog\n\n## 0.20.0\n\n### Minor Changes\n\n- 1111111: Before.\n',
    );
    write(root, 'upgrade/published.json', json({ $comment: 'Fixture.', versions: ['0.20.0'] }));
    write(root, 'status.json', json(STATUS));
    git(root, 'init', '-q');
    git(root, 'add', '-A');
    git(root, '-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-qm', 'fixture');
    note(root, 'late', { impact: 'none' });
    // changeset version:
    for (const name of Object.keys(changesets)) rmSync(join(root, `${CHANGESETS}/${name}.md`));
    editPkg(root, (pkg) => (pkg.version = '0.21.0'));
    write(
      root,
      'CHANGELOG.md',
      [
        '# Changelog',
        '',
        '## 0.21.0',
        '',
        '### Minor Changes',
        '',
        '- abc1234: Callout is removed; use Alert.',
        '  More detail.',
        '',
        '### Patch Changes',
        '',
        '- def5678: Card has a softer shadow.',
        '  More detail.',
        '- 0123456: Docs only.',
        '  More detail.',
        '',
        '## 0.20.0',
        '',
        '### Minor Changes',
        '',
        '- 1111111: Before.',
        '',
      ].join('\n'),
    );
    return root;
  }

  it('records the release: snapshot, frozen notes, ledger, Upgrade block, published list; the notes leave upgrade/pending', () => {
    const root = versionedRepo();
    const notesBefore = Object.fromEntries(
      ['drop-callout', 'soft-shadow', 'docs', 'late'].map((n) => [
        n,
        read(root, `upgrade/pending/${n}.json`),
      ]),
    );
    const res = run(['--release', '--date', '2026-10-08', '--repo', root]);
    expect(res.status, res.stderr).toBe(0);

    // The Upgrade block leads the new section; the entries follow it.
    expect(read(root, 'CHANGELOG.md').split('\n').slice(0, 26)).toEqual([
      '# Changelog',
      '',
      '## 0.21.0',
      '',
      '### Upgrade',
      '',
      '```sh',
      `pnpm add ${PKG}@0.21.0`,
      '```',
      '',
      '- Do by hand: Callout is removed, so replace it with Alert.',
      '- Looks different: Card has a softer shadow.',
      '- Every step is also in [UPGRADING.md](https://github.com/hirobius/hds/blob/main/UPGRADING.md#0210).',
      '',
      '### Minor Changes',
      '',
      '- abc1234: Callout is removed; use Alert.',
      '  More detail.',
      '',
      '### Patch Changes',
      '',
      '- def5678: Card has a softer shadow.',
      '  More detail.',
      '- 0123456: Docs only.',
      '  More detail.',
      '',
    ]);

    // Every merged note left upgrade/pending, frozen byte for byte.
    for (const [name, text] of Object.entries(notesBefore)) {
      expect(existsSync(join(root, `upgrade/pending/${name}.json`)), name).toBe(false);
      expect(read(root, `upgrade/sources/0.21.0/notes/${name}.json`), name).toBe(text);
    }
    // Each note cites its changeset's entry, numbered with the block in place;
    // `late` never reached git, so it cites its changeset file.
    const release = JSON.parse(read(root, 'upgrade/sources/0.21.0/release.json'));
    expect(release).toMatchObject({
      version: '0.21.0',
      previous: '0.20.0',
      date: '2026-10-08',
      summary: '1 change to make by hand (1 breaking) and 1 that looks different.',
      backfilled: false,
      notes: {
        docs: { needle: '0123456: Docs only.', source: 'CHANGELOG.md:24' },
        'drop-callout': {
          needle: 'abc1234: Callout is removed; use Alert.',
          source: 'CHANGELOG.md:17',
        },
        late: { source: `${CHANGESETS}/late.md` },
        'soft-shadow': { needle: 'def5678: Card has a softer shadow.', source: 'CHANGELOG.md:22' },
      },
    });
    expect(res.stderr).toContain('late');

    expect(JSON.parse(read(root, 'upgrade/releases/0.21.0.json'))).toEqual({
      version: '0.21.0',
      date: '2026-10-08',
      bump: 'minor',
      summary: '1 change to make by hand (1 breaking) and 1 that looks different.',
      backfilled: false,
      steps: [
        { ...calloutGone.steps[0], id: '0.21.0/removed/Callout', source: 'CHANGELOG.md:17' },
        { ...softShadow.steps[0], id: '0.21.0/look/Card-shadow', source: 'CHANGELOG.md:22' },
      ],
    });
    expect(read(root, 'docs/api/releases/0.21.0.json')).toBe(formatJson(snapshotFromSource(root)));
    expect(JSON.parse(read(root, 'upgrade/published.json')).versions).toEqual(['0.20.0', '0.21.0']);
  });

  it('leaves a tree the upgrade gate and compile.mjs --check pass, with no "not recorded" hint', () => {
    const root = versionedRepo();
    expect(run(['--release', '--date', '2026-10-08', '--repo', root]).status).toBe(0);
    const gate = checkUpgradeLedger(root);
    expect(gate.violations).toEqual([]);
    expect(gate.summary.unrecorded).toBeNull();
    expect(run(['--check', '--repo', root]).status).toBe(0);
    expect(JSON.parse(read(root, 'status.json')).release).toMatchObject({
      version: '0.21.0',
      breaking: 1,
      doByHand: 1,
    });
  });

  // hds#541: before compile.mjs recorded releases, a note with no changeset
  // after a release counted as that release's, so a stray breaking note could
  // ride a patch. Once --release has recorded the release, no such window
  // opens: every pending note counts toward the next bump.
  it('leaves no window for a stray note: a breaking one after the release fails the next patch', () => {
    const root = versionedRepo();
    expect(run(['--release', '--date', '2026-10-08', '--repo', root]).status).toBe(0);
    write(root, 'src/index.ts', '');
    write(root, `${CHANGESETS}/fix-y.md`, `---\n'${PKG}': patch\n---\n\nFix y.\n`);
    note(root, 'fix-y', { impact: 'none' });
    note(root, 'stray', {
      impact: 'breaking',
      plain: 'Button is removed, so use your own.',
      steps: [
        {
          id: 'removed/Button',
          kind: 'removed',
          impact: 'breaking',
          plain: 'Button is removed, so use your own.',
          facts: ['removed:.:Button'],
        },
      ],
    });
    const gate = checkUpgradeLedger(root);
    expect(gate.violations.map((v) => v.rule)).toEqual([
      'note-without-changeset',
      'bump-too-small',
    ]);
    expect(gate.violations[0].file).toBe('upgrade/pending/stray.json');
    expect(gate.violations[1].message).toContain('upgrade/pending/stray.json');
    expect(gate.summary.unrecorded).toBeNull();
  });

  // hds#541: the orphan itself is named in pretest, whatever its impact,
  // rather than merged at the next release citing a changeset that never was.
  it('leaves no orphan note to the next release: one with impact none fails the gate too', () => {
    const root = versionedRepo();
    expect(run(['--release', '--date', '2026-10-08', '--repo', root]).status).toBe(0);
    note(root, 'orphan', { impact: 'none' });
    const gate = checkUpgradeLedger(root);
    expect(gate.violations.map((v) => [v.file, v.rule])).toEqual([
      ['upgrade/pending/orphan.json', 'note-without-changeset'],
    ]);
  });

  it('keeps a note with no steps in the record: its plain line is the step', () => {
    const root = versionedRepo();
    const plain = 'Tooltip now opens after 300ms, so update tests that expect it at once.';
    note(root, 'soft-shadow', { impact: 'behavior', plain });
    expect(run(['--release', '--date', '2026-10-08', '--repo', root]).status).toBe(0);
    const ledger = JSON.parse(read(root, 'upgrade/releases/0.21.0.json'));
    expect(ledger.steps.map((step) => step.id)).toContain('0.21.0/behavior/soft-shadow');
    expect(ledger.summary).toBe('2 changes to make by hand (1 breaking).');
    expect(read(root, 'UPGRADING.md')).toContain(`- ${plain}\n`);
    expect(read(root, 'CHANGELOG.md')).toContain(`- Do by hand: ${plain}\n`);
  });

  it('records nothing a second time, and nothing on a tree whose version already has its snapshot', () => {
    const root = versionedRepo();
    run(['--release', '--date', '2026-10-08', '--repo', root]);
    const changelog = read(root, 'CHANGELOG.md');
    expect(run(['--release', '--date', '2026-10-09', '--repo', root]).status).toBe(0);
    expect(read(root, 'CHANGELOG.md')).toBe(changelog);
    expect(JSON.parse(read(root, 'upgrade/releases/0.21.0.json')).date).toBe('2026-10-08');
  });

  it('stops with nothing written, naming the note, when a note step lists a fact the diff does not have', () => {
    const root = versionedRepo();
    const [step] = calloutGone.steps;
    note(root, 'drop-callout', {
      ...calloutGone,
      steps: [{ ...step, facts: ['removed:.:Callout', 'removed:.:Button'] }],
    });
    const res = run(['--release', '--date', '2026-10-08', '--repo', root]);
    expect(res.status).toBe(2);
    expect(res.stderr).toContain('upgrade/pending/drop-callout.json');
    expect(res.stderr).toContain('removed:.:Button');
    expect(res.stderr).toContain('pnpm upgrade:note');
    expect(existsSync(join(root, 'docs/api/releases/0.21.0.json'))).toBe(false);
    expect(existsSync(join(root, 'upgrade/pending/drop-callout.json'))).toBe(true);
  });

  it('stops with nothing written when a fact has no step, or while changesets are still pending', () => {
    const root = versionedRepo();
    note(root, 'drop-callout', { impact: 'breaking', plain: 'Callout is removed, so use Alert.' });
    const res = run(['--release', '--date', '2026-10-08', '--repo', root]);
    expect(res.status).toBe(2);
    expect(res.stderr).toContain('removed:.:Callout');
    expect(existsSync(join(root, 'docs/api/releases/0.21.0.json'))).toBe(false);
    expect(existsSync(join(root, 'upgrade/pending/drop-callout.json'))).toBe(true);

    const pending = versionedRepo();
    write(pending, `${CHANGESETS}/next.md`, `---\n'${PKG}': patch\n---\n\nNext.\n`);
    const refused = run(['--release', '--date', '2026-10-08', '--repo', pending]);
    expect(refused.status).toBe(2);
    expect(refused.stderr).toContain(`${CHANGESETS}/next.md`);
    expect(existsSync(join(pending, 'upgrade/releases/0.21.0.json'))).toBe(false);
  });

  // changesets pre mode keeps the changesets it consumed (pre.json lists
  // them), so a prerelease looks like a tree with changesets still pending.
  it('records no prerelease in changesets pre mode: it says so, exits 0 and leaves the notes pending', () => {
    const root = versionedRepo();
    const names = ['drop-callout', 'soft-shadow', 'docs'];
    for (const name of names) {
      write(root, `${CHANGESETS}/${name}.md`, `---\n'${PKG}': patch\n---\n\n${name}.\n`);
    }
    write(
      root,
      `${CHANGESETS}/pre.json`,
      json({ mode: 'pre', tag: 'rc', initialVersions: { [PKG]: '0.20.0' }, changesets: names }),
    );
    editPkg(root, (pkg) => (pkg.version = '0.21.0-rc.0'));
    // compile.mjs still regenerates its outputs, from the 0.20.0 ledger.
    const ledger = { ...LEDGER_0_12_1, version: '0.20.0', bump: 'minor', summary: 'Fixture.' };
    write(root, 'upgrade/releases/0.20.0.json', json(ledger));
    const changelog = read(root, 'CHANGELOG.md').replace('## 0.21.0', '## 0.21.0-rc.0');
    write(root, 'CHANGELOG.md', changelog);
    const res = run(['--release', '--date', '2026-10-08', '--repo', root]);
    expect(res.status, res.stderr).toBe(0);
    expect(res.stdout).toContain('0.21.0-rc.0 is a prerelease');
    expect(res.stdout).toContain(`${CHANGESETS}/pre.json`);
    expect(existsSync(join(root, 'docs/api/releases/0.21.0-rc.0.json'))).toBe(false);
    expect(existsSync(join(root, 'upgrade/pending/drop-callout.json'))).toBe(true);
    expect(read(root, 'CHANGELOG.md')).toBe(changelog);
  });

  it('replaces the Upgrade block, not adds a second one, when a release is recorded again', () => {
    const root = versionedRepo();
    const notes = ['drop-callout', 'soft-shadow', 'docs', 'late'];
    const before = Object.fromEntries(
      notes.map((n) => [n, read(root, `upgrade/pending/${n}.json`)]),
    );
    expect(run(['--release', '--date', '2026-10-08', '--repo', root]).status).toBe(0);
    const changelog = read(root, 'CHANGELOG.md');
    // Undo the record, keeping the CHANGELOG with its block, and record again.
    rmSync(join(root, 'docs/api/releases/0.21.0.json'));
    rmSync(join(root, 'upgrade/releases/0.21.0.json'));
    rmSync(join(root, 'upgrade/sources/0.21.0'), { recursive: true });
    for (const [name, text] of Object.entries(before)) {
      write(root, `upgrade/pending/${name}.json`, text);
    }
    expect(run(['--release', '--date', '2026-10-08', '--repo', root]).status).toBe(0);
    expect(read(root, 'CHANGELOG.md')).toBe(changelog);
    expect(read(root, 'CHANGELOG.md').match(/^### Upgrade$/gm)).toHaveLength(1);
  });

  // The Version PR is regenerated from main on every push (changesets/action),
  // so the summary's durable source is a file on main, not an edit on the PR.
  it('takes the summary from upgrade/pending/summary.txt when main has one, then deletes it', () => {
    const root = versionedRepo();
    const summary = 'Callout is removed for Alert, and Card has a softer shadow.';
    write(root, 'upgrade/pending/summary.txt', `${summary}\n`);
    const res = run(['--release', '--date', '2026-10-08', '--repo', root]);
    expect(res.status, res.stderr).toBe(0);
    expect(JSON.parse(read(root, 'upgrade/sources/0.21.0/release.json')).summary).toBe(summary);
    expect(JSON.parse(read(root, 'upgrade/releases/0.21.0.json')).summary).toBe(summary);
    expect(JSON.parse(read(root, 'status.json')).release.summary).toBe(summary);
    expect(existsSync(join(root, 'upgrade/pending/summary.txt'))).toBe(false);
  });

  it('refuses a summary.txt that is not one line of at most 140 characters, with nothing written', () => {
    for (const text of ['Two\nlines.\n', `${'x'.repeat(141)}\n`, '\n']) {
      const root = versionedRepo();
      write(root, 'upgrade/pending/summary.txt', text);
      const res = run(['--release', '--date', '2026-10-08', '--repo', root]);
      expect(res.status).toBe(2);
      expect(res.stderr).toContain('upgrade/pending/summary.txt');
      expect(existsSync(join(root, 'upgrade/releases/0.21.0.json'))).toBe(false);
    }
  });
});

describe('compile.mjs names the fix when its inputs are broken', () => {
  it('a ledger that does not fit the schema: rebuild it with build-ledger.mjs', () => {
    const repo = historyRepo();
    write(repo, 'upgrade/releases/0.12.0.json', json({ ...LEDGER_0_12, bump: 'huge' }));
    const res = run(['--check', '--repo', repo]);
    expect(res.status).toBe(2);
    expect(res.stderr).toContain('upgrade/releases/0.12.0.json does not fit');
    expect(res.stderr).toContain('node scripts/upgrade/build-ledger.mjs 0.12.0');
  });

  it('no ledger at all: record a release first', () => {
    const repo = historyRepo();
    rmSync(join(repo, 'upgrade/releases'), { recursive: true });
    const res = run(['--check', '--repo', repo]);
    expect(res.status).toBe(2);
    expect(res.stderr).toContain('upgrade/releases holds no ledger');
    expect(res.stderr).toContain('Recording a release by hand');
  });

  it('a status.json that is not JSON: fix it, then rerun compile.mjs', () => {
    const repo = historyRepo();
    for (const args of [['--check'], []]) {
      write(repo, 'status.json', '{ "phase": ');
      const res = run([...args, '--repo', repo]);
      expect(res.status).toBe(2);
      expect(res.stderr).toContain('status.json is not JSON');
      expect(res.stderr).toContain('then run node scripts/upgrade/compile.mjs');
    }
  });

  // --date only dates a release --release records, and a recorded date is
  // frozen into the ledger, so a date that is no calendar day never gets in.
  it('--date without --release, or a date that is no calendar day: the usage line, nothing written', () => {
    const repo = historyRepo();
    const status = read(repo, 'status.json');
    for (const args of [
      ['--date', '2026-10-08'],
      ['--release', '--date', '2026-13-45'],
      ['--release', '--date', '2026-02-30'],
      ['--release', '--date'],
    ]) {
      const res = run([...args, '--repo', repo]);
      expect(res.status, args.join(' ')).toBe(2);
      expect(res.stderr, args.join(' ')).toContain('usage: compile.mjs');
      expect(existsSync(join(repo, 'UPGRADING.md')), args.join(' ')).toBe(false);
      expect(read(repo, 'status.json')).toBe(status);
    }
  });
});

describe('wiring', () => {
  const pkg = JSON.parse(read(REPO, 'package.json'));

  it('records each release inside pnpm changeset:version, right after changeset version', () => {
    const steps = pkg.scripts['changeset:version'].split('&&').map((step) => step.trim());
    expect(steps.slice(0, 2)).toEqual([
      'changeset version',
      'node scripts/upgrade/compile.mjs --release',
    ]);
  });

  it('runs --check in pretest, and it passes on this repository with no network and no build', () => {
    expect(pkg.scripts.pretest).toContain('node scripts/upgrade/compile.mjs --check');
    const res = run(['--check']);
    expect(res.status, res.stderr).toBe(0);
  });

  it('keeps the generated files out of Prettier, whose reflow would make them stale', () => {
    const ignored = read(REPO, '.prettierignore').split('\n');
    expect(ignored).toEqual(expect.arrayContaining(['UPGRADING.md', 'upgrade/index.json']));
  });
});
