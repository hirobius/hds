/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Canary for hds#270 — proves the check-public-api breaking-change guard
 * actually fires: a symbol present in the baseline but missing from the
 * current surface must be reported as a breaking change (the same
 * `diffSurfaces` result that makes `scripts/lib/check-public-api.mjs`'s
 * `main()` call `process.exit(1)`).
 *
 * Pure in-memory test — no filesystem reads, no TS compiler API, so it does
 * not depend on src/ actually building.
 */

import { describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectPublicApi, diffSurfaces } from '../lib/check-public-api.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('diffSurfaces (check-public-api breaking-change guard)', () => {
  it('reports a removed export as a breaking change', () => {
    const baseline = {
      modules: {
        './app/components/button': ['Button', 'ButtonProps', 'buttonVariants'],
      },
    };
    const current = {
      modules: {
        // buttonVariants removed
        './app/components/button': ['Button', 'ButtonProps'],
      },
    };

    const { breakingChanges } = diffSurfaces(baseline, current);

    expect(breakingChanges).toContainEqual({
      kind: 'symbol-removed',
      module: './app/components/button',
      symbol: 'buttonVariants',
    });
  });

  it('reports a removed module as a breaking change', () => {
    const baseline = {
      modules: {
        './app/components/button': ['Button'],
        './app/components/badge': ['Badge'],
      },
    };
    const current = {
      modules: {
        './app/components/button': ['Button'],
      },
    };

    const { breakingChanges } = diffSurfaces(baseline, current);

    expect(breakingChanges).toContainEqual({
      kind: 'module-removed',
      module: './app/components/badge',
      symbol: null,
    });
  });

  it('reports a new export as an addition, not a breaking change', () => {
    const baseline = { modules: { './app/components/button': ['Button'] } };
    const current = { modules: { './app/components/button': ['Button', 'ButtonProps'] } };

    const { breakingChanges, additions } = diffSurfaces(baseline, current);

    expect(breakingChanges).toEqual([]);
    expect(additions).toContainEqual({
      kind: 'symbol-added',
      module: './app/components/button',
      symbol: 'ButtonProps',
    });
  });

  it('reports no changes when the surface is identical', () => {
    const surface = { modules: { './app/components/button': ['Button', 'ButtonProps'] } };

    const { breakingChanges, additions } = diffSurfaces(surface, surface);

    expect(breakingChanges).toEqual([]);
    expect(additions).toEqual([]);
  });
});

describe('collectPublicApi walks every package.json#exports JS entry (hds#390)', () => {
  function fixture() {
    const root = mkdtempSync(join(tmpdir(), 'hds-api-'));
    const write = (rel, text) => {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), text);
    };
    write(
      'package.json',
      JSON.stringify({
        version: '9.9.9',
        exports: {
          '.': { types: './dist/types/src/index.d.ts', import: './dist/root.js' },
          './styles.css': './dist/styles.css',
          './patterns': { types: './dist/types/src/patterns.d.ts', import: './dist/patterns.js' },
          './contexts': {
            types: './dist/types/src/app/context/index.d.ts',
            import: './dist/contexts.js',
          },
          './package.json': './package.json',
        },
      }),
    );
    write('src/index.ts', "export * from './app/components/a';\nexport const VERSION = 1;\n");
    write('src/app/components/a.tsx', 'export function A() {}\nexport type AProps = {};\n');
    write('src/app/components/b.tsx', "export * from './b-parts';\nexport const B = 1;\n");
    write('src/app/components/b-parts.tsx', 'export const BPart = 1;\n');
    write(
      'src/patterns.ts',
      "export * from './app/components/a';\nexport * from './app/components/b';\n",
    );
    write('src/app/context/index.ts', "export * from './ThemeContext';\n");
    write(
      'src/app/context/ThemeContext.tsx',
      'export function ThemeProvider() {}\nexport const useTheme = () => 1;\n',
    );
    return root;
  }

  it('records each subpath entry with every symbol it reaches through export *', () => {
    const root = fixture();
    try {
      const surface = collectPublicApi(root);
      expect(surface.version).toBe('9.9.9');
      expect(surface.modules).toEqual({
        '(barrel)': ['VERSION'],
        './app/components/a': ['A', 'AProps'],
        '@subpath/patterns': ['A', 'AProps', 'B', 'BPart'],
        '@subpath/contexts': ['ThemeProvider', 'useTheme'],
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reports a symbol dropped from a subpath as breaking, even if the root still has it', () => {
    const root = fixture();
    try {
      const before = collectPublicApi(root);
      writeFileSync(join(root, 'src/patterns.ts'), "export * from './app/components/b';\n");
      const { breakingChanges } = diffSurfaces(before, collectPublicApi(root));
      expect(breakingChanges).toContainEqual({
        kind: 'symbol-removed',
        module: '@subpath/patterns',
        symbol: 'A',
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('covers /patterns and /contexts in the real package, including the /patterns-only modules', () => {
    const surface = collectPublicApi(REPO);
    const patterns = surface.modules['@subpath/patterns'] ?? [];
    expect(surface.modules['@subpath/contexts']?.length).toBeGreaterThan(0);
    // Six /patterns modules are not root `export *` targets, so before hds#390
    // no baseline entry covered them.
    for (const name of [
      'PageHeader',
      'MetricTiles',
      'FormActions',
      'DestructiveSection',
      'DataTableSection',
      'StackedCardRail',
    ]) {
      expect(patterns).toContain(name);
    }
    const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
    const jsSubpaths = Object.entries(pkg.exports)
      .filter(([key, value]) => key !== '.' && typeof value === 'object')
      .map(([key]) => `@subpath/${key.slice(2)}`);
    for (const key of jsSubpaths) expect(Object.keys(surface.modules)).toContain(key);
  }, 60_000);
});

describe('API baseline wiring (hds#390)', () => {
  const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));

  it('runs the --api surface guard in the pretest chain, so CI fails a removed export', () => {
    expect(pkg.scripts.pretest).toContain('node scripts/audit-component-integrity.mjs --api');
  });

  // release.yml's changesets/action runs `pnpm changeset:version` to build the
  // "Version Packages" PR, and that PR gets the same CI as any other (it runs
  // `pnpm test`). `changeset version` alone bumps package.json and leaves the
  // baseline one version behind, which fails the assertion below on every
  // release. The refresh must run after the bump so it records the new version.
  it('refreshes the baseline after the bump in changeset:version', () => {
    const steps = pkg.scripts['changeset:version'].split('&&').map((step) => step.trim());
    expect(steps[0]).toBe('changeset version');
    expect(
      steps.indexOf('node scripts/audit-component-integrity.mjs --api --update-baseline'),
    ).toBe(steps.length - 1);
  });

  it('keeps the committed baseline at the package version', () => {
    const baseline = JSON.parse(readFileSync(join(REPO, 'docs/api/api-baseline.json'), 'utf8'));
    expect(
      baseline.version,
      'docs/api/api-baseline.json is behind package.json: run `pnpm api:update` (`pnpm changeset:version` does this after the bump)',
    ).toBe(pkg.version);
    expect(baseline.modules['@subpath/patterns']?.length).toBeGreaterThan(0);
    expect(baseline.modules['@subpath/contexts']?.length).toBeGreaterThan(0);
  });
});
