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
  hexToOklch,
  layered,
  oklchToHex,
  resolveColor,
  resolveHex,
  toOklch,
} from '../scripts/lib/raised-edge.mjs';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const raw = JSON.parse(read('hirobius.tokens.json'));
const css = read('src/styles/tokens.generated.css');
const theme = read('src/styles/theme.css');
const MODES = ['Light', 'Dark'] as const;
type Mode = (typeof MODES)[number];
const KEYS = Object.keys(EDGE_FILLS);

/** The --hds-edge-* values a CSS block (selector start → `}`) declares. */
function block(text: string, selector: string): Record<string, string> {
  const at = text.indexOf(selector + '{');
  const from = at > -1 ? at : text.indexOf(selector + ' {');
  if (from < 0) return {};
  const body = text.slice(from, text.indexOf('}', from));
  return Object.fromEntries(
    [...body.matchAll(/--hds-edge-([a-z]+):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]]),
  );
}

/** What a theme actually resolves to: the light block, then the dark block over it. */
function shipped(mode: Mode): Record<string, string> {
  const light = block(css, ':root');
  return mode === 'Light' ? light : { ...light, ...block(css, '[data-theme="dark"]') };
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

describe('C2 reference edges (graphite defaults)', () => {
  it('light: secondary ≈ #bebebe, primary ≈ #292427', () => {
    near(shipped('Light').secondary, '#bebebe', 1);
    near(shipped('Light').primary, '#292427', 1);
  });
  it('dark: secondary ≈ neutral-700 #404040, primary ≈ graphite-400 #8b8488', () => {
    near(shipped('Dark').secondary, '#404040');
    near(shipped('Dark').primary, '#8b8488');
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
      '0 var(--hds-hs, 3px) 0 var(--hds-btn-edge, var(--hds-edge, var(--hds-edge-secondary)))',
    );
    expect(theme.replace(/\s+/g, ' ').replace(/\( | \)/g, (m) => m.trim())).toContain(
      'var(--semantic-shadow-key, 0 2px 0 var(--hds-kbd-edge, var(--hds-edge-kbd)))',
    );
    expect(css).toContain('--semantic-color-shadow-hard:');
  });
});
