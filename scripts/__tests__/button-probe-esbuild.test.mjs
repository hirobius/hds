/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * scripts/lib/button-probe-esbuild.mjs (hds#363). Beside the rollup probe that
 * .size-limit.cjs budgets, `import { Button } from '@hirobius/design-system'`
 * is also bundled with esbuild — the bundler that, like webpack, keeps every
 * un-annotated top-level statement in a chunk it reaches — and the result must
 * hold no @radix-ui/react-dialog or @radix-ui/react-alert-dialog code.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FORBIDDEN_PACKAGES,
  buttonOnlyEsbuildOptions,
  forbiddenInputs,
  radixInputs,
  resolveEsbuild,
} from '../lib/button-probe-esbuild.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const DIALOG =
  'node_modules/.pnpm/@radix-ui+react-dialog@1.1.15_react@18.3.1/node_modules/@radix-ui/react-dialog/dist/index.mjs';
const ALERT =
  'node_modules/.pnpm/@radix-ui+react-alert-dialog@1.1.15/node_modules/@radix-ui/react-alert-dialog/dist/index.mjs';
const SLOT =
  'node_modules/.pnpm/@radix-ui+react-slot@1.2.3/node_modules/@radix-ui/react-slot/dist/index.mjs';

const metafile = (inputs) => ({
  inputs: Object.fromEntries(inputs.map((i) => [i, { bytes: 1, imports: [] }])),
  outputs: {
    'dist/probe/button-only.esbuild.js': {
      bytes: 10,
      inputs: Object.fromEntries(inputs.map((i) => [i, { bytesInOutput: 1 }])),
    },
  },
});

describe('forbiddenInputs', () => {
  it('names the radix dialog and alert-dialog modules that reached the output', () => {
    const found = forbiddenInputs(metafile([DIALOG, ALERT, SLOT, 'dist/chunks/activity-feed.js']));
    expect(found).toEqual([ALERT, DIALOG]);
  });

  it('is empty when only other radix packages and our own chunks are present', () => {
    expect(forbiddenInputs(metafile([SLOT, 'dist/hirobius-ui.js']))).toEqual([]);
  });

  it('does not match a package whose name merely starts the same way', () => {
    expect(forbiddenInputs(metafile(['node_modules/@radix-ui/react-dialog-extras/x.js']))).toEqual(
      [],
    );
  });

  it('forbids exactly the two dialog packages', () => {
    expect([...FORBIDDEN_PACKAGES].sort()).toEqual([
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-dialog',
    ]);
  });
});

describe('radixInputs', () => {
  it('lists every @radix-ui package in the output once, sorted', () => {
    expect(radixInputs(metafile([SLOT, DIALOG, SLOT, ALERT, 'dist/x.js']))).toEqual([
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-dialog',
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
