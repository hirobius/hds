/**
 * Divider contrast (2026-10-22): "Light mode dividers are too light." On a
 * soft light surface the hairline between sections read at 1.15–1.26:1 and
 * vanished. Every divider token has to reach a quiet-but-visible floor on each
 * surface a divider sits on: page, raised (cards), overlay, muted, the
 * floating overlay fill and the warm accentSubtle tint.
 *
 * - Light floor 1.45:1 (target band 1.5–1.7, so it stays quiet).
 * - Dark is checked at 1.4:1 so a dark regression is caught too.
 * - border.strong must stay at least as strong as border.default, or the
 *   Divider `strong` variant would read weaker than the default rule.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';
import { resolveAlias } from '../../../scripts/build-tokens.mjs';
import { contrastRatio } from '../../app/utils/colorUtils';

const TOKENS = JSON.parse(
  readFileSync(resolve(__dirname, '../../../hirobius.tokens.json'), 'utf8'),
) as Record<string, unknown>;

type Mode = 'Light' | 'Dark';
type Leaf = {
  $value: unknown;
  $extensions?: Record<string, { modes?: Record<string, unknown> }>;
};

function leaf(path: string): Leaf {
  const node = path
    .split('.')
    .reduce<unknown>((n, k) => (n as Record<string, unknown>)?.[k], TOKENS);
  if (!node || typeof node !== 'object' || !('$value' in node))
    throw new Error(`no token at ${path}`);
  return node as Leaf;
}

/** A token's hex in a mode, following aliases (role → semantic → primitive). */
function hex(path: string, mode: Mode): string {
  const t = leaf(path);
  const raw = t.$extensions?.['com.figma.variables']?.modes?.[mode] ?? t.$value;
  if (typeof raw === 'string' && /^\{.+\}$/.test(raw)) {
    const target = raw.slice(1, -1);
    if (leaf(target).$extensions?.['com.figma.variables']) return hex(target, mode);
  }
  return resolveAlias(raw, TOKENS) as string;
}

const FLOOR: Record<Mode, number> = { Light: 1.45, Dark: 1.4 };
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

describe.each<Mode>(['Light', 'Dark'])('divider contrast in %s', (mode) => {
  describe.each(DIVIDERS)('%s', (divider) => {
    it.each(SURFACES)('reads on %s at the floor', (surface) => {
      expect(contrastRatio(hex(divider, mode), hex(surface, mode))).toBeGreaterThanOrEqual(
        FLOOR[mode],
      );
    });
  });

  it('keeps border.strong at least as strong as border.default', () => {
    const page = hex('semantic.color.surface.page', mode);
    expect(contrastRatio(hex('semantic.color.border.strong', mode), page)).toBeGreaterThanOrEqual(
      contrastRatio(hex('semantic.color.border.default', mode), page),
    );
  });
});

describe('light dividers stay quiet', () => {
  it.each(SURFACES)('border.default stays under 1.8:1 on %s', (surface) => {
    expect(
      contrastRatio(hex('semantic.color.border.default', 'Light'), hex(surface, 'Light')),
    ).toBeLessThan(1.8);
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
    const src = readFileSync(resolve(__dirname, '../../app/components', file), 'utf8');
    expect(src).toMatch(re);
  });

  it('.hds-divider uses border.default', () => {
    const css = readFileSync(resolve(__dirname, '../static.css'), 'utf8');
    expect(css).toMatch(/\.hds-divider \{[^}]*--semantic-color-border-default/);
  });
});
