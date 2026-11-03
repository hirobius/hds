// @vitest-environment node
/**
 * Internal helpers stay out of the public manifest.
 *
 * A module that two components share (combobox-list.tsx from hds#1111,
 * overlay-close.tsx from hds#1116, control-label.tsx from hds#1009) is not
 * an HDS component. Its file-level JSDoc carries `@doc-ignore <reason>`,
 * the marker src/form/hds-form.tsx uses, so scripts/component-discovery.mjs
 * skips it and `pnpm manifest:generate` writes no spec for its PascalCase
 * exports. Without the marker, `@internal` alone surfaces each export as a
 * hidden spec with a null tier, and validate-manifest fails on the next regen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { discoverHdsComponents } from '../scripts/component-discovery.mjs';

interface Spec {
  filePath?: string;
  hidden?: boolean;
  tier?: string | null;
}

const ROOT = resolve(__dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(ROOT, 'public/hds-manifest.json'), 'utf8')) as {
  componentSpecs: Record<string, Spec>;
  utilities?: Record<string, Spec>;
};
const allSpecs: Record<string, Spec> = {
  ...manifest.componentSpecs,
  ...(manifest.utilities ?? {}),
};

const INTERNAL_HELPERS = [
  {
    file: 'src/app/components/combobox-list.tsx',
    exports: ['ListboxFooter', 'OptionCheck'],
  },
  { file: 'src/app/components/overlay-close.tsx', exports: ['OverlayClose'] },
  {
    file: 'src/app/components/control-label.tsx',
    exports: ['ControlLabel', 'ControlLabelText'],
  },
];

const discovered = discoverHdsComponents().components as Array<{
  name: string;
  filePath: string;
  hidden: boolean;
  docExempt: boolean;
  tier: string | null;
}>;

describe('internal helpers stay out of the manifest', () => {
  for (const { file, exports } of INTERNAL_HELPERS) {
    it(`${file} is not discovered as a component`, () => {
      expect(discovered.filter((c) => c.filePath === file).map((c) => c.name)).toEqual([]);
    });

    it(`${file} has no spec in the committed manifest`, () => {
      for (const name of exports) expect(allSpecs[name]).toBeUndefined();
      const fromFile = Object.entries(allSpecs)
        .filter(([, spec]) => spec.filePath === file)
        .map(([name]) => name);
      expect(fromFile).toEqual([]);
    });
  }

  // The general guard: an @internal export that still reaches the manifest
  // must be governed. generate-manifest.mjs gives it a tier from its own
  // @tier tag or, for a @doc-exempt one (ExpandTooltip), the utility default;
  // anything else is written with a null tier. That is a shared helper
  // missing its `@doc-ignore`.
  it('every @internal export discovery surfaces resolves a tier', () => {
    const untiered = discovered
      .filter((c) => c.hidden && !c.tier && !c.docExempt)
      .map((c) => `${c.name} (${c.filePath})`);
    expect(untiered).toEqual([]);
  });
});
