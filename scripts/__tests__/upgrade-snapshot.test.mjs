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
import { compareVersions } from '../upgrade/schema.mjs';
import { snapshotFromNpm, snapshotFromSource, snapshotPackage } from '../upgrade/snapshot.mjs';

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

function writer(root) {
  return (rel, text) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  };
}

/** The package.json the built fixture and its source twin share. */
function fixturePackageJson(version) {
  return JSON.stringify({
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
  });
}

/** A built package: package.json plus dist/types, laid out the way build:types emits it. */
function builtPackage(version = '1.2.3') {
  const root = tempDir('hds-snap-');
  const write = writer(root);
  write('package.json', fixturePackageJson(version));
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

/**
 * The source tree builtPackage() is built from: the same package.json, and the
 * `.ts`/`.tsx` files tsc would emit those declarations from. pretest never
 * builds, so the upgrade gate (hds#448) reads this side.
 */
function sourcePackage(version = '1.2.3') {
  const root = tempDir('hds-src-');
  const write = writer(root);
  write('package.json', fixturePackageJson(version));
  // Source specifiers carry no extension.
  write(
    'src/index.ts',
    [
      "export * from './app/components/button';",
      "export * from './app/components/callout';",
      "export { default as hds } from './app/design-system/tokens';",
      "export const tokens = { a: 'a' };",
      '',
    ].join('\n'),
  );
  // JSX, and a local name exported in a list.
  write(
    'src/app/components/button.tsx',
    [
      "import * as React from 'react';",
      'export interface ButtonProps { pressed?: boolean }',
      'const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => (',
      '  <button ref={ref} aria-pressed={props.pressed} />',
      '));',
      'export { Button };',
      '',
    ].join('\n'),
  );
  write(
    'src/app/components/callout.tsx',
    [
      "export type CalloutProps = { tone?: 'info' };",
      'export function Callout(props: CalloutProps) { return props.tone ? null : null; }',
      'export default Callout;',
      '',
    ].join('\n'),
  );
  write('src/patterns.ts', "export * from './app/components/page';\n");
  write(
    'src/app/components/page.tsx',
    'export function Page() { return <main />; }\nexport type PageProps = {};\n',
  );
  write(
    'src/app/design-system/tokens.ts',
    [
      "const hds = { space: '4px' };",
      'export default hds;',
      "export { ct } from './theme';",
      '',
    ].join('\n'),
  );
  write('src/app/design-system/theme.ts', 'export const ct = 1;\n');
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

describe('snapshotFromSource', () => {
  it('reads the source tree to the same snapshot the built tree gives, module ids included', () => {
    expect(snapshotFromSource(sourcePackage())).toEqual(EXPECTED);
    expect(snapshotFromSource(sourcePackage())).toEqual(snapshotPackage(builtPackage()));
  });

  it('writes the same bytes as the built snapshot, so either can be committed', () => {
    expect(formatJson(snapshotFromSource(sourcePackage()))).toBe(formatJson(EXPECTED));
  });

  it('names the entry whose source file is missing', () => {
    const dir = sourcePackage();
    rmSync(join(dir, 'src/patterns.ts'));
    expect(() => snapshotFromSource(dir)).toThrow(/\.\/patterns.*src\/patterns/);
  });

  it('sees a removed export at once, with no build', () => {
    const dir = sourcePackage();
    writeFileSync(join(dir, 'src/patterns.ts'), 'export {};\n');
    expect(snapshotFromSource(dir).entries['./patterns']).toEqual({});
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

  it('--source prints the snapshot of a source tree, and --check compares it', () => {
    const dir = sourcePackage();
    const printed = run(['--source', dir]);
    expect(printed.status).toBe(0);
    expect(printed.stdout).toBe(formatJson(EXPECTED));

    const out = join(tempDir('hds-snap-out-'), 'snap.json');
    writeFileSync(out, formatJson(EXPECTED));
    expect(run(['--source', dir, '--check', out]).status).toBe(0);
    writeFileSync(join(dir, 'src/patterns.ts'), 'export {};\n');
    const stale = run(['--source', dir, '--check', out]);
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain('--source');
  });

  it('rejects an unknown argument with usage', () => {
    const res = run(['--frm-npm', '0.20.0']);
    expect(res.status).toBe(2);
    expect(res.stderr).toMatch(/usage/);
  });
});

/** Export names per entry, as the baseline lists them: the root is the
 * baseline's root modules together (`export *` forwards no `default`); each
 * subpath is its `@subpath/<name>` module. */
function baselineEntries(baseline) {
  const entries = {};
  for (const [module, names] of Object.entries(baseline.modules)) {
    if (module.startsWith('@subpath/')) {
      entries[`./${module.slice('@subpath/'.length)}`] = [...names].sort();
    } else {
      const root = new Set(entries['.'] ?? []);
      for (const name of names) if (module === '(barrel)' || name !== 'default') root.add(name);
      entries['.'] = [...root].sort();
    }
  }
  return entries;
}

function snapshotEntries(snapshot) {
  return Object.fromEntries(
    Object.entries(snapshot.entries).map(([entry, names]) => [entry, Object.keys(names).sort()]),
  );
}

/** Names the published release exports that the working baseline no longer
 * does (`removed:<entry>:<name>`, the diff.mjs fact id), and names it gained. */
function nameDrift(published, working) {
  const ids = (entries) =>
    new Set(Object.entries(entries).flatMap(([entry, names]) => names.map((n) => `${entry}:${n}`)));
  const [was, now] = [ids(published), ids(working)];
  return {
    removed: [...was]
      .filter((id) => !now.has(id))
      .map((id) => `removed:${id}`)
      .sort(),
    added: [...now]
      .filter((id) => !was.has(id))
      .map((id) => `added:${id}`)
      .sort(),
  };
}

/** Pending `.changeset/*.md` files with this package's bump. */
function readChangesets(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((file) => {
      const text = readFileSync(join(dir, file), 'utf8');
      const bump = /^['"]?@hirobius\/design-system['"]?\s*:\s*(patch|minor|major)\s*$/m.exec(text);
      return { file, bump: bump?.[1] ?? null };
    });
}

/** Every step of the pending upgrade notes, upgrade/pending/*.json (hds#448). */
function readPendingSteps(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')).steps ?? []);
}

/**
 * Removals no pending upgrade note accounts for. A removal is explained when a
 * step in upgrade/pending lists its fact id and a minor or major changeset is
 * pending: a removal is breaking, so a patch cannot carry it (hds#445
 * decision 3). scripts/check-upgrade-ledger.mjs checks the same against the
 * source tree; this checks the baseline `pnpm api:update` writes, so accepting
 * a removal into the baseline cannot get ahead of its upgrade step. Additions
 * need no step (upgrade/README.md).
 */
function unexplainedRemovals(removed, changesets, steps) {
  const breakingBump = changesets.some((c) => c.bump === 'minor' || c.bump === 'major');
  const covered = new Set(steps.flatMap((step) => step.facts ?? []));
  return removed.filter((id) => !breakingBump || !covered.has(id));
}

describe('committed release snapshots (docs/api/releases)', () => {
  const read = (file) => JSON.parse(readFileSync(join(REPO, file), 'utf8'));
  const baseline = read('docs/api/api-baseline.json');
  const versions = readdirSync(join(REPO, 'docs/api/releases'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort(compareVersions);
  const changesets = readChangesets(join(REPO, '.changeset'));
  const steps = readPendingSteps(join(REPO, 'upgrade/pending'));

  // The baseline is the working tree's surface (`pnpm api:check`) and moves
  // with every merge; the snapshot is the published tarball's and never moves.
  // Between the release and the next version bump the two may differ, but
  // only by additions and by removals a pending upgrade note covers.
  it('differs from the published snapshot of its version only by what pending upgrade notes explain', () => {
    if (!versions.includes(baseline.version)) {
      // The bump ran before the release's snapshot was recorded: nothing to
      // compare yet, but the baseline must then be ahead of every snapshot.
      expect(compareVersions(baseline.version, versions.at(-1))).toBe(1);
      return;
    }
    const published = snapshotEntries(read(`docs/api/releases/${baseline.version}.json`));
    const { removed } = nameDrift(published, baselineEntries(baseline));
    expect(unexplainedRemovals(removed, changesets, steps)).toEqual([]);
  });

  it('canary: a removal with no step, or one carried by a patch changeset, fails', () => {
    const published = snapshotEntries(read('docs/api/releases/0.20.0.json'));
    const working = baselineEntries(baseline);
    // A name no step covers, dropped from the working surface.
    const victim = published['.'].find(
      (name) =>
        working['.'].includes(name) &&
        unexplainedRemovals([`removed:.:${name}`], changesets, steps).length === 1,
    );
    expect(victim).toBeTruthy();
    const dropped = { ...working, '.': working['.'].filter((n) => n !== victim) };
    expect(unexplainedRemovals(nameDrift(published, dropped).removed, changesets, steps)).toContain(
      `removed:.:${victim}`,
    );

    // StatusDot is explained by a step under a minor changeset; under a patch
    // changeset, or with a step for another fact only, it is not.
    const statusDot = { ...working, '.': working['.'].filter((n) => n !== 'StatusDot') };
    const removed = nameDrift(published, statusDot).removed.filter((id) =>
      id.endsWith(':StatusDot'),
    );
    expect(removed).toEqual(['removed:.:StatusDot']);
    const minor = [{ file: 'x.md', bump: 'minor' }];
    const patch = [{ file: 'x.md', bump: 'patch' }];
    const step = [{ id: 'removed/StatusDot', facts: ['removed:.:StatusDot'] }];
    expect(unexplainedRemovals(removed, minor, step)).toEqual([]);
    expect(unexplainedRemovals(removed, patch, step)).toEqual(removed);
    expect(
      unexplainedRemovals(removed, minor, [
        { id: 'removed/X', facts: ['removed:.:StatusDotProps'] },
      ]),
    ).toEqual(removed);
    expect(unexplainedRemovals(removed, minor, [])).toEqual(removed);
  });

  it('holds the 0.19.1 and 0.20.0 snapshots, each named for its version', () => {
    for (const version of ['0.19.1', '0.20.0']) {
      expect(read(`docs/api/releases/${version}.json`).version).toBe(version);
    }
  });
});
