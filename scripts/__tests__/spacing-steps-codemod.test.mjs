/**
 * Tests for codemods/spacing-steps.mjs: primitive.space.px6 / px10 (off the 4px
 * grid, removed in 0.28.0) become the next roomier on-grid step.
 * Seams: `transformSource` (pure), `runCodemod`, the CLI, and the package wiring.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSource, runCodemod } from '../../codemods/spacing-steps.mjs';
import { CODEMODS } from '../../codemods/registry.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const CODEMOD = join(REPO, 'codemods/spacing-steps.mjs');
const FIXTURES = join(REPO, 'codemods/__fixtures__/spacing-steps');
const out = (src) => transformSource(src).source;

describe('transformSource', () => {
  it.each([
    ['--primitive-space-px6', '--primitive-space-2'],
    ['--primitive-space-px10', '--primitive-space-3'],
    ['padding: var(--primitive-space-px6);', 'padding: var(--primitive-space-2);'],
    ['hds.space.px6', 'hds.space.px8'],
    ['hds.space.px10', 'hds.space.px12'],
    ['tokens.space.px6 + 1', 'tokens.space.px8 + 1'],
    ['"primitive.space.px6"', '"primitive.space.2"'],
    ['"primitive.space.px10"', '"primitive.space.3"'],
    ['"{primitive.space.px6}"', '"{primitive.space.2}"'],
    ['"{primitive.space.px10}"', '"{primitive.space.3}"'],
    ['p-px6', 'p-2'],
    ['-mt-px10', '-mt-3'],
    ['md:gap-px6', 'md:gap-2'],
    ['hover:px-px10', 'hover:px-3'],
    ['gap-x-px6 gap-y-px10', 'gap-x-2 gap-y-3'],
    ['space-x-px6 space-y-px10', 'space-x-2 space-y-3'],
    ['py-px6 pt-px6 pr-px6 pb-px6 pl-px6 ps-px6 pe-px6', 'py-2 pt-2 pr-2 pb-2 pl-2 ps-2 pe-2'],
    [
      'm-px6 mx-px6 my-px6 mt-px6 mr-px6 mb-px6 ml-px6 ms-px6 me-px6',
      'm-2 mx-2 my-2 mt-2 mr-2 mb-2 ml-2 ms-2 me-2',
    ],
  ])('%s -> %s', (before, after) => {
    const r = transformSource(before);
    expect(r.source).toBe(after);
    expect(r.changed).toBe(true);
    expect(r.sites).toBeGreaterThan(0);
  });

  it.each([
    '--primitive-space-px1',
    '--primitive-space-px2',
    '--primitive-space-px60',
    '--primitive-space-px6-x',
    '--x--primitive-space-px6',
    'hds.space.px60',
    'hds.space.px1',
    'hds.semantic.space.px6',
    'primitive.space.px60',
    'p-px60',
    'p-px1',
    'grid-p-px6',
    'size-px6',
    'text-px10',
    'xp-px6',
  ])('leaves %s alone', (src) => {
    const r = transformSource(src);
    expect(r.changed).toBe(false);
    expect(r.source).toBe(src);
    expect(r.sites).toBe(0);
    expect(r.edits).toEqual([]);
  });

  it('counts sites and reports changed lines before and after', () => {
    const src = 'a\nx: var(--primitive-space-px6) var(--primitive-space-px10);\nb\n';
    const r = transformSource(src);
    expect(r.sites).toBe(2);
    expect(r.edits).toEqual([
      {
        line: 2,
        before: 'x: var(--primitive-space-px6) var(--primitive-space-px10);',
        after: 'x: var(--primitive-space-2) var(--primitive-space-3);',
      },
    ]);
  });

  it('rewrites every form in one file', () => {
    const src = 'p-px6 hds.space.px10 var(--primitive-space-px6) {primitive.space.px10}';
    expect(out(src)).toBe('p-2 hds.space.px12 var(--primitive-space-2) {primitive.space.3}');
  });

  it('is idempotent', () => {
    const src =
      'p-px6 -mt-px10 hds.space.px6 hds.space.px10 var(--primitive-space-px6) {primitive.space.px10}';
    const once = transformSource(src);
    const twice = transformSource(once.source);
    expect(twice.changed).toBe(false);
    expect(twice.source).toBe(once.source);
  });
});

describe('runCodemod', () => {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hds-spacing-'));
    cpSync(FIXTURES, dir, { recursive: true });
    mkdirSync(join(dir, 'clean/node_modules/x'), { recursive: true });
    writeFileSync(join(dir, 'clean/node_modules/x/index.js'), 'hds.space.px6;\n');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('reports files and sites without writing, and skips node_modules and clean files', () => {
    const before = readFileSync(join(dir, 'needs-rewrite/src/panel.css'), 'utf8');
    const r = runCodemod({ root: dir });
    expect(r.files.map((f) => f.file).sort()).toEqual([
      'needs-rewrite/src/panel.css',
      'needs-rewrite/src/panel.tsx',
      'needs-rewrite/tokens.json',
    ]);
    expect(r.manual).toEqual([]);
    expect(r.sites).toBeGreaterThan(0);
    expect(readFileSync(join(dir, 'needs-rewrite/src/panel.css'), 'utf8')).toBe(before);
  });

  it('writes when asked, and a second run changes nothing', () => {
    expect(runCodemod({ root: dir, write: true }).files).toHaveLength(3);
    expect(readFileSync(join(dir, 'needs-rewrite/src/panel.css'), 'utf8')).toBe(
      '.panel {\n  padding: var(--primitive-space-2);\n  margin: var(--primitive-space-3) var(--primitive-space-px1);\n}\n',
    );
    const tsx = readFileSync(join(dir, 'needs-rewrite/src/panel.tsx'), 'utf8');
    expect(tsx).toContain('p-2 -mt-3 md:gap-2 hover:px-3 space-y-2');
    expect(tsx).toContain('padding: hds.space.px8, margin: hds.space.px12');
    const json = readFileSync(join(dir, 'needs-rewrite/tokens.json'), 'utf8');
    expect(json).toContain('"{primitive.space.2}"');
    expect(json).toContain('"{primitive.space.3}"');
    expect(json).toContain('"primitive.space.2"');
    const again = runCodemod({ root: dir, write: true });
    expect(again.files).toEqual([]);
    expect(again.sites).toBe(0);
    expect(readFileSync(join(dir, 'needs-rewrite/src/panel.tsx'), 'utf8')).toBe(tsx);
  });

  it('does not enter a skipped directory', () => {
    const r = runCodemod({ root: dir, skip: [join(dir, 'needs-rewrite')] });
    expect(r.files).toEqual([]);
  });
});

describe('CLI', () => {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hds-spacing-cli-'));
    cpSync(FIXTURES, dir, { recursive: true });
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  const run = (root, ...args) =>
    spawnSync('node', [CODEMOD, '--root', root, ...args], { encoding: 'utf8' });

  it('--check exits 1 when a rewrite is needed and writes nothing', () => {
    const file = join(dir, 'needs-rewrite/src/panel.tsx');
    const before = readFileSync(file, 'utf8');
    const r = run(dir, '--check');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/panel\.tsx/);
    expect(readFileSync(file, 'utf8')).toBe(before);
  });

  it('--check exits 0 on a clean tree', () => {
    const r = run(join(dir, 'clean'), '--check');
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('--dry-run prints -/+ lines, exits 0 and writes nothing', () => {
    const file = join(dir, 'needs-rewrite/src/panel.css');
    const before = readFileSync(file, 'utf8');
    const r = run(dir, '--dry-run');
    expect(r.status).toBe(0);
    const lines = r.stdout.split('\n');
    expect(lines).toContain('-   padding: var(--primitive-space-px6);');
    expect(lines).toContain('+   padding: var(--primitive-space-2);');
    expect(readFileSync(file, 'utf8')).toBe(before);
  });

  it('a real run rewrites, then --check exits 0 and a second run rewrites 0 files', () => {
    expect(run(dir).status).toBe(0);
    expect(run(dir, '--check').status).toBe(0);
    expect(run(dir).stdout).toMatch(/rewrote 0 files/);
  });

  it('rejects an unknown argument with exit 2', () => {
    expect(run(dir, '--nope').status).toBe(2);
  });
});

describe('wiring', () => {
  it('is registered and in package.json#bin and #files', () => {
    const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
    expect(CODEMODS['hds-spacing-steps']).toEqual({ file: 'spacing-steps.mjs' });
    expect(pkg.bin['hds-spacing-steps']).toBe('codemods/spacing-steps.mjs');
    expect(pkg.files).toContain('codemods/spacing-steps.mjs');
  });
});
