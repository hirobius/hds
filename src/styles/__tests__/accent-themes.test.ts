/**
 * Accent themes: graphite is the default accent, cobalt an opt-in swap
 * (`data-accent="cobalt"`), lime a delight-only secondary accent. Pins the
 * hex values Adrian chose and the WCAG ratios they were chosen for, against the
 * committed token source and the generated accents.css.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';
import { resolveAlias } from '../../../scripts/build-tokens.mjs';
import { contrastRatio, hexToLuminance } from '../../app/utils/colorUtils';

const ROOT = resolve(__dirname, '../../..');
const TOKENS = JSON.parse(readFileSync(resolve(ROOT, 'hirobius.tokens.json'), 'utf8')) as Record<
  string,
  unknown
>;
const COBALT = JSON.parse(
  readFileSync(resolve(ROOT, 'accents/cobalt/tokens.json'), 'utf8'),
) as Record<string, unknown>;
const ACCENTS_CSS = readFileSync(resolve(ROOT, 'src/styles/accents.css'), 'utf8');

type Leaf = {
  $value: unknown;
  $extensions?: Record<string, { modes?: Record<string, unknown> }>;
};

function leaf(tree: Record<string, unknown>, path: string): Leaf {
  const node = path.split('.').reduce<unknown>((n, k) => (n as Record<string, unknown>)?.[k], tree);
  if (!node || typeof node !== 'object' || !('$value' in node))
    throw new Error(`no token at ${path}`);
  return node as Leaf;
}

/** A token's hex in a Figma mode, following aliases; `tree` overlays the base. */
function hex(path: string, mode: 'Light' | 'Dark', tree = TOKENS): string {
  const t = leaf(tree, path);
  const raw = t.$extensions?.['com.figma.variables']?.modes?.[mode] ?? t.$value;
  return (resolveAlias(raw, TOKENS) as string).toLowerCase();
}

const ratio = (a: string, b: string) => Math.round(contrastRatio(a, b) * 100) / 100;
const WHITE = '#ffffff';
const BLACK = '#000000';
const INK = 'primitive.color.neutral.900';

describe('graphite (default accent)', () => {
  it('is a touch lighter in light mode and a touch darker in dark mode than 0.26', () => {
    expect(hexToLuminance(hex('semantic.accent.rest', 'Light'))).toBeGreaterThan(
      hexToLuminance('#433a3f'),
    );
    expect(hexToLuminance(hex('semantic.accent.rest', 'Dark'))).toBeLessThan(
      hexToLuminance('#d4d0d2'),
    );
  });

  it('keeps on-accent text AAA in both modes', () => {
    for (const mode of ['Light', 'Dark'] as const) {
      expect(
        contrastRatio(
          hex('semantic.color.content.onAccent', mode),
          hex('semantic.color.surface.accent', mode),
        ),
      ).toBeGreaterThanOrEqual(7);
    }
  });

  it('keeps hover a visible step from rest', () => {
    expect(
      contrastRatio(hex('semantic.accent.rest', 'Light'), hex('semantic.accent.hover', 'Light')),
    ).toBeGreaterThan(1.2);
  });
});

describe('cobalt ramp', () => {
  const RAMP = {
    50: '#eef0fe',
    100: '#dce1fd',
    200: '#b4bbf4',
    300: '#8a97f8',
    400: '#5b71fa',
    500: '#2a5bf8',
    600: '#112de8',
    700: '#1f17c4',
    800: '#191c7d',
    900: '#0b0658',
  };
  it.each(Object.entries(RAMP))('cobalt.%s is %s', (step, value) => {
    expect(hex(`primitive.color.cobalt.${step}`, 'Light')).toBe(value);
  });

  it('accent 600 carries white text at 8.19:1', () => {
    expect(ratio(hex('primitive.color.cobalt.600', 'Light'), WHITE)).toBe(8.19);
  });

  it('dark-mode accent 300 reads on black at 7.86:1', () => {
    expect(ratio(hex('primitive.color.cobalt.300', 'Light'), BLACK)).toBe(7.86);
  });
});

describe('cobalt accent theme (accents/cobalt/tokens.json)', () => {
  const roles: Array<[string, 'Light' | 'Dark', string]> = [
    ['semantic.accent.rest', 'Light', 'primitive.color.cobalt.600'],
    ['semantic.accent.hover', 'Light', 'primitive.color.cobalt.700'],
    ['semantic.accent.pressed', 'Light', 'primitive.color.cobalt.700'],
    ['semantic.accent.subtle', 'Light', 'primitive.color.cobalt.50'],
    ['semantic.color.surface.accent', 'Light', 'primitive.color.cobalt.600'],
    ['semantic.color.surface.accentSubtle', 'Light', 'primitive.color.cobalt.50'],
    ['semantic.color.content.accent', 'Light', 'primitive.color.cobalt.600'],
    ['semantic.color.border.accent', 'Light', 'primitive.color.cobalt.600'],
    ['semantic.accent.rest', 'Dark', 'primitive.color.cobalt.300'],
    ['semantic.color.surface.accent', 'Dark', 'primitive.color.cobalt.300'],
    ['semantic.color.content.accent', 'Dark', 'primitive.color.cobalt.300'],
  ];
  it.each(roles)('%s (%s) → %s', (path, mode, primitive) => {
    expect(hex(path, mode, COBALT)).toBe(hex(primitive, 'Light'));
  });

  it('on-accent text is white on cobalt 600 (8.19:1) and clears AA in dark', () => {
    expect(
      ratio(
        hex('semantic.color.content.onAccent', 'Light', COBALT),
        hex('semantic.color.surface.accent', 'Light', COBALT),
      ),
    ).toBe(8.19);
    expect(
      contrastRatio(
        hex('semantic.color.content.onAccent', 'Dark', COBALT),
        hex('semantic.color.surface.accent', 'Dark', COBALT),
      ),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('accent text clears AA on page and raised surfaces in both modes', () => {
    for (const mode of ['Light', 'Dark'] as const) {
      for (const bg of ['semantic.color.surface.page', 'semantic.color.surface.raised']) {
        expect(
          contrastRatio(hex('semantic.color.content.accent', mode, COBALT), hex(bg, mode)),
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('emits a [data-accent="cobalt"] block with a dark variant', () => {
    expect(ACCENTS_CSS).toMatch(/\[data-accent=['"]cobalt['"]\]\s*\{/);
    expect(ACCENTS_CSS).toMatch(/\[data-accent=['"]cobalt['"]\]\[data-theme=['"]dark['"]\]/);
    expect(ACCENTS_CSS).toContain('--primitive-color-cobalt-600');
  });

  it('swaps only accent tokens', () => {
    const vars = [...ACCENTS_CSS.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]);
    expect(vars.length).toBeGreaterThan(0);
    for (const v of vars) expect(v).toMatch(/accent|primary|ring|button|tag-active|nav-.*Active/i);
  });
});

describe('lime delight accent (semantic.accent.delight.*)', () => {
  it('pins base, deep and pale', () => {
    expect(hex('semantic.accent.delight.base', 'Light')).toBe('#b8e62e');
    expect(hex('semantic.accent.delight.deep', 'Light')).toBe('#6e8f0b');
    expect(hex('semantic.accent.delight.pale', 'Light')).toBe('#f2fbd6');
  });

  it('text on the delight base is always ink, 12.95:1', () => {
    for (const mode of ['Light', 'Dark'] as const) {
      expect(hex('semantic.accent.delight.onDelight', mode)).toBe(hex(INK, 'Light'));
      expect(hex('semantic.accent.delight.base', mode)).toBe('#b8e62e');
    }
    expect(ratio(hex('semantic.accent.delight.onDelight', 'Light'), '#b8e62e')).toBe(12.95);
  });

  it('ink clears AA on every delight fill', () => {
    for (const step of ['base', 'pale']) {
      expect(
        contrastRatio(hex(INK, 'Light'), hex(`semantic.accent.delight.${step}`, 'Light')),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('ships a small lime ramp', () => {
    const steps = Object.keys(
      (TOKENS.primitive as Record<string, Record<string, object>>).color.lime,
    ).filter((k) => !k.startsWith('$'));
    expect(steps.length).toBeGreaterThanOrEqual(5);
  });
});
