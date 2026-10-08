/**
 * A throwaway repo laid out like this one, at its 0.20.0 release, for the
 * upgrade gate and `pnpm upgrade:note` tests (hds#448): a package.json whose
 * exports point at dist/types, the source those types come from, and the
 * release snapshot of that source at docs/api/releases/0.20.0.json. A test
 * then changes the tree the way a pull request would.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { formatJson } from '../../upgrade/format.mjs';
import { snapshotFromSource } from '../../upgrade/snapshot.mjs';

export const PACKAGE = '@hirobius/design-system';

const temps = [];

/** Removes every repo made since the last call; call it from afterEach. */
export function cleanUpRepos() {
  while (temps.length) rmSync(temps.pop(), { recursive: true, force: true });
}

export function write(root, rel, text) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
}

export const readPkg = (root) => JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

export function editPkg(root, change) {
  const pkg = readPkg(root);
  change(pkg);
  write(root, 'package.json', JSON.stringify(pkg, null, 2));
}

/** Records the tree as it stands as the 0.20.0 release snapshot. */
export function recordRelease(root, version = '0.20.0') {
  write(root, `docs/api/releases/${version}.json`, formatJson(snapshotFromSource(root)));
}

export function releasedRepo() {
  const root = mkdtempSync(join(tmpdir(), 'hds-upgrade-repo-'));
  temps.push(root);
  write(
    root,
    'package.json',
    JSON.stringify(
      {
        name: PACKAGE,
        version: '0.20.0',
        exports: {
          '.': { types: './dist/types/src/index.d.ts', import: './dist/hirobius-ui.js' },
          './patterns': { types: './dist/types/src/patterns.d.ts', import: './dist/patterns.js' },
          './styles.css': './dist/styles.css',
          './package.json': './package.json',
        },
        files: ['dist'],
        bin: { 'hds-tile-grid': 'codemods/tile-grid.mjs' },
        dependencies: { clsx: '^2.1.1', 'date-fns': '^4.1.0' },
        peerDependencies: { react: '^18.3.0 || ^19.0.0', zod: '^3.23.0 || ^4.0.0' },
        peerDependenciesMeta: { zod: { optional: true } },
        engines: { node: '>=20', pnpm: '>=8' },
        scripts: { test: 'vitest run' },
        devDependencies: { vitest: '^4.0.0' },
      },
      null,
      2,
    ),
  );
  write(root, 'src/index.ts', "export * from './button';\nexport * from './callout';\n");
  write(root, 'src/button.tsx', 'export function Button() { return <button />; }\n');
  write(root, 'src/callout.tsx', 'export function Callout() { return null; }\n');
  write(root, 'src/patterns.ts', 'export function Page() { return null; }\n');
  write(root, '.changeset/README.md', '# Changesets\n');
  write(root, '.changeset/config.json', '{}\n');
  recordRelease(root);
  return root;
}

export const removeCallout = (root) => write(root, 'src/index.ts', "export * from './button';\n");

export function changeset(root, name, bump, pkg = PACKAGE) {
  write(root, `.changeset/${name}.md`, `---\n'${pkg}': ${bump}\n---\n\nSomething changed.\n`);
}

export function note(root, name, body) {
  write(root, `upgrade/pending/${name}.json`, formatJson(body));
}

export const readNote = (root, name) =>
  JSON.parse(readFileSync(join(root, `upgrade/pending/${name}.json`), 'utf8'));
