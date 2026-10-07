/**
 * The backfilled ledgers 0.17.0, 0.18.0, 0.19.0 and 0.19.1 (hds#450): ops and
 * folio resolve 0.16.0, so their upgrade crosses these releases too. API and
 * package steps come from the snapshot diffs, which hold only additions here;
 * look, behavior and deprecation steps come from each release's CHANGELOG
 * section, cited as the file read when it shipped.
 *
 * Expectations come from hds#450 (the lines it names, in today's CHANGELOG),
 * npm's publish dates and the release notes, not from the generator.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkReleaseDir } from '../upgrade/schema.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const read = (file) => JSON.parse(readFileSync(join(REPO, file), 'utf8'));
const CHANGELOG = readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8').split('\n');
// Today's CHANGELOG once a later release ships: `changeset version` writes the
// new section above every older one, so each older section moves down.
const AFTER_NEXT_RELEASE = [
  ...CHANGELOG.slice(0, 2),
  '## 9.9.9',
  '',
  '### Patch Changes',
  '',
  '- 0000000: A later release.',
  '',
  ...CHANGELOG.slice(2),
];
const CHANGELOGS = [
  ['today', CHANGELOG],
  ['after a later release', AFTER_NEXT_RELEASE],
];
const ROOT = '@hirobius/design-system';

const BACKFILLED = ['0.17.0', '0.18.0', '0.19.0', '0.19.1'];
const ledger = (version) => read(`upgrade/releases/${version}.json`);
const byId = (id) => ledger(id.split('/')[0]).steps.find((step) => step.id === id);

/**
 * The 1-based line of `changelog` that a citation names. A citation is
 * numbered as the file read when its release shipped, with the release heading
 * on line 3; later releases only ever prepend sections.
 */
function liveLine(version, source, changelog = CHANGELOG) {
  const heading = changelog.indexOf(`## ${version}`);
  return heading + Number(source.split(':')[1]) - 3 + 1;
}

/** The changeset entry (`- <hash>: ...`) that holds the cited line. */
function citedEntry(version, source, changelog) {
  for (let i = liveLine(version, source, changelog) - 1; i >= 0; i--) {
    if (changelog[i].startsWith('- ')) return changelog[i];
  }
  return undefined;
}

describe('the backfilled ledgers 0.17.0 to 0.19.1', () => {
  it('are the releases after 0.16.0, with their npm publish day and bump, backfilled', () => {
    const expected = {
      '0.17.0': 'minor',
      '0.18.0': 'minor',
      '0.19.0': 'minor',
      '0.19.1': 'patch',
    };
    for (const [version, bump] of Object.entries(expected)) {
      // npm published all four on 2026-09-30 (UTC).
      expect(ledger(version), version).toMatchObject({
        version,
        date: '2026-09-30',
        bump,
        backfilled: true,
      });
    }
  });

  it('validate against upgrade/schema.json', () => {
    expect(checkReleaseDir(join(REPO, 'upgrade/releases'))).toEqual([]);
  });

  it('mark every prose step backfilled, citing a nonblank line inside its own release section', () => {
    for (const version of BACKFILLED) {
      const heading = CHANGELOG.indexOf(`## ${version}`);
      const end = CHANGELOG.findIndex((line, i) => i > heading && line.startsWith('## '));
      for (const step of ledger(version).steps) {
        expect(step.source, step.id).toMatch(/^CHANGELOG\.md:\d+$/);
        expect(step.backfilled, step.id).toBe(true);
        const line = liveLine(version, step.source);
        expect(line - 1, step.id).toBeGreaterThan(heading);
        expect(line - 1, step.id).toBeLessThan(end);
        expect(CHANGELOG[line - 1].trim(), step.id).not.toBe('');
      }
    }
  });

  it('give every look and behavior step a way to find it in consumer code', () => {
    for (const version of BACKFILLED) {
      for (const step of ledger(version).steps) {
        if (step.kind === 'look' || step.kind === 'behavior') {
          expect(step.detect, step.id).toBeDefined();
        }
      }
    }
  });
});

// hds#450 numbers its lines as CHANGELOG.md read at 0.20.0, where the 0.17.0
// heading is line 134 and the 0.19.0 heading line 110. A ledger numbers them as
// the file read when its own release shipped, heading on line 3, so the type
// ramp's 203-209 is 72-78, the Table ARIA fix's 337 is 206, the overlay
// portals' 114 is 7 and the compact density remap's 115 is 8. Those numbers
// never move; today's do, each time a release adds its section on top.
describe('the lines hds#450 names, numbered as the CHANGELOG read at each release', () => {
  it('cite the type ramp at CHANGELOG.md:72-78 and the Table ARIA fix at :206 for 0.17.0', () => {
    const ramp = Number(byId('0.17.0/look/type-ramp').source.split(':')[1]);
    expect(ramp).toBeGreaterThanOrEqual(72);
    expect(ramp).toBeLessThanOrEqual(78);
    expect(byId('0.17.0/behavior/Table-aria-structure').source).toBe('CHANGELOG.md:206');
  });

  it('cite the overlay portals at CHANGELOG.md:7 and the compact density remap at :8 for 0.19.0', () => {
    expect(byId('0.19.0/behavior/overlay-portals').source).toBe('CHANGELOG.md:7');
    expect(byId('0.19.0/look/compact-density').source).toBe('CHANGELOG.md:8');
    expect(byId('0.19.0/look/Table-density-inherit').source).toBe('CHANGELOG.md:8');
  });

  it.each(CHANGELOGS)('find the entries hds#450 means in the CHANGELOG %s', (_, changelog) => {
    const entry = (id) => citedEntry(id.split('/')[0], byId(id).source, changelog);
    expect(entry('0.17.0/look/type-ramp')).toMatch(/^- d41c65e: Standard type ramp/);
    expect(entry('0.17.0/behavior/Table-aria-structure')).toMatch(
      /^- d41c65e: Table: fix invalid ARIA structure/,
    );
    expect(entry('0.19.0/behavior/overlay-portals')).toMatch(/^- 731c669: Portalled overlays/);
    expect(entry('0.19.0/look/compact-density')).toMatch(/^- a47459b: `data-density="compact"`/);
  });
});

describe('0.17.0', () => {
  it('records the type ramp as a look step', () => {
    const step = byId('0.17.0/look/type-ramp');
    expect(step).toMatchObject({ kind: 'look', impact: 'look', backfilled: true });
    expect(step.plain).toMatch(/16px instead of 17px/);
    expect(step.detect.classes).toContain('text-xs');
    expect(step.detect.cssVars).toContain('--primitive-typography-size-xs');
  });

  it('records the h2 line height the type ramp entry moved from 42px to 40px', () => {
    // v0.16.0 tokens.css: --semantic-typography-h2-line-height: 42px; v0.17.0: 40px.
    const step = byId('0.17.0/look/h2-line-height');
    expect(step).toMatchObject({ kind: 'look', impact: 'look', backfilled: true });
    expect(step.plain).toMatch(/42px/);
    expect(step.plain).toMatch(/40px/);
    expect(step.detect.cssVars).toEqual(['--semantic-typography-h2-line-height']);
    expect(citedEntry('0.17.0', step.source, CHANGELOG)).toMatch(/^- d41c65e: Standard type ramp/);
    const [source] = step.detect.regex;
    expect(new RegExp(source).test('<Text variant="heading2">')).toBe(true);
    expect(new RegExp(source).test('<HeadingStack level="heading2" />')).toBe(true);
    expect(new RegExp(source).test('<Text variant="heading3">')).toBe(false);
  });

  it('records the Table ARIA structure as a behavior step', () => {
    const step = byId('0.17.0/behavior/Table-aria-structure');
    expect(step).toMatchObject({
      impact: 'behavior',
      detect: { imports: [{ from: ROOT, names: ['Table'] }], jsx: ['Table'] },
    });
    expect(step.plain).toMatch(/columnheader/);
  });

  it('deprecates the 21 root pattern imports, for removal in 1.0.0', () => {
    // CHANGELOG.md 0.20.0 names the 21 when it removes them (hds#389 D6).
    const patterns = [
      'ActivityFeed',
      'AppShell',
      'AssetImg',
      'Calendar',
      'Carousel',
      'CodeBlock',
      'CommandPalette',
      'DocLinkCard',
      'ErrorPattern',
      'FileInput',
      'Form',
      'Lightbox',
      'NavItem',
      'OverflowList',
      'Page',
      'Reveal',
      'SideNav',
      'Stepper',
      'Toolbar',
      'TopNav',
      'TreeList',
    ];
    for (const name of patterns) {
      const step = byId(`0.17.0/deprecated/${name}`);
      expect(step, name).toMatchObject({
        impact: 'none',
        removeIn: '1.0.0',
        detect: { imports: [{ from: ROOT, names: [name] }] },
      });
      expect(step.plain, name).toContain(`${ROOT}/patterns`);
    }
  });

  it('deprecates the six Hds* names for their bare names, for removal in 1.0.0', () => {
    const bare = {
      HdsCheckbox: 'Checkbox',
      HdsRadio: 'Radio',
      HdsSelect: 'Select',
      HdsSlider: 'Slider',
      HdsToggle: 'Toggle',
      HdsTooltip: 'Tooltip',
    };
    for (const [name, to] of Object.entries(bare)) {
      const step = byId(`0.17.0/deprecated/${name}`);
      expect(step, name).toMatchObject({
        removeIn: '1.0.0',
        detect: { imports: [{ from: ROOT, names: [name] }] },
      });
      expect(step.plain, name).toContain(`use ${to},`);
    }
  });

  it('deprecates the seven hds#206 spacing aliases, each naming its replacement', () => {
    // $deprecated in the 0.17.0 tarball's hirobius.tokens.json.
    const aliases = {
      'semantic.space.component.gap': 'semantic.space.scale.xs',
      'semantic.space.component.padding': 'semantic.space.surface.padding',
      'semantic.space.layout.tight': 'semantic.space.scale.sm',
      'semantic.space.layout.normal': 'semantic.space.scale.md',
      'semantic.space.layout.gutter': 'semantic.space.region.gutter',
      'semantic.space.layout.inset': 'semantic.space.scale.lg',
      'semantic.space.layout.spacious': 'semantic.space.scale.xl',
    };
    for (const [path, to] of Object.entries(aliases)) {
      const step = byId(`0.17.0/deprecated/${path}`);
      expect(step, path).toMatchObject({ impact: 'none', removeIn: '1.0.0' });
      expect(step.detect.cssVars, path).toEqual([`--${path.replaceAll('.', '-')}`]);
      expect(step.plain, path).toContain(to);
    }
  });

  it('holds exactly those 34 deprecations', () => {
    expect(ledger('0.17.0').steps.filter((s) => s.kind === 'deprecated')).toHaveLength(34);
  });

  it('records that hds-focus rings now show on every keyboard focus, which no HDS code enabled before', () => {
    const step = byId('0.17.0/look/hds-focus-ring');
    expect(step.detect.classes).toEqual(['hds-focus']);
    expect(step.plain).toMatch(/data-input-modality/);
  });
});

describe('0.19.0', () => {
  it('records the overlay portals as a behavior step', () => {
    const step = byId('0.19.0/behavior/overlay-portals');
    expect(step.impact).toBe('behavior');
    expect(step.plain).toMatch(/data-hds/);
    const imported = step.detect.imports.flatMap((i) => i.names);
    for (const name of ['Dialog', 'AlertDialog', 'Menu', 'Popover', 'Select', 'Tooltip']) {
      expect(imported, name).toContain(name);
    }
  });

  it('finds the overlays that 0.19.0 components open through Popover and Dialog too', () => {
    // At v0.19.0, combobox.tsx, multi-selector.tsx and the three date inputs
    // open a Popover, and command-palette.tsx a Dialog with its scrim.
    const portals = byId('0.19.0/behavior/overlay-portals');
    const composites = [
      'Combobox',
      'MultiSelector',
      'DateInput',
      'DateRangeInput',
      'DateTimeInput',
      'CommandPalette',
    ];
    for (const name of composites) {
      expect(portals.detect.imports.find((i) => i.from === ROOT).names, name).toContain(name);
      expect(portals.detect.jsx, name).toContain(name);
    }
    for (const named of ['Combobox', 'MultiSelector', 'CommandPalette', 'date inputs']) {
      expect(portals.plain, named).toContain(named);
    }
    const patterns = portals.detect.imports.find((i) => i.from === `${ROOT}/patterns`);
    expect(patterns.names).toContain('CommandPalette');

    const scrim = byId('0.19.0/look/modal-scrim');
    expect(scrim.detect.jsx).toContain('CommandPalette');
    expect(scrim.plain).toContain('CommandPalette');
  });

  it('finds the three theme.css card rules that moved to the container radius', () => {
    const step = byId('0.19.0/look/container-radius');
    expect(step.detect.classes).toEqual(
      expect.arrayContaining([
        'hds-card',
        'hds-doc-link-card',
        'hds-soft-nav-card',
        'hds-sketchbook-canvas-stage',
      ]),
    );
  });

  it('records the compact density remap as a look step', () => {
    const step = byId('0.19.0/look/compact-density');
    expect(step.impact).toBe('look');
    const [source] = step.detect.regex;
    expect(new RegExp(source).test('<main data-density="compact">')).toBe(true);
    expect(new RegExp(source).test("root.setAttribute('data-density', 'compact')")).toBe(true);
    expect(new RegExp(source).test('<main data-density="comfortable">')).toBe(false);
  });
});

describe('0.18.0 and 0.19.1', () => {
  it('hold no step: 0.18.0 only added the hds-patterns-subpath bin, 0.19.1 changed no export, prop or markup', () => {
    expect(ledger('0.18.0').steps).toEqual([]);
    expect(ledger('0.19.1').steps).toEqual([]);
    expect(ledger('0.18.0').summary).toMatch(/hds-patterns-subpath/);
  });
});
