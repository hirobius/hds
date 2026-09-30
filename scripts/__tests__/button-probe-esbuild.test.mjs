/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * scripts/lib/button-probe-esbuild.mjs (hds#363, hds#365). Beside the rollup
 * probe that .size-limit.cjs budgets, `import { Button } from
 * '@hirobius/design-system'` is also bundled with esbuild — the bundler that,
 * like webpack, keeps every un-annotated top-level statement in a chunk it
 * reaches — and the only @radix-ui packages allowed in the result are the ones
 * button.tsx itself pulls in: @radix-ui/react-slot and what it depends on. Any
 * other @radix-ui package reaching the bundle means a compound leaked into the
 * chunk shared with Button.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ALLOWED_PACKAGES,
  buttonOnlyEsbuildOptions,
  buttonRadixClosure,
  disallowedInputs,
  disallowedPackages,
  radixInputs,
  resolveEsbuild,
} from '../lib/button-probe-esbuild.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const DIALOG =
  'node_modules/.pnpm/@radix-ui+react-dialog@1.1.15_react@18.3.1/node_modules/@radix-ui/react-dialog/dist/index.mjs';
const MENU =
  'node_modules/.pnpm/@radix-ui+react-dropdown-menu@2.1.16_react@18.3.1/node_modules/@radix-ui/react-dropdown-menu/dist/index.mjs';
const SLOT =
  'node_modules/.pnpm/@radix-ui+react-slot@1.2.3/node_modules/@radix-ui/react-slot/dist/index.mjs';
const COMPOSE =
  'node_modules/.pnpm/@radix-ui+react-compose-refs@1.1.2/node_modules/@radix-ui/react-compose-refs/dist/index.mjs';

const metafile = (inputs) => ({
  inputs: Object.fromEntries(inputs.map((i) => [i, { bytes: 1, imports: [] }])),
  outputs: {
    'dist/probe/button-only.esbuild.js': {
      bytes: 10,
      inputs: Object.fromEntries(inputs.map((i) => [i, { bytesInOutput: 1 }])),
    },
  },
});

describe('ALLOWED_PACKAGES', () => {
  it('is exactly what button.tsx pulls in: @radix-ui/react-slot and its own @radix-ui dependencies', () => {
    expect([...ALLOWED_PACKAGES].sort()).toEqual([
      '@radix-ui/react-compose-refs',
      '@radix-ui/react-slot',
    ]);
  });

  it('equals the closure derived from button.tsx, its local imports and the installed tree', () => {
    // Button gaining a @radix-ui import, or react-slot gaining a dependency,
    // shows up here as a deliberate allow-list change, not a silent pass.
    expect(buttonRadixClosure(ROOT)).toEqual([...ALLOWED_PACKAGES].sort());
  });
});

describe('disallowedInputs', () => {
  it('names every input from a @radix-ui package outside the allow-list, sorted', () => {
    const found = disallowedInputs(
      metafile([MENU, DIALOG, SLOT, COMPOSE, 'dist/chunks/activity-feed.js']),
    );
    expect(found).toEqual([DIALOG, MENU]);
  });

  it('is empty when only allow-listed radix packages and our own chunks are present', () => {
    expect(disallowedInputs(metafile([SLOT, COMPOSE, 'dist/hirobius-ui.js']))).toEqual([]);
  });

  it('does not let a package through because its name merely starts like an allowed one', () => {
    const extras = 'node_modules/@radix-ui/react-slot-extras/dist/index.mjs';
    expect(disallowedInputs(metafile([extras]))).toEqual([extras]);
  });
});

describe('disallowedPackages', () => {
  it('lists each offending package once, sorted', () => {
    expect(disallowedPackages(metafile([MENU, DIALOG, MENU, SLOT, COMPOSE]))).toEqual([
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
    ]);
  });
});

describe('radixInputs', () => {
  it('lists every @radix-ui package in the output once, sorted', () => {
    expect(radixInputs(metafile([SLOT, DIALOG, SLOT, MENU, 'dist/x.js']))).toEqual([
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-slot',
    ]);
  });
});

describe('resolveEsbuild', () => {
  it('finds the esbuild vite ships, without a direct dependency', () => {
    const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.dependencies?.esbuild).toBeUndefined();
    expect(pkg.devDependencies?.esbuild).toBeUndefined();
    const esbuild = resolveEsbuild();
    expect(typeof esbuild.build).toBe('function');
    expect(esbuild.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('buttonOnlyEsbuildOptions', () => {
  const options = buttonOnlyEsbuildOptions({
    entry: '/repo/dist/probe/entry.js',
    outfile: '/repo/dist/probe/button-only.esbuild.js',
  });

  it('bundles a minified, tree-shaken ESM browser bundle with a metafile', () => {
    expect(options).toMatchObject({
      entryPoints: ['/repo/dist/probe/entry.js'],
      outfile: '/repo/dist/probe/button-only.esbuild.js',
      bundle: true,
      minify: true,
      treeShaking: true,
      format: 'esm',
      platform: 'browser',
      metafile: true,
      write: true,
    });
  });

  it('keeps the peers external, the way a consumer install would', () => {
    for (const peer of ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client']) {
      expect(options.external, peer).toContain(peer);
    }
  });
});
