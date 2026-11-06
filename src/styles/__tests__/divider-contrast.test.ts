/**
 * Divider contrast (2026-10-22): "Light mode dividers are too light." On a
 * soft light surface the hairline between sections read at 1.15–1.26:1 and
 * vanished. Every divider token has to reach a quiet-but-visible floor on each
 * surface a divider sits on: page, raised (cards), overlay, muted, the
 * floating overlay fill and the warm accentSubtle tint.
 *
 * - Light floor 1.45:1. The ceiling is 2.1:1: hds#522 darkened the light
 *   ladder (muted 1.35:1 on the page), so a divider that clears 1.45:1 on muted
 *   sits near 2.0:1 on white. Still quiet next to border.strong.
 * - Dark is checked at 1.4:1 so a dark regression is caught too.
 * - border.strong must stay at least as strong as border.default, or the
 *   Divider `strong` variant would read weaker than the default rule.
 */
import { describe, it, expect } from 'vitest';
import { contrastRatio } from '../../app/utils/colorUtils';
import { repoFile, tokenHex, type TokenMode } from './style-test-helpers';

const FLOOR: Record<TokenMode, number> = { Light: 1.45, Dark: 1.4 };
// Divider (+ .hds-divider), Table rows, MetadataList rows, MenuSeparator (role.border).
const DIVIDERS = ['semantic.color.border.default', 'semantic.color.border.strong', 'role.border'];
const SURFACES = [
  'semantic.color.surface.page',
  'semantic.color.surface.raised',
  'semantic.color.surface.overlay',
  'semantic.color.surface.muted',
  'semantic.color.surface.floating',
  'semantic.color.surface.accentSubtle',
];

describe.each<TokenMode>(['Light', 'Dark'])('divider contrast in %s', (mode) => {
  describe.each(DIVIDERS)('%s', (divider) => {
    it.each(SURFACES)('reads on %s at the floor', (surface) => {
      expect(
        contrastRatio(tokenHex(divider, mode), tokenHex(surface, mode)),
      ).toBeGreaterThanOrEqual(FLOOR[mode]);
    });
  });

  it('keeps border.strong at least as strong as border.default', () => {
    const page = tokenHex('semantic.color.surface.page', mode);
    expect(
      contrastRatio(tokenHex('semantic.color.border.strong', mode), page),
    ).toBeGreaterThanOrEqual(contrastRatio(tokenHex('semantic.color.border.default', mode), page));
  });
});

describe('light dividers stay quiet', () => {
  it.each(SURFACES)('border.default stays under 2.1:1 on %s', (surface) => {
    expect(
      contrastRatio(tokenHex('semantic.color.border.default', 'Light'), tokenHex(surface, 'Light')),
    ).toBeLessThan(2.1);
  });
});

// Every divider surface draws one of the tokens pinned above.
const DIVIDER_SOURCES: Array<[string, RegExp]> = [
  ['divider.tsx', /--semantic-color-border-default/],
  ['metadata-list.tsx', /--semantic-color-border-default/],
  ['table.tsx', /--semantic-color-border-default/],
  ['menu.tsx', /h-px bg-border/],
];

describe('divider sources use a pinned token', () => {
  it.each(DIVIDER_SOURCES)('%s', (file, re) => {
    const src = repoFile(`src/app/components/${file}`);
    expect(src).toMatch(re);
  });

  it('.hds-divider uses border.default', () => {
    const css = repoFile('src/styles/static.css');
    expect(css).toMatch(/\.hds-divider \{[^}]*--semantic-color-border-default/);
  });
});
