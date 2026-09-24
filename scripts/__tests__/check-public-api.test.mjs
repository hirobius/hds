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
import { diffSurfaces } from '../lib/check-public-api.mjs';

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
