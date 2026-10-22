/**
 * Raised edges (hds#896): every hard "raised" edge is its item's own fill stepped two steps
 * darker (OKLCH L −0.12, C ×0.7225, same hue). In dark, an edge under 1.5:1 on the surface
 * it sits on steps lighter instead (L +0.12, then +0.01 until 1.5:1). The shipped
 * --hds-edge-* values in tokens.generated.css / accents.css must equal that rule applied
 * to today's fill tokens.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  EDGE_FILLS,
  EDGE_GROUNDS,
  contrast,
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
  const darker = oklchToHex({ l: f.l - 0.12, c: f.c * 0.7225, h: f.h });
  if (mode === 'Light') return darker;
  const grounds = EDGE_GROUNDS.map((g: string) => resolveHex(tree, g, mode));
  const ok = (hex: string) => grounds.every((g: string) => contrast(hex, g) >= 1.5);
  if (ok(darker)) return darker;
  for (let i = 0; i <= 100; i += 1) {
    const hex = oklchToHex({ l: f.l + 0.12 + i * 0.01, c: f.c * 0.7225, h: f.h });
    if (ok(hex)) return hex;
  }
  throw new Error(`no lighter rim clears 1.5:1 for ${key}`);
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

  if (mode === 'Light')
    it.each(KEYS)('%s: the edge is darker than its fill, same hue family', (key) => {
      const fill = toOklch(resolveColor(raw, EDGE_FILLS[key as keyof typeof EDGE_FILLS], mode));
      const edge = hexToOklch(shipped(mode)[key]);
      expect(edge.l).toBeCloseTo(fill.l - 0.12, 2);
    });

  if (mode === 'Dark')
    it.each(KEYS)('%s: the edge reaches 1.5:1 on every surface it sits on', (key) => {
      for (const g of EDGE_GROUNDS)
        expect(contrast(shipped(mode)[key], resolveHex(raw, g, mode))).toBeGreaterThanOrEqual(1.5);
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
