/**
 * Raised edges (hds#897, C2): every hard "raised" edge is its item's own fill stepped
 * DARKER, same hue, C ×0.7225. Light: OKLCH L −0.12. Dark: L drops a third of the way to
 * the card (surface.raised), at least 0.03, so a dark edge never glows lighter than its
 * fill. The shipped --hds-edge-* values in tokens.generated.css / accents.css must equal
 * that rule applied to today's fill tokens.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  EDGE_FILLS,
  EDGE_MIN_CONTRAST,
  EDGE_TOKEN_FILLS,
  EDGE_TOKENS,
  hexToOklch,
  layered,
  oklchToHex,
  resolveColor,
  resolveHex,
  toOklch,
} from '../scripts/lib/raised-edge.mjs';
import { THEMES } from './helpers/token-sheet';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const raw = JSON.parse(read('hirobius.tokens.json'));
const css = read('src/styles/tokens.generated.css');
const theme = read('src/styles/theme.css');
const MODES = ['Light', 'Dark'] as const;
type Mode = (typeof MODES)[number];
const KEYS = Object.keys(EDGE_FILLS);
const TOKEN_KEYS = Object.keys(EDGE_TOKENS) as (keyof typeof EDGE_TOKENS)[];

/** The --hds-edge-* values a theme actually resolves to, keyed by edge name (computed ones). */
function shipped(mode: Mode): Record<string, string> {
  const vars = THEMES[mode === 'Light' ? 'light' : 'dark'];
  return Object.fromEntries(
    Object.entries(vars).flatMap(([name, value]) => {
      const m = name.match(/^--hds-edge-([a-z]+)$/);
      return m && m[1] in EDGE_FILLS ? [[m[1], value]] : [];
    }),
  );
}

/** The rule, written out independently of the generator. */
function expected(tree: object, key: string, mode: Mode): string {
  const f = toOklch(resolveColor(tree, EDGE_FILLS[key as keyof typeof EDGE_FILLS], mode));
  if (mode === 'Light') return oklchToHex({ l: f.l - 0.12, c: f.c * 0.7225, h: f.h });
  const card = hexToOklch(resolveHex(tree, 'semantic.color.surface.raised', mode));
  const dl = Math.max((f.l - card.l) / 3, 0.03);
  return oklchToHex({ l: f.l - dl, c: f.c * 0.7225, h: f.h });
}

/** Each sRGB channel within `tol` of the target (the C2 reference values are "≈"). */
function near(hex: string, target: string, tol = 4) {
  const ch = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = ch(hex);
  ch(target).forEach((v, i) =>
    expect(Math.abs(a[i] - v), `${hex} ≈ ${target}`).toBeLessThanOrEqual(tol),
  );
}

describe('OKLCH maths', () => {
  it('round-trips sRGB and matches known OKLCH values', () => {
    expect(hexToOklch('#ffffff').l).toBeCloseTo(1, 4);
    expect(hexToOklch('#000000').l).toBeCloseTo(0, 4);
    for (const hex of ['#4a4146', '#e5e5e5', '#450a0a', '#101932'])
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
    // CSS Color 4 reference: oklch(62.8% 0.2577 29.23) is sRGB red.
    expect(oklchToHex({ l: 0.628, c: 0.2577, h: 29.23 })).toBe('#ff0000');
  });

  it('clamps out-of-gamut results by chroma, keeping lightness', () => {
    const hex = oklchToHex({ l: 0.5, c: 0.5, h: 140 });
    expect(hexToOklch(hex).l).toBeCloseTo(0.5, 2);
    expect(hexToOklch(hex).c).toBeLessThan(0.5);
  });
});

describe.each(MODES)('raised edges (%s)', (mode) => {
  it('ships one edge per raised fill', () => {
    expect(Object.keys(shipped(mode)).sort()).toEqual([...KEYS].sort());
  });

  it.each(KEYS)('%s: the shipped edge is its fill per the rule', (key) => {
    expect(shipped(mode)[key]).toBe(expected(raw, key, mode));
  });

  it.each(KEYS)('%s: the edge is darker than its fill (never a lighter rim)', (key) => {
    const fill = toOklch(resolveColor(raw, EDGE_FILLS[key as keyof typeof EDGE_FILLS], mode));
    const edge = hexToOklch(shipped(mode)[key]);
    expect(edge.l).toBeLessThan(fill.l - 0.02);
    if (mode === 'Light') expect(edge.l).toBeCloseTo(fill.l - 0.12, 2);
  });
});

// Primary edges follow the graphite fill, near-black / near-white since hds#887.
describe('C2 reference edges (graphite defaults)', () => {
  it('light: primary ≈ #010207', () => {
    near(shipped('Light').primary, '#010207', 1);
  });
  it('dark: primary ≈ #a5a6a9', () => {
    near(shipped('Dark').primary, '#a5a6a9');
  });
});

describe('accent themes re-derive the primary edge', () => {
  const accents = read('src/styles/accents.css');
  const cobalt = JSON.parse(read('accents/cobalt/tokens.json'));
  const tree = layered(raw, cobalt);

  it.each(MODES)('cobalt (%s)', (mode) => {
    const sel =
      mode === 'Light' ? "[data-accent='cobalt']" : "[data-accent='cobalt'][data-theme='dark']";
    const re = new RegExp(
      `${sel.replace(/[[\]]/g, '\\$&')} \\{[^}]*--hds-edge-primary: (#[0-9a-f]{6})`,
    );
    expect(accents.match(re)?.[1]).toBe(expected(tree, 'primary', mode));
  });
});

describe('wiring', () => {
  it('Button and Kbd default their hooks to the own-colour edge; shadow.hard stays exported', () => {
    expect(theme.replace(/\s+/g, ' ')).toContain(
      '0 var(--hds-hs, 3px) 0 var(--hds-btn-edge, var(--hds-edge, var(--component-button-edge-secondary)))',
    );
    expect(theme.replace(/\s+/g, ' ').replace(/\( | \)/g, (m) => m.trim())).toContain(
      'var(--semantic-shadow-key, 0 2px 0 var(--hds-kbd-edge, var(--hds-edge-kbd)))',
    );
    expect(css).toContain('--semantic-color-shadow-hard:');
  });
});

// Button secondary and tone edges are tokens (component.button.edge.*), approved values.
describe('Button edge tokens', () => {
  const APPROVED: Record<Mode, Record<keyof typeof EDGE_TOKENS, string>> = {
    Light: {
      secondary: 'neutral.400',
      danger: 'red.400',
      success: 'green.400',
      warning: 'amber.400',
      info: 'blue.300',
    },
    Dark: {
      secondary: 'neutral.725',
      danger: 'red.700',
      success: 'green.700',
      warning: 'amber.800',
      info: 'blue.500',
    },
  };
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  it.each(TOKEN_KEYS)('%s: the component token aliases its semantic edge', (key) => {
    const token = raw.component.button.edge[key];
    expect(token.$value).toBe(`{${EDGE_TOKENS[key]}}`);
  });

  it.each(MODES.flatMap((m) => TOKEN_KEYS.map((k) => [m, k] as const)))(
    '%s %s: aliases the approved primitive',
    (mode, key) => {
      const token = EDGE_TOKENS[key].split('.').reduce((n, k) => n[k], raw);
      expect(token.$extensions['com.figma.variables'].modes[mode]).toBe(
        `{primitive.color.${APPROVED[mode][key]}}`,
      );
    },
  );

  it.each(MODES.flatMap((m) => TOKEN_KEYS.map((k) => [m, k] as const)))(
    '%s %s: at least 1.5:1 against its fill',
    (mode, key) => {
      const ratio = contrast(
        resolveHex(raw, EDGE_TOKENS[key], mode),
        resolveHex(raw, EDGE_TOKEN_FILLS[key], mode),
      );
      expect(EDGE_MIN_CONTRAST).toBe(1.5);
      expect(ratio).toBeGreaterThanOrEqual(EDGE_MIN_CONTRAST);
    },
  );

  it.each(TOKEN_KEYS)('--hds-edge-%s aliases its token for back-compat', (key) => {
    expect(css).toContain(`--hds-edge-${key}:var(--component-button-edge-${key});`);
  });
});
