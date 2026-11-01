/**
 * Tests for codemods/token-aliases.mjs: border.subdued and the seven hds#206
 * spacing aliases, removed in 0.33.0 (hds#625), become the tokens replacing them.
 * Seams: `transformSource` (pure), `runCodemod`, the CLI, and the package wiring.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { useCodemodFixture, expectShipped } from './helpers/codemod-fixture.mjs';
import { transformSource, runCodemod, SPACE, COLOR } from '../../codemods/token-aliases.mjs';
import { CODEMODS } from '../../codemods/registry.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');

describe('transformSource', () => {
  it.each([
    ['var(--semantic-space-component-gap)', 'var(--semantic-space-scale-xs)'],
    ['var(--semantic-space-component-padding)', 'var(--semantic-space-surface-padding)'],
    ['var(--semantic-space-layout-gutter)', 'var(--semantic-space-region-gutter)'],
    ['var(--semantic-space-layout-tight)', 'var(--semantic-space-scale-sm)'],
    ['var(--semantic-space-layout-normal)', 'var(--semantic-space-scale-md)'],
    ['var(--semantic-space-layout-inset)', 'var(--semantic-space-scale-lg)'],
    ['var(--semantic-space-layout-spacious)', 'var(--semantic-space-scale-xl)'],
    ['var(--semantic-color-border-subdued)', 'var(--semantic-color-border-default)'],
    ['hds.semantic.space.component.gap', 'hds.semantic.space.scale.xs'],
    ['hds.semantic.space.layout.gutter', 'hds.semantic.space.region.gutter'],
    ['"semantic.space.component.padding"', '"semantic.space.surface.padding"'],
    ['"{semantic.space.layout.spacious}"', '"{semantic.space.scale.xl}"'],
    ['"{semantic.color.border.subdued}"', '"{semantic.color.border.default}"'],
    ['p-layout-tight', 'p-scale-sm'],
    ['-mt-layout-inset', '-mt-scale-lg'],
    ['md:gap-component-gap', 'md:gap-scale-xs'],
    ['hover:!px-component-padding', 'hover:!px-surface-padding'],
    ['gap-x-layout-gutter space-y-layout-normal', 'gap-x-region-gutter space-y-scale-md'],
    [
      'w-layout-tight h-layout-gutter size-layout-normal',
      'w-scale-sm h-region-gutter size-scale-md',
    ],
    [
      'top-layout-inset inset-x-component-gap -translate-y-layout-tight',
      'top-scale-lg inset-x-scale-xs -translate-y-scale-sm',
    ],
    [
      'basis-layout-spacious scroll-mt-layout-tight max-w-layout-inset',
      'basis-scale-xl scroll-mt-scale-sm max-w-scale-lg',
    ],
    ['padding: theme(spacing.layout-tight);', 'padding: theme(spacing.scale-sm);'],
    ["theme('spacing.component-padding')", "theme('spacing.surface-padding')"],
    ["borderColor: 'border.subdued'", "borderColor: 'border.default'"],
    ['stroke: "border.subdued"', 'stroke: "border.default"'],
  ])('%s -> %s', (before, after) => {
    const r = transformSource(before);
    expect(r.source).toBe(after);
    expect(r.changed).toBe(true);
    expect(r.sites).toBeGreaterThan(0);
  });

  it.each([
    '--semantic-space-component-medium',
    '--semantic-space-layout-gap',
    '--semantic-space-layout-tight-x',
    '--x--semantic-space-layout-tight',
    '--semantic-color-border-subdued2',
    'hds.semantic.space.layout.gap',
    'hds.semantic.space.component.medium',
    'mysemantic.space.layout.tight',
    'space.layout.tight',
    'p-component-medium',
    'grid-p-layout-tight',
    'card-layout-tight',
    'spacing.layout-gap',
    "gap: 'tight'",
    'border.subdued.hover',
    'a subdued label',
  ])('leaves %s alone', (src) => {
    const r = transformSource(src);
    expect(r.changed).toBe(false);
    expect(r.source).toBe(src);
    expect(r.sites).toBe(0);
    expect(r.edits).toEqual([]);
  });

  it('counts sites, names the aliases and reports changed lines before and after', () => {
    const src =
      'a\nx: var(--semantic-space-layout-tight) var(--semantic-color-border-subdued);\nb\n';
    const r = transformSource(src);
    expect(r.sites).toBe(2);
    expect(r.names).toEqual(['border.subdued', 'layout.tight']);
    expect(r.edits).toEqual([
      {
        line: 2,
        before: 'x: var(--semantic-space-layout-tight) var(--semantic-color-border-subdued);',
        after: 'x: var(--semantic-space-scale-sm) var(--semantic-color-border-default);',
      },
    ]);
  });

  it('is idempotent', () => {
    const src =
      "p-layout-tight hds.semantic.space.component.gap var(--semantic-space-layout-gutter) {semantic.color.border.subdued} 'border.subdued'";
    const once = transformSource(src);
    expect(once.source).toBe(
      "p-scale-sm hds.semantic.space.scale.xs var(--semantic-space-region-gutter) {semantic.color.border.default} 'border.default'",
    );
    const twice = transformSource(once.source);
    expect(twice.changed).toBe(false);
    expect(twice.source).toBe(once.source);
  });
});

describe('runCodemod', () => {
  const fx = useCodemodFixture('token-aliases', {
    nodeModules: 'hds.semantic.space.component.gap;\n',
  });

  it('reports files and sites without writing, and skips node_modules and clean files', () => {
    const before = readFileSync(join(fx.dir, 'needs-rewrite/src/panel.css'), 'utf8');
    const r = runCodemod({ root: fx.dir });
    expect(r.files.map((f) => f.file).sort()).toEqual([
      'needs-rewrite/src/panel.css',
      'needs-rewrite/src/panel.tsx',
      'needs-rewrite/tokens.json',
    ]);
    expect(r.manual).toEqual([]);
    expect(r.names).toEqual(Object.keys({ ...SPACE, ...COLOR }).sort());
    expect(readFileSync(join(fx.dir, 'needs-rewrite/src/panel.css'), 'utf8')).toBe(before);
  });

  it('writes when asked, and a second run changes nothing', () => {
    expect(runCodemod({ root: fx.dir, write: true }).files).toHaveLength(3);
    expect(readFileSync(join(fx.dir, 'needs-rewrite/src/panel.css'), 'utf8')).toBe(
      '.panel {\n  padding: var(--semantic-space-surface-padding);\n  margin: var(--semantic-space-scale-sm) var(--semantic-space-region-gutter);\n  border-bottom: 1px solid var(--semantic-color-border-default);\n}\n',
    );
    const tsx = readFileSync(join(fx.dir, 'needs-rewrite/src/panel.tsx'), 'utf8');
    expect(tsx).toContain('p-scale-md md:gap-scale-xs -mt-scale-lg space-y-scale-xl');
    expect(tsx).toContain("borderColor: 'border.default'");
    expect(tsx).toContain('gap: hds.semantic.space.scale.xs');
    const json = readFileSync(join(fx.dir, 'needs-rewrite/tokens.json'), 'utf8');
    expect(json).toContain('"{semantic.space.scale.sm}"');
    expect(json).toContain('"{semantic.color.border.default}"');
    expect(json).toContain('"semantic.space.surface.padding"');
    const again = runCodemod({ root: fx.dir, write: true });
    expect(again.files).toEqual([]);
    expect(again.sites).toBe(0);
    expect(readFileSync(join(fx.dir, 'needs-rewrite/src/panel.tsx'), 'utf8')).toBe(tsx);
  });

  it('does not enter a skipped directory', () => {
    const r = runCodemod({ root: fx.dir, skip: [join(fx.dir, 'needs-rewrite')] });
    expect(r.files).toEqual([]);
  });
});

describe('CLI', () => {
  const fx = useCodemodFixture('token-aliases');
  const run = (root, ...args) => fx.run('--root', root, ...args);

  it('--check exits 1 when a rewrite is needed and writes nothing', () => {
    const file = join(fx.dir, 'needs-rewrite/src/panel.tsx');
    const before = readFileSync(file, 'utf8');
    const r = run(fx.dir, '--check');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/panel\.tsx/);
    expect(readFileSync(file, 'utf8')).toBe(before);
  });

  it('--check exits 0 on a clean tree', () => {
    const r = run(join(fx.dir, 'clean'), '--check');
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('--dry-run prints -/+ lines, exits 0 and writes nothing', () => {
    const file = join(fx.dir, 'needs-rewrite/src/panel.css');
    const before = readFileSync(file, 'utf8');
    const r = run(fx.dir, '--dry-run');
    expect(r.status).toBe(0);
    const lines = r.stdout.split('\n');
    expect(lines).toContain('-   padding: var(--semantic-space-component-padding);');
    expect(lines).toContain('+   padding: var(--semantic-space-surface-padding);');
    expect(readFileSync(file, 'utf8')).toBe(before);
  });

  it('a real run rewrites, then --check exits 0 and a second run rewrites 0 files', () => {
    expect(run(fx.dir).status).toBe(0);
    expect(run(fx.dir, '--check').status).toBe(0);
    expect(run(fx.dir).stdout).toMatch(/rewrote 0 files/);
  });

  it('rejects an unknown argument with exit 2', () => {
    expect(run(fx.dir, '--nope').status).toBe(2);
  });
});

describe('wiring', () => {
  it('is registered and in package.json#bin and #files', () => {
    expect(CODEMODS['hds-token-aliases']).toEqual({ file: 'token-aliases.mjs' });
    expectShipped('token-aliases');
  });

  it('maps every removed alias to a token the source still has', () => {
    const tokens = JSON.parse(readFileSync(join(REPO, 'hirobius.tokens.json'), 'utf8'));
    const has = (path) => path.split('.').reduce((o, k) => o?.[k], tokens)?.$value !== undefined;
    for (const [from, to] of Object.entries(SPACE)) {
      expect(has(`semantic.space.${from}`), from).toBe(false);
      expect(has(`semantic.space.${to}`), to).toBe(true);
    }
    for (const [from, to] of Object.entries(COLOR)) {
      expect(has(`semantic.color.${from}`), from).toBe(false);
      expect(has(`semantic.color.${to}`), to).toBe(true);
    }
  });
});
