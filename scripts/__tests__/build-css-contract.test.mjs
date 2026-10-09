/**
 * scripts/build-css-contract.mjs (hds#449): the CSS a consumer can rely on,
 * read from each shipped stylesheet with a real parser (postcss): every custom
 * property with its value per context, the class names, the @font-face
 * entries and the @layer names.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONTRACT_FILE,
  buildCssContract,
  cssBundleContract,
  selectorClasses,
} from '../lib/css-contract.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const CLI = join(REPO, 'scripts/build-css-contract.mjs');

const temps = [];
afterEach(() => {
  while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
});

function writer(root) {
  return (rel, text) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  };
}

function packageDir(files, { publicClasses } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'hds-css-contract-'));
  temps.push(root);
  const write = writer(root);
  write(
    'package.json',
    JSON.stringify({
      name: '@hirobius/design-system',
      version: '1.0.0',
      exports: {
        '.': { types: './dist/types/index.d.ts', import: './dist/index.js' },
        './tokens.css': './dist/tokens.css',
        './static.css': './dist/static.css',
        './package.json': './package.json',
      },
    }),
  );
  if (publicClasses) write('public/hds-manifest.json', JSON.stringify({ publicClasses }));
  for (const [rel, text] of Object.entries(files)) write(rel, text);
  return root;
}

const TOKENS = [
  '@layer theme,base,utilities;',
  '@layer theme{:root,:host{--font-sans:Satoshi,sans-serif}}',
  ':root{--size-xs:13px;--brand:  #fff ;--size-xs:12px}',
  '[data-theme=dark]{--brand:#000}',
  '[data-theme=dark],.dark{--surface:#111}',
  '[data-density=compact]{--space-2:4px}',
  '[data-brand=pilot],[data-tenant=pilot]{--brand:red}',
  '@media (max-width:639px){:root{--size-xs:11px}}',
  '@layer utilities{.ring-2{--tw-ring-shadow:0 0 0 2px red}.sm\\:inline-block{display:inline-block}',
  ':where(.hds-stack-1\\.5>:not(:last-child)){margin:0}.hds-focus:focus-visible{outline:none}}',
  '@keyframes spin{from{opacity:0}to{opacity:1}}',
  '@property --tw-x{syntax:"*";inherits:false}',
  'a[href$=".pdf"]{color:red}',
  '@font-face{font-family:"Satoshi";font-weight:400;src:url(data:font/woff2;base64,AAAA) format("woff2")}',
].join('');

describe('selectorClasses', () => {
  it('reads class names, unescaped, and skips attribute values and strings', () => {
    expect(selectorClasses('.sm\\:inline-block:hover,.a>.b')).toEqual([
      'a',
      'b',
      'sm:inline-block',
    ]);
    expect(selectorClasses(':where(.hds-stack-1\\.5>:not(:last-child))')).toEqual([
      'hds-stack-1.5',
    ]);
    expect(selectorClasses('a[href$=".pdf"],[data-x=".y"]')).toEqual([]);
    expect(selectorClasses('.hds-w-1\\/2,.\\[--foo\\:bar\\]')).toEqual([
      '[--foo:bar]',
      'hds-w-1/2',
    ]);
    expect(selectorClasses('.\\31 0x')).toEqual(['10x']);
  });
});

describe('cssBundleContract', () => {
  const contract = cssBundleContract(TOKENS);

  it('records each custom property with its winning value per context', () => {
    expect(contract.variables['--size-xs']).toEqual({
      ':root': '12px',
      '@media (max-width:639px) :root': '11px',
    });
    expect(contract.variables['--brand']).toEqual({
      ':root': '#fff',
      '[data-brand=pilot],[data-tenant=pilot]': 'red',
      '[data-theme=dark]': '#000',
    });
    expect(contract.variables['--surface']).toEqual({ '[data-theme=dark],.dark': '#111' });
    expect(contract.variables['--space-2']).toEqual({ '[data-density=compact]': '4px' });
    expect(contract.variables['--font-sans']).toEqual({
      '@layer theme :root,:host': 'Satoshi,sans-serif',
    });
  });

  it('leaves out properties a utility class sets, and @property registrations', () => {
    expect(contract.variables['--tw-ring-shadow']).toBeUndefined();
    expect(contract.variables['--tw-x']).toBeUndefined();
  });

  it('lists every class a selector names, sorted, and no keyframe selector', () => {
    expect(contract.classes).toEqual([
      'dark',
      'hds-focus',
      'hds-stack-1.5',
      'ring-2',
      'sm:inline-block',
    ]);
  });

  it('records @font-face entries and @layer names in declaration order', () => {
    expect(contract.fontFaces).toEqual([
      { family: 'Satoshi', weight: '400', style: 'normal', src: ['data:font/woff2'] },
    ]);
    expect(contract.layers).toEqual(['theme', 'base', 'utilities']);
  });

  it('gives the same contract however the source rules are ordered', () => {
    const a = cssBundleContract(':root{--a:1}.x{}.y{}[data-theme=dark]{--a:2}');
    const b = cssBundleContract('[data-theme=dark]{--a:2}.y{}.x{}:root{--a:1}');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('keeps an !important value over a later plain one, and records the flag', () => {
    expect(cssBundleContract(':root{--a:1!important;--a:2}').variables['--a']).toEqual({
      ':root': '1 !important',
    });
  });

  it('reads a url() source as its basename', () => {
    const faces = cssBundleContract(
      "@font-face{font-family:Mono;font-style:italic;font-weight:400 700;src:local('Mono'),url('./fonts/mono-400.woff2?v=1') format('woff2')}",
    ).fontFaces;
    expect(faces).toEqual([
      {
        family: 'Mono',
        weight: '400 700',
        style: 'italic',
        src: ['local(Mono)', 'mono-400.woff2'],
      },
    ]);
  });
});

describe('buildCssContract', () => {
  it('reads every stylesheet package.json#exports names, keyed by its exports key, and the manifest publicClasses', () => {
    const dir = packageDir(
      { 'dist/tokens.css': TOKENS, 'dist/static.css': '.hds-card{color:red}' },
      { publicClasses: ['hds-focus', 'hds-card'] },
    );
    const contract = buildCssContract(dir);
    expect(Object.keys(contract)).toEqual(['format', 'bundles', 'publicClasses']);
    expect(contract.format).toBe(1);
    expect(Object.keys(contract.bundles)).toEqual(['./static.css', './tokens.css']);
    expect(contract.bundles['./static.css'].classes).toEqual(['hds-card']);
    expect(contract.publicClasses).toEqual(['hds-card', 'hds-focus']);
  });

  it('is null when the package ships none of its stylesheets, and names a missing one otherwise', () => {
    expect(buildCssContract(packageDir({}))).toBeNull();
    const dir = packageDir({ 'dist/tokens.css': TOKENS });
    expect(() => buildCssContract(dir)).toThrow(/\.\/static\.css.*dist\/static\.css/);
  });

  it('has no publicClasses for a package whose manifest predates them', () => {
    const dir = packageDir({ 'dist/tokens.css': TOKENS, 'dist/static.css': '' });
    expect(buildCssContract(dir).publicClasses).toEqual([]);
  });
});

describe('build-css-contract.mjs CLI', () => {
  const run = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

  it('writes dist/css-contract.json for --root, and --check passes on it, then fails when a stylesheet changes', () => {
    const dir = packageDir({ 'dist/tokens.css': TOKENS, 'dist/static.css': '' });
    expect(run(['--root', dir]).status).toBe(0);
    const text = readFileSync(join(dir, CONTRACT_FILE), 'utf8');
    expect(JSON.parse(text)).toEqual(buildCssContract(dir));
    expect(text.endsWith('\n')).toBe(true);
    expect(run(['--root', dir, '--check']).status).toBe(0);
    writeFileSync(join(dir, 'dist/static.css'), '.hds-new{}');
    const stale = run(['--root', dir, '--check']);
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain('node scripts/build-css-contract.mjs');
  }, 30_000);
});
