import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { BEHAVIOUR_DETECTORS, vitestArgs } from '../check-behaviour-detectors.mjs';

describe('check-behaviour-detectors (hds#468)', () => {
  it('lists the DOM/a11y baseline, hydration and console budget gates with their fixtures', () => {
    const files = BEHAVIOUR_DETECTORS.map((d) => d.test);
    expect(files).toEqual(
      expect.arrayContaining([
        'tests/dom-a11y-baseline.test.tsx',
        'tests/hydration-gate.test.tsx',
        'tests/docs-site/demos-hydrate.test.tsx',
        'tests/console-budget.test.tsx',
        'tests/docs-site/console-budget.test.tsx',
      ]),
    );
    for (const f of files) expect(existsSync(f), f).toBe(true);
  });

  it('every ratchet baseline it guards is committed', () => {
    for (const d of BEHAVIOUR_DETECTORS)
      if (d.baseline) expect(existsSync(d.baseline), d.baseline).toBe(true);
  });

  it('runs them in one vitest call', () => {
    expect(vitestArgs()).toEqual([
      'exec',
      'vitest',
      'run',
      ...BEHAVIOUR_DETECTORS.map((d) => d.test),
    ]);
  });
});
