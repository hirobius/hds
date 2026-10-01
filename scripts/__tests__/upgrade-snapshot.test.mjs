/**
 * scripts/upgrade/snapshot.mjs (hds#447): the public surface of a built or
 * published package, read from its package.json and the `.d.ts` file each
 * `exports` entry's `types` condition points at.
 *
 * The fixture is a synthetic built package, so the expected snapshot below is
 * written out by hand from what the files declare, not recomputed.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatJson } from '../upgrade/format.mjs';
import { Snapshot, compareVersions } from '../upgrade/schema.mjs';
import { snapshotFromNpm, snapshotPackage } from '../upgrade/snapshot.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const CLI = join(REPO, 'scripts/upgrade/snapshot.mjs');

const temps = [];
afterEach(() => {
  while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
});

function tempDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

/** A built package: package.json plus dist/types, laid out the way build:types emits it. */
function builtPackage(version = '1.2.3') {
  const root = tempDir('hds-snap-');
  const write = (rel, text) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  };
  write(
    'package.json',
    JSON.stringify({
      name: '@hirobius/design-system',
      version,
      engines: { pnpm: '>=8', node: '>=20' },
      exports: {
        '.': { types: './dist/types/src/index.d.ts', import: './dist/root.js' },
        './styles.css': './dist/styles.css',
        './patterns': { types: './dist/types/src/patterns.d.ts', import: './dist/patterns.js' },
        './tokens': {
          types: './dist/types/src/app/design-system/tokens.d.ts',
          import: './dist/tokens.js',
        },
        './package.json': './package.json',
      },
      files: ['dist', 'codemods/b.mjs', 'codemods/a.mjs'],
      bin: { 'hds-b': 'codemods/b.mjs', 'hds-a': 'codemods/a.mjs' },
      dependencies: { zeta: '^1.0.0', alpha: '2.0.0' },
      peerDependencies: { react: '^18.3.0 || ^19.0.0', lenis: '^1.3.0' },
      peerDependenciesMeta: { lenis: { optional: true } },
      devDependencies: { vitest: '^4.0.0' },
    }),
  );
  // The root barrel, as add-dts-extensions.mjs leaves it: `.js` specifiers.
  write(
    'dist/types/src/index.d.ts',
    [
      "export * from './app/components/button.js';",
      "export * from './app/components/callout.js';",
      "export { default as hds } from './app/design-system/tokens.js';",
      'export declare const tokens: { a: string };',
      '',
    ].join('\n'),
  );
  write(
    'dist/types/src/app/components/button.d.ts',
    [
      'import * as React from "react";',
      'export interface ButtonProps { pressed?: boolean }',
      'export declare const Button: React.ForwardRefExoticComponent<ButtonProps>;',
      '',
    ].join('\n'),
  );
  // A module default does not travel through `export *`.
  write(
    'dist/types/src/app/components/callout.d.ts',
    [
      'export type CalloutProps = { tone?: "info" };',
      'export declare function Callout(props: CalloutProps): null;',
      'export default Callout;',
      '',
    ].join('\n'),
  );
  // Older builds have extensionless specifiers.
  write('dist/types/src/patterns.d.ts', "export * from './app/components/page';\n");
  write(
    'dist/types/src/app/components/page.d.ts',
    'export declare function Page(): null;\nexport type PageProps = {};\n',
  );
  write(
    'dist/types/src/app/design-system/tokens.d.ts',
    [
      'declare const hds: { space: string };',
      'export default hds;',
      "export { ct } from './theme.js';",
      '',
    ].join('\n'),
  );
  write('dist/types/src/app/design-system/theme.d.ts', 'export declare const ct: number;\n');
  return root;
}

const EXPECTED = {
  format: 1,
  name: '@hirobius/design-system',
  version: '1.2.3',
  // Each export name with the module that declares it, relative to dist/types.
  entries: {
    '.': {
      Button: 'src/app/components/button',
      ButtonProps: 'src/app/components/button',
      Callout: 'src/app/components/callout',
      CalloutProps: 'src/app/components/callout',
      hds: 'src/index',
      tokens: 'src/index',
    },
    './patterns': { Page: 'src/app/components/page', PageProps: 'src/app/components/page' },
    './tokens': { ct: 'src/app/design-system/tokens', default: 'src/app/design-system/tokens' },
  },
  exportsKeys: ['.', './package.json', './patterns', './styles.css', './tokens'],
  dependencies: { alpha: '2.0.0', zeta: '^1.0.0' },
  peerDependencies: {
    lenis: { range: '^1.3.0', optional: true },
    react: { range: '^18.3.0 || ^19.0.0', optional: false },
  },
  engines: { node: '>=20', pnpm: '>=8' },
  bin: { 'hds-a': 'codemods/a.mjs', 'hds-b': 'codemods/b.mjs' },
  files: ['codemods/a.mjs', 'codemods/b.mjs', 'dist'],
};

describe('snapshotPackage', () => {
  it('records export names per entry with their declaring module, dependencies, peers with their optional flag, engines, exports keys, bins and files', () => {
    expect(snapshotPackage(builtPackage())).toEqual(EXPECTED);
  });

  it('formats as sorted, 2-space JSON with a trailing newline, the same bytes every run', () => {
    const dir = builtPackage();
    const text = formatJson(snapshotPackage(dir));
    expect(text.endsWith('}\n')).toBe(true);
    expect(text).toBe(`${JSON.stringify(EXPECTED, null, 2)}\n`);
    expect(formatJson(snapshotPackage(dir))).toBe(text);
  });

  it('names the entry whose types file is missing', () => {
    const dir = builtPackage();
    rmSync(join(dir, 'dist/types/src/patterns.d.ts'));
    expect(() => snapshotPackage(dir)).toThrow(/\.\/patterns.*patterns\.d\.ts/);
  });
});

describe('snapshotFromNpm', () => {
  it('packs the version into a temp dir, extracts it, snapshots it and removes the temp dir', () => {
    const src = builtPackage('9.8.7');
    const calls = [];
    // Stands in for `npm pack @hirobius/design-system@9.8.7`: writes the
    // tarball npm would, so no test touches the network.
    const pack = (spec, destination) => {
      calls.push({ spec, destination });
      const staging = tempDir('hds-pack-');
      spawnSync('cp', ['-R', src, join(staging, 'package')]);
      const file = join(destination, 'hirobius-design-system-9.8.7.tgz');
      const tar = spawnSync('tar', ['-czf', file, '-C', staging, 'package']);
      expect(tar.status).toBe(0);
      return file;
    };
    const snap = snapshotFromNpm('9.8.7', { pack });
    expect(calls.map((c) => c.spec)).toEqual(['@hirobius/design-system@9.8.7']);
    expect(snap).toEqual({ ...EXPECTED, version: '9.8.7' });
    expect(existsSync(calls[0].destination)).toBe(false);
  });
});

describe('snapshot.mjs CLI', () => {
  const run = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

  it('--dir prints the snapshot; --out writes it; --check passes on the same bytes', () => {
    const dir = builtPackage();
    const printed = run(['--dir', dir]);
    expect(printed.status).toBe(0);
    expect(printed.stdout).toBe(formatJson(EXPECTED));

    const out = join(tempDir('hds-snap-out-'), 'snap.json');
    expect(run(['--dir', dir, '--out', out]).status).toBe(0);
    expect(readFileSync(out, 'utf8')).toBe(formatJson(EXPECTED));
    expect(run(['--dir', dir, '--check', out]).status).toBe(0);
  });

  it('--check exits 1 and names the file when the committed snapshot differs', () => {
    const dir = builtPackage();
    const out = join(tempDir('hds-snap-out-'), 'snap.json');
    writeFileSync(out, formatJson({ ...EXPECTED, version: '0.0.0' }));
    const res = run(['--dir', dir, '--check', out]);
    expect(res.status).toBe(1);
    expect(res.stderr).toContain(out);
  });

  it('rejects an unknown argument with usage', () => {
    const res = run(['--frm-npm', '0.20.0']);
    expect(res.status).toBe(2);
    expect(res.stderr).toMatch(/usage/);
  });
});

describe('committed release snapshots (docs/api/releases)', () => {
  const read = (file) => JSON.parse(readFileSync(join(REPO, file), 'utf8'));

  // The baseline is the working tree's surface (`pnpm api:check`), refreshed at
  // every version bump; the snapshot is the published tarball's. For the
  // release the baseline describes they must list the same names. The root is
  // the baseline's root modules together (`export *` forwards no `default`);
  // each subpath is its `@subpath/<name>` module.
  it('lists the names docs/api/api-baseline.json lists for the same release', () => {
    const baseline = read('docs/api/api-baseline.json');
    const versions = readdirSync(join(REPO, 'docs/api/releases'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort(compareVersions);
    if (!versions.includes(baseline.version)) {
      // The bump ran before the release's snapshot was recorded: nothing to
      // compare yet, but the baseline must then be ahead of every snapshot.
      expect(compareVersions(baseline.version, versions.at(-1))).toBe(1);
      return;
    }
    const snapshot = read(`docs/api/releases/${baseline.version}.json`);
    const expected = {};
    for (const [module, names] of Object.entries(baseline.modules)) {
      if (module.startsWith('@subpath/')) {
        expected[`./${module.slice('@subpath/'.length)}`] = [...names].sort();
      } else {
        const root = new Set(expected['.'] ?? []);
        for (const name of names) if (module === '(barrel)' || name !== 'default') root.add(name);
        expected['.'] = [...root].sort();
      }
    }
    const actual = Object.fromEntries(
      Object.entries(snapshot.entries).map(([entry, names]) => [entry, Object.keys(names).sort()]),
    );
    expect(actual).toEqual(expected);
  });

  // 0.16.0 is the floor (hds#450): ops and folio resolve it, so their upgrade
  // crosses every later release, and each needs its snapshot to be diffed.
  it('holds a snapshot of every release from the 0.16.0 floor, each named for its version and fitting the schema', () => {
    const versions = readdirSync(join(REPO, 'docs/api/releases'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort(compareVersions);
    expect(versions).toEqual(['0.16.0', '0.17.0', '0.18.0', '0.19.0', '0.19.1', '0.20.0']);
    for (const version of versions) {
      const snapshot = read(`docs/api/releases/${version}.json`);
      expect(snapshot.version).toBe(version);
      expect(Snapshot.safeParse(snapshot).error, version).toBeUndefined();
    }
  });

  it('records the 0.17.0 /patterns, 0.18.0 hds-patterns-subpath and 0.19.0 /icons arrivals', () => {
    const entries = (v) => Object.keys(read(`docs/api/releases/${v}.json`).entries);
    expect(entries('0.16.0')).not.toContain('./patterns');
    expect(entries('0.17.0')).toContain('./patterns');
    expect(read('docs/api/releases/0.17.0.json').bin).toEqual({});
    expect(read('docs/api/releases/0.18.0.json').bin).toEqual({
      'hds-patterns-subpath': 'codemods/patterns-subpath.mjs',
    });
    expect(entries('0.18.0')).not.toContain('./icons');
    expect(entries('0.19.0')).toContain('./icons');
  });
});
