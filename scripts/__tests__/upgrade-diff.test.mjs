/**
 * scripts/upgrade/diff.mjs (hds#447): the facts between two release snapshots,
 * the input a ledger's steps must account for. Expected facts are written out
 * by hand from the two small snapshots below.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffSnapshots, factId } from '../upgrade/diff.mjs';
import { formatJson } from '../upgrade/format.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const CLI = join(REPO, 'scripts/upgrade/diff.mjs');

function snapshot(overrides) {
  return {
    format: 1,
    name: '@hirobius/design-system',
    version: '1.0.0',
    entries: {},
    exportsKeys: [],
    dependencies: {},
    peerDependencies: {},
    engines: {},
    bin: {},
    files: [],
    ...overrides,
  };
}

/** An entry's names, each declared in a module named after it (`Page` in src/page). */
const own = (...names) => Object.fromEntries(names.map((n) => [n, `src/${n.toLowerCase()}`]));

const PREV = snapshot({
  version: '1.0.0',
  entries: {
    // Calendar is the date picker here; /icons' Calendar is lucide's icon.
    '.': own('Calendar', 'Gone', 'HdsGone', 'Kept', 'Page', 'Tile'),
    './icons': { Calendar: 'src/icons' },
    './old': own('OldThing'),
    './patterns': own('Page', 'Shell'),
  },
  exportsKeys: ['.', './icons', './old', './patterns', './styles.css'],
  dependencies: { 'date-fns': '^4.4.0', clsx: '^2.1.1' },
  peerDependencies: {
    react: { range: '^18.3.0', optional: false },
    lenis: { range: '^1.3.0', optional: true },
    zod: { range: '^3.23.0', optional: true },
  },
  engines: { node: '>=20' },
  bin: { 'hds-a': 'codemods/a.mjs', 'hds-old': 'codemods/old.mjs' },
});

const NEXT = snapshot({
  version: '1.1.0',
  entries: {
    '.': own('Fresh', 'Kept'),
    './icons': { Calendar: 'src/icons' },
    './new': own('NewThing'),
    './patterns': own('Page', 'Shell', 'Tile'),
  },
  exportsKeys: ['.', './icons', './new', './patterns', './styles.css'],
  dependencies: { clsx: '^2.1.1', tslib: '^2.0.0' },
  peerDependencies: {
    react: { range: '^18.3.0 || ^19.0.0', optional: false },
    lenis: { range: '^1.3.0', optional: false },
  },
  engines: { node: '>=22', pnpm: '>=8' },
  bin: { 'hds-a': 'codemods/a.mjs', 'hds-new': 'codemods/new.mjs' },
});

describe('diffSnapshots', () => {
  it('lists every removal, move, addition and package change, removals first', () => {
    expect(diffSnapshots(PREV, NEXT)).toEqual([
      // A same-named export elsewhere is not a move when it is another module's.
      { id: 'removed:.:Calendar', kind: 'removed', entry: '.', name: 'Calendar' },
      { id: 'removed:.:Gone', kind: 'removed', entry: '.', name: 'Gone' },
      { id: 'removed:.:HdsGone', kind: 'removed', entry: '.', name: 'HdsGone' },
      { id: 'removed:./old:OldThing', kind: 'removed', entry: './old', name: 'OldThing' },
      // Page already lived on /patterns; Tile joined it in this release.
      { id: 'moved:.:Page', kind: 'moved', name: 'Page', from: '.', to: './patterns' },
      { id: 'moved:.:Tile', kind: 'moved', name: 'Tile', from: '.', to: './patterns' },
      { id: 'added:.:Fresh', kind: 'added', entry: '.', name: 'Fresh' },
      { id: 'added:./new:NewThing', kind: 'added', entry: './new', name: 'NewThing' },
      { id: 'exports-key-removed:./old', kind: 'exports-key-removed', key: './old' },
      { id: 'exports-key-added:./new', kind: 'exports-key-added', key: './new' },
      {
        id: 'dependency-removed:date-fns',
        kind: 'dependency-removed',
        name: 'date-fns',
        range: '^4.4.0',
      },
      { id: 'dependency-added:tslib', kind: 'dependency-added', name: 'tslib', range: '^2.0.0' },
      {
        id: 'peer-changed:lenis',
        kind: 'peer-changed',
        name: 'lenis',
        from: { range: '^1.3.0', optional: true },
        to: { range: '^1.3.0', optional: false },
      },
      {
        id: 'peer-changed:react',
        kind: 'peer-changed',
        name: 'react',
        from: { range: '^18.3.0', optional: false },
        to: { range: '^18.3.0 || ^19.0.0', optional: false },
      },
      {
        id: 'peer-changed:zod',
        kind: 'peer-changed',
        name: 'zod',
        from: { range: '^3.23.0', optional: true },
        to: null,
      },
      {
        id: 'engines-changed:node',
        kind: 'engines-changed',
        name: 'node',
        from: '>=20',
        to: '>=22',
      },
      { id: 'engines-changed:pnpm', kind: 'engines-changed', name: 'pnpm', from: null, to: '>=8' },
      { id: 'bin-removed:hds-old', kind: 'bin-removed', name: 'hds-old', path: 'codemods/old.mjs' },
      { id: 'bin-added:hds-new', kind: 'bin-added', name: 'hds-new', path: 'codemods/new.mjs' },
    ]);
  });

  it('finds nothing between a snapshot and itself', () => {
    expect(diffSnapshots(PREV, PREV)).toEqual([]);
  });

  it('moves a name that left one subpath for another, not only the root', () => {
    const prev = snapshot({ entries: { './a': own('X'), './b': {} } });
    const next = snapshot({ entries: { './a': {}, './b': own('X') } });
    expect(diffSnapshots(prev, next)).toEqual([
      { id: 'moved:./a:X', kind: 'moved', name: 'X', from: './a', to: './b' },
    ]);
  });

  it('gives each fact a stable id', () => {
    expect(factId({ kind: 'removed', entry: './patterns', name: 'Toolbar' })).toBe(
      'removed:./patterns:Toolbar',
    );
    expect(factId({ kind: 'moved', name: 'Page', from: '.', to: './patterns' })).toBe(
      'moved:.:Page',
    );
    expect(factId({ kind: 'dependency-removed', name: 'date-fns' })).toBe(
      'dependency-removed:date-fns',
    );
    expect(factId({ kind: 'exports-key-added', key: './icons' })).toBe('exports-key-added:./icons');
  });
});

/** A css section (scripts/build-css-contract.mjs) with the given bundles. */
const bundle = (overrides = {}) => ({
  classes: [],
  fontFaces: [],
  layers: [],
  variables: {},
  ...overrides,
});
const css = (bundles, publicClasses = []) => ({ format: 1, bundles, publicClasses });

describe('diffSnapshots: CSS facts (hds#449)', () => {
  const satoshi = { family: 'Satoshi', weight: '400', style: 'normal', src: ['satoshi-400.woff2'] };
  const prev = snapshot({
    css: css(
      {
        './tokens.css': bundle({
          classes: ['dark', 'flex', 'hds-focus', 'hds-gone', 'legacy-card', 'max-w-2xl'],
          fontFaces: [satoshi],
          variables: {
            '--gone': { ':root': '1px' },
            '--size-xs': { ':root': '13px', '[data-density=compact]': '12px' },
            '--same': { ':root': 'red' },
            '--tw-ring-shadow': { ':root': '0 0 #0000' },
          },
        }),
        './variables.css': bundle({ variables: { '--gone': { ':root': '1px' } } }),
      },
      ['legacy-card'],
    ),
  });
  const next = snapshot({
    css: css({
      './tokens.css': bundle({
        classes: ['dark', 'hds-focus'],
        variables: {
          '--size-xs': { ':root': '12px', '[data-theme=dark]': '11px' },
          '--same': { ':root': 'red' },
          '--fresh': { ':root': '0' },
        },
      }),
      './variables.css': bundle(),
    }),
  });

  it('lists removed variables, changed values per context, removed public classes, removed utilities and removed font faces', () => {
    expect(diffSnapshots(prev, next)).toEqual([
      {
        id: 'css-var-removed:--gone',
        kind: 'css-var-removed',
        name: '--gone',
        bundles: ['./tokens.css', './variables.css'],
      },
      {
        id: 'css-var-changed:--size-xs::root',
        kind: 'css-var-changed',
        name: '--size-xs',
        context: ':root',
        from: '13px',
        to: '12px',
        bundles: ['./tokens.css'],
      },
      {
        id: 'css-var-changed:--size-xs:[data-density=compact]',
        kind: 'css-var-changed',
        name: '--size-xs',
        context: '[data-density=compact]',
        from: '12px',
        to: null,
        bundles: ['./tokens.css'],
      },
      {
        id: 'css-var-changed:--size-xs:[data-theme=dark]',
        kind: 'css-var-changed',
        name: '--size-xs',
        context: '[data-theme=dark]',
        from: null,
        to: '11px',
        bundles: ['./tokens.css'],
      },
      // hds-* by prefix, legacy-card because the older manifest called it public.
      {
        id: 'class-removed:hds-gone',
        kind: 'class-removed',
        name: 'hds-gone',
        bundles: ['./tokens.css'],
      },
      {
        id: 'class-removed:legacy-card',
        kind: 'class-removed',
        name: 'legacy-card',
        bundles: ['./tokens.css'],
      },
      {
        id: 'utility-removed:flex',
        kind: 'utility-removed',
        name: 'flex',
        bundles: ['./tokens.css'],
      },
      {
        id: 'utility-removed:max-w-2xl',
        kind: 'utility-removed',
        name: 'max-w-2xl',
        bundles: ['./tokens.css'],
      },
      {
        id: 'font-face-removed:Satoshi/400/normal',
        kind: 'font-face-removed',
        family: 'Satoshi',
        weight: '400',
        style: 'normal',
        bundles: ['./tokens.css'],
      },
    ]);
  });

  it('ignores Tailwind --tw-* plumbing, additions, and a stylesheet whose exports key left', () => {
    const ids = diffSnapshots(prev, next).map((f) => f.id);
    expect(ids.filter((id) => id.includes('--tw-') || id.includes('--fresh'))).toEqual([]);
    const gone = snapshot({ css: css({ './tokens.css': prev.css.bundles['./tokens.css'] }) });
    expect(diffSnapshots(gone, snapshot({ css: css({}) }))).toEqual([]);
  });

  it('has no CSS facts unless both snapshots carry a css section', () => {
    expect(diffSnapshots(prev, snapshot())).toEqual([]);
    expect(diffSnapshots(snapshot(), next)).toEqual([]);
  });

  it('gives CSS facts stable ids', () => {
    expect(factId({ kind: 'css-var-removed', name: '--x' })).toBe('css-var-removed:--x');
    expect(factId({ kind: 'css-var-changed', name: '--x', context: ':root' })).toBe(
      'css-var-changed:--x::root',
    );
    expect(factId({ kind: 'class-removed', name: 'hds-focus' })).toBe('class-removed:hds-focus');
    expect(
      factId({ kind: 'font-face-removed', family: 'Mono', weight: '400', style: 'italic' }),
    ).toBe('font-face-removed:Mono/400/italic');
  });
});

describe('diff.mjs CLI', () => {
  let dir;
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('prints the facts between two snapshot files as JSON', () => {
    dir = mkdtempSync(join(tmpdir(), 'hds-diff-'));
    writeFileSync(join(dir, 'a.json'), formatJson(PREV));
    writeFileSync(join(dir, 'b.json'), formatJson(NEXT));
    const res = spawnSync(process.execPath, [CLI, join(dir, 'a.json'), join(dir, 'b.json')], {
      encoding: 'utf8',
    });
    expect(res.status).toBe(0);
    expect(JSON.parse(res.stdout)).toEqual(diffSnapshots(PREV, NEXT));
  });

  it('reads committed releases by version', () => {
    const res = spawnSync(process.execPath, [CLI, '0.19.1', '0.20.0'], { encoding: 'utf8' });
    expect(res.status).toBe(0);
    const facts = JSON.parse(res.stdout);
    expect(facts).toContainEqual({
      id: 'dependency-removed:date-fns',
      kind: 'dependency-removed',
      name: 'date-fns',
      range: '^4.4.0',
    });
  });
});
