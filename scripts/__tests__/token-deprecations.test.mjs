/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * collectDeprecations reads each `$deprecated` token into one record that the
 * build, the hds/no-deprecated-token lint rule and the hds-deprecated-tokens
 * codemod share: the replacement it names, both CSS vars, the Tailwind keys
 * and the version it leaves in.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectDeprecations } from '../lib/token-deprecations.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tokens = JSON.parse(readFileSync(join(ROOT, 'hirobius.tokens.json'), 'utf8'));

const fixture = {
  semantic: {
    space: {
      scale: { sm: { $value: '{x}' } },
      layout: {
        tight: { $value: '{x}', $deprecated: 'hds#206 — use semantic.space.scale.sm' },
      },
    },
    radius: { old: { $value: '{x}', $deprecated: 'gone, removed in 0.30.0 — use nothing' } },
  },
  component: {
    badge: { bg: { $value: '{x}', $deprecated: 'use component.badge.<tone>.bg (one per tone)' } },
  },
};

describe('collectDeprecations', () => {
  it('names the replacement path, CSS vars and Tailwind keys', () => {
    const [tight] = collectDeprecations(fixture).filter((d) => d.path.endsWith('tight'));
    expect(tight).toEqual({
      path: 'semantic.space.layout.tight',
      cssVar: '--semantic-space-layout-tight',
      tailwind: 'layout-tight',
      replacement: 'semantic.space.scale.sm',
      replacementCssVar: '--semantic-space-scale-sm',
      replacementTailwind: 'scale-sm',
      removeIn: '1.0.0',
      note: 'hds#206 — use semantic.space.scale.sm',
    });
  });

  it('reads "removed in X" and leaves replacement null when none resolves', () => {
    const all = collectDeprecations(fixture);
    const old = all.find((d) => d.path === 'semantic.radius.old');
    expect(old.removeIn).toBe('0.30.0');
    expect(old.replacement).toBeNull();
    const badge = all.find((d) => d.path === 'component.badge.bg');
    expect(badge.replacement).toBeNull();
    expect(badge.tailwind).toBeNull();
  });

  it('every real deprecation with a replacement names a live token', () => {
    for (const d of collectDeprecations(tokens)) {
      if (!d.replacement) continue;
      expect(collectDeprecations(tokens).map((x) => x.path)).not.toContain(d.replacement);
    }
  });

  it('the zero-use spacing tokens are deprecated (2026-10 audit)', () => {
    const paths = collectDeprecations(tokens).map((d) => d.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        'semantic.space.section.heroMax',
        'semantic.space.sidebar.railWidth',
        'semantic.docs.space.paragraph',
        'semantic.docs.space.inline',
      ]),
    );
  });
});
