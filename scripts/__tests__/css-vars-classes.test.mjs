/**
 * hds#459 class tokens: every HDS-shaped class token a consumer writes in
 * class / className (an hds-* class, or a Tailwind variant like
 * `hover:underline`) is checked against the target's css-contract.json. A
 * name the release never shipped is a Do by hand item, unless the consumer
 * compiles its own Tailwind: then a utility is info only.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { classFindings, compilesOwnTailwind, knownClasses } from '../../codemods/css-vars.mjs';
import { PKG, REPO, makeProject, npmLock, pkgJson, runCli } from './helpers/upgrade-fixtures.mjs';

const CONTRACT = {
  format: 1,
  bundles: {
    './styles.css': {
      classes: ['hds-card', 'sm:inline-block', 'hds-sr-only'],
      fontFaces: [],
      layers: [],
      variables: {},
    },
  },
  publicClasses: ['prose'],
};

describe('knownClasses', () => {
  it('is every class any bundle names plus publicClasses', () => {
    const k = knownClasses(CONTRACT);
    expect([...k].sort()).toEqual(['hds-card', 'hds-sr-only', 'prose', 'sm:inline-block']);
  });
});

describe('classFindings', () => {
  const known = knownClasses(CONTRACT);

  it('ops case: flags hover:underline as never shipped', () => {
    const src = '<a className="text-sm hover:underline">x</a>\n';
    expect(classFindings(src, known)).toEqual([{ name: 'hover:underline', line: 1 }]);
  });

  it('flags an unknown hds-* class and leaves shipped and consumer-own classes alone', () => {
    const src = [
      '<div class="hds-card my-thing sm:inline-block">',
      "  <span className={'hds-cardd'} />",
      '</div>',
    ].join('\n');
    expect(classFindings(src, known)).toEqual([{ name: 'hds-cardd', line: 2 }]);
  });

  it('reads only class attributes, never CSS or URLs', () => {
    const src = '.a:hover { color: red }\nconst u = "https://x.dev";\n<a href="mailto:x@y">\n';
    expect(classFindings(src, known)).toEqual([]);
  });

  it('reports each name once per line', () => {
    const src = '<i class="hover:underline"></i><b class="hover:underline"></b>\n';
    expect(classFindings(src, known)).toHaveLength(1);
  });
});

describe('compilesOwnTailwind', () => {
  it('is true when the package lists tailwindcss in any dependency field', () => {
    expect(compilesOwnTailwind({ devDependencies: { tailwindcss: '^4' } })).toBe(true);
    expect(compilesOwnTailwind({ dependencies: { react: '19' } })).toBe(false);
    expect(compilesOwnTailwind(undefined)).toBe(false);
  });
});

const posix = process.platform === 'win32' ? it.skip : it;
const built = existsSync(join(REPO, 'dist/css-contract.json'));

describe('upgrade command', () => {
  (built ? posix : it.skip)('lists hover:underline under Do by hand (ops-shaped)', () => {
    const root = makeProject({
      'package.json': pkgJson('ops', { [PKG]: '^0.16.0' }),
      'package-lock.json': npmLock('0.16.0'),
      'src/App.tsx': `import '${PKG}/styles.css';\nexport const A = () => <a className="hover:underline">x</a>;\n`,
    });
    const res = runCli(['upgrade', '--root', root, '--check', '--json', '--no-typecheck']);
    const report = JSON.parse(res.stdout);
    const item = report.doByHand.find((i) => i.id === 'hds-css-classes/unknown/hover:underline');
    expect(item).toBeDefined();
    expect(item.files).toEqual(['src/App.tsx']);
    expect(item.blocking).toBe(true);
    expect(res.code).not.toBe(0);
    expect(readFileSync(join(root, 'src/App.tsx'), 'utf8')).toContain('hover:underline');
  });

  (built ? posix : it.skip)('a consumer with its own Tailwind gets info only', () => {
    const root = makeProject({
      'package.json': pkgJson(
        'ops',
        { [PKG]: '^0.16.0' },
        { devDependencies: { tailwindcss: '^4.0.0' } },
      ),
      'package-lock.json': npmLock('0.16.0'),
      'src/App.tsx': `import '${PKG}/styles.css';\nexport const A = () => <a className="hover:underline">x</a>;\n`,
    });
    const res = runCli(['upgrade', '--root', root, '--check', '--json', '--no-typecheck']);
    const report = JSON.parse(res.stdout);
    const item = report.doByHand.find((i) => i.id === 'hds-css-classes/unknown/hover:underline');
    expect(item).toBeDefined();
    expect(item.blocking).toBe(false);
  });
});
