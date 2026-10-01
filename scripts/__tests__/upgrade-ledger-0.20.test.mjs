/**
 * upgrade/releases/0.20.0.json (hds#447): the first release ledger, generated
 * by scripts/upgrade/build-ledger-0.20.mjs from the 0.19.1 and 0.20.0 release
 * snapshots, codemods/removed-0.20.json, the hds-prefix RENAMES map and the
 * CHANGELOG's 0.20.0 section.
 *
 * The expectations come from those sources directly, not from the generator:
 * the removed and renamed names from the codemod data, the moves and dropped
 * dependencies from the snapshot diff, the cited lines from hds#447 itself.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RENAMES } from '../../codemods/hds-prefix.mjs';
import { buildLedger020 } from '../upgrade/build-ledger-0.20.mjs';
import { diffSnapshots } from '../upgrade/diff.mjs';
import { formatJson } from '../upgrade/format.mjs';
import { FACTS_NEEDING_A_STEP } from '../upgrade/ledger.mjs';
import { checkReleaseDir } from '../upgrade/schema.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const read = (file) => JSON.parse(readFileSync(join(REPO, file), 'utf8'));

const LEDGER = read('upgrade/releases/0.20.0.json');
const PREV = read('docs/api/releases/0.19.1.json');
const NEXT = read('docs/api/releases/0.20.0.json');
const FACTS = diffSnapshots(PREV, NEXT);
const REMOVED = read('codemods/removed-0.20.json');
const ROOT = '@hirobius/design-system';
const PATTERNS = '@hirobius/design-system/patterns';

const stepsOf = (kind) => LEDGER.steps.filter((step) => step.kind === kind);
const subject = (step) => step.id.split('/').slice(2).join('/');
const byId = (id) => LEDGER.steps.find((step) => step.id === id);
const imported = (step) => step.detect?.imports?.flatMap((i) => i.names) ?? [];

describe('upgrade/releases/0.20.0.json', () => {
  it('is what the generator writes, byte for byte', () => {
    expect(readFileSync(join(REPO, 'upgrade/releases/0.20.0.json'), 'utf8')).toBe(
      formatJson(buildLedger020()),
    );
    const check = spawnSync(
      process.execPath,
      [join(REPO, 'scripts/upgrade/build-ledger-0.20.mjs'), '--check'],
      { encoding: 'utf8' },
    );
    expect(check.status, check.stderr).toBe(0);
  });

  it('validates, like every ledger in upgrade/releases', () => {
    expect(checkReleaseDir(join(REPO, 'upgrade/releases'))).toEqual([]);
  });

  it('is the 0.19.1 -> 0.20.0 minor, backfilled after the release shipped', () => {
    expect(LEDGER).toMatchObject({
      version: '0.20.0',
      date: '2026-10-01',
      bump: 'minor',
      backfilled: true,
    });
  });
});

describe('0.20.0 ledger coverage (hds#447 set equality)', () => {
  const removedNames = Object.values(REMOVED.modules).flat();
  const replacedNames = Object.values(REMOVED.replaced).flatMap(Object.keys);
  const movedNames = FACTS.filter((f) => f.kind === 'moved').map((f) => f.name);

  it('has one removed, folded, renamed or moved step per name: exactly the codemod data and the moves', () => {
    const fromSteps = ['removed', 'folded', 'renamed', 'moved'].flatMap((kind) =>
      stepsOf(kind).map(subject),
    );
    const fromSources = [...removedNames, ...replacedNames, ...Object.keys(RENAMES), ...movedNames];
    expect(new Set(fromSteps).size).toBe(fromSteps.length);
    expect([...fromSteps].sort()).toEqual([...new Set(fromSources)].sort());
  });

  it('records each name with the kind its source gives it', () => {
    for (const name of removedNames) expect(byId(`0.20.0/removed/${name}`), name).toBeDefined();
    for (const name of replacedNames) expect(byId(`0.20.0/folded/${name}`), name).toBeDefined();
    for (const name of Object.keys(RENAMES)) {
      expect(byId(`0.20.0/renamed/${name}`), name).toBeDefined();
    }
    for (const name of movedNames) expect(byId(`0.20.0/moved/${name}`), name).toBeDefined();
  });

  it('lists every snapshot-diff fact that needs a step in some step, and no fact the diff lacks', () => {
    const listed = LEDGER.steps.flatMap((step) => step.facts ?? []);
    const needed = FACTS.filter((f) => FACTS_NEEDING_A_STEP.includes(f.kind)).map((f) => f.id);
    expect(needed.filter((id) => !listed.includes(id))).toEqual([]);
    const known = new Set(FACTS.map((f) => f.id));
    expect(listed.filter((id) => !known.has(id))).toEqual([]);
    expect(needed.length).toBe(262);
  });

  it('finds a removed name by an import from every entry it left', () => {
    const calendar = byId('0.20.0/removed/Calendar');
    expect(calendar.detect.imports).toEqual([
      { from: ROOT, names: ['Calendar'] },
      { from: PATTERNS, names: ['Calendar'] },
    ]);
    expect(calendar.facts).toEqual(['removed:.:Calendar', 'removed:./patterns:Calendar']);
    expect(calendar.impact).toBe('breaking');
  });

  it('names the survivor of each folded name, and the replacement of each rename', () => {
    for (const [file, map] of Object.entries(REMOVED.replaced)) {
      for (const [name, survivor] of Object.entries(map)) {
        expect(byId(`0.20.0/folded/${name}`).plain, `${file} ${name}`).toContain(survivor);
      }
    }
    for (const [name, bare] of Object.entries(RENAMES)) {
      const step = byId(`0.20.0/renamed/${name}`);
      expect(step.plain).toContain(bare);
      expect(step.auto).toEqual({ codemod: 'hds-prefix', args: [] });
    }
  });
});

describe('0.20.0 codemods', () => {
  const codemods = new Set(LEDGER.steps.flatMap((step) => (step.auto ? [step.auto.codemod] : [])));

  it('runs the four codemod bins 0.20.0 ships, and nothing else', () => {
    expect([...codemods].sort()).toEqual(Object.keys(NEXT.bin).sort());
    expect([...codemods].sort()).toEqual([
      'hds-not-found-pattern',
      'hds-patterns-subpath',
      'hds-prefix',
      'hds-tile-grid',
    ]);
  });

  it('moves every root -> /patterns name with hds-patterns-subpath, whose name list has it', () => {
    const { names } = read('codemods/patterns-subpath.names.json');
    expect(stepsOf('moved').length).toBe(32);
    for (const step of stepsOf('moved')) {
      expect(step.auto, step.id).toEqual({ codemod: 'hds-patterns-subpath', args: [] });
      expect(names, step.id).toContain(subject(step));
    }
  });

  it('rewrites NotFoundPattern and TileGrid with their own codemods; TileGridProps stays manual', () => {
    expect(byId('0.20.0/folded/NotFoundPattern').auto.codemod).toBe('hds-not-found-pattern');
    expect(byId('0.20.0/folded/TileGrid').auto.codemod).toBe('hds-tile-grid');
    expect(byId('0.20.0/folded/TileGridProps').auto).toBeUndefined();
  });
});

describe('0.20.0 package steps', () => {
  it('lists the five dependencies CHANGELOG.md:98 drops, and the two :59 drops, as dependency steps', () => {
    const dropped = {
      '@radix-ui/react-context-menu': '^2.3.2',
      '@radix-ui/react-hover-card': '^1.1.18',
      '@radix-ui/react-toolbar': '^1.1.14',
      'date-fns': '^4.4.0',
      'react-day-picker': '^10.0.1',
      '@radix-ui/react-aspect-ratio': '^1.1.11',
      '@radix-ui/react-toggle': '^1.1.13',
    };
    expect(stepsOf('dependency').map(subject).sort()).toEqual(Object.keys(dropped).sort());
    for (const [name, range] of Object.entries(dropped)) {
      const step = byId(`0.20.0/dependency/${name}`);
      expect(step).toMatchObject({
        impact: 'breaking',
        range,
        detect: { bareImports: [name] },
        facts: [`dependency-removed:${name}`],
      });
    }
  });

  it('deprecates StatusDot and StatusDotProps for removal in 0.21.0', () => {
    for (const name of ['StatusDot', 'StatusDotProps']) {
      expect(byId(`0.20.0/deprecated/${name}`)).toMatchObject({
        impact: 'none',
        removeIn: '0.21.0',
        source: 'CHANGELOG.md:68',
        detect: { imports: [{ from: ROOT, names: [name] }] },
      });
    }
  });
});

describe('0.20.0 look and behavior steps (CHANGELOG prose)', () => {
  it('cites the pressed Button, the selectable Card keys and the overlay names at the lines hds#447 names', () => {
    expect(byId('0.20.0/look/Button-pressed')).toMatchObject({
      impact: 'look',
      source: 'CHANGELOG.md:7',
    });
    expect(byId('0.20.0/behavior/Card-selectable-keys')).toMatchObject({
      impact: 'behavior',
      source: 'CHANGELOG.md:41',
    });
    expect(byId('0.20.0/behavior/Select-Combobox-overlay-names')).toMatchObject({
      impact: 'behavior',
      source: 'CHANGELOG.md:75',
    });
    expect(byId('0.20.0/behavior/Card-selectable-keys').plain).toMatch(/Enter/);
    expect(imported(byId('0.20.0/behavior/Card-selectable-keys'))).toContain('SelectableCard');
  });

  it('marks every prose step backfilled, citing a line inside the 0.20.0 section', () => {
    const changelog = readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8').split('\n');
    const heading = changelog.indexOf('## 0.20.0');
    const end = changelog.indexOf('## 0.19.1');
    const prose = LEDGER.steps.filter((step) => step.source.startsWith('CHANGELOG.md:'));
    expect(prose.length).toBeGreaterThanOrEqual(10);
    for (const step of prose) {
      expect(step.backfilled, step.id).toBe(true);
      const live = heading + Number(step.source.split(':')[1]) - 3;
      expect(live, step.id).toBeGreaterThan(heading);
      expect(live, step.id).toBeLessThan(end);
      expect(changelog[live].trim(), step.id).not.toBe('');
    }
  });

  it('gives every look and behavior step a way to find it in consumer code', () => {
    for (const step of [...stepsOf('look'), ...stepsOf('behavior')]) {
      expect(step.detect, step.id).toBeDefined();
    }
  });
});
