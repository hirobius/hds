/**
 * Light mode surface ladder (hds#522, Adrian 11-04/11-05): a raised surface (Card,
 * Surface, StatusTile, MetricTile) sat at neutral.50 on a white page, 1.04:1, and
 * blended in. The ladder is re-spaced so raised reaches the same ~1.2:1 the dark
 * ladder guards, the state fills (Tag bg, the neutral Badge, InlineCode, the
 * tertiary Button hover, --role-muted) still read ON raised, and sunken and
 * selected are distinct from each other and from hover/muted.
 *
 * Resolves the committed token source, so it pins what the build emits.
 */
import { describe, it, expect } from 'vitest';
import { contrastRatio, hexToLuminance } from '../../app/utils/colorUtils';
import { tokenHex } from './style-test-helpers';

const s = (name: string) => `semantic.color.surface.${name}`;
const hex = (p: string) => tokenHex(p, 'Light');
const ratio = (a: string, b: string) => contrastRatio(hex(a), hex(b));
const lum = (p: string) => hexToLuminance(hex(p));

// The ladder, darker as it goes down. Ratio = contrast against the page.
const LADDER: Array<[name: string, hex: string, vsPage: number]> = [
  ['page', '#ffffff', 1],
  ['raised', '#e9eaec', 1.2],
  ['overlay', '#dddee0', 1.35],
  ['hover', '#dddee0', 1.35],
  ['muted', '#dddee0', 1.35],
  ['sunken', '#d3d4d6', 1.48],
  ['pressed', '#d3d4d6', 1.48],
  ['soft', '#d3d4d6', 1.48],
  ['selected', '#c7c9cc', 1.66],
  ['softHover', '#c7c9cc', 1.66],
];

describe('light surface ladder: pinned values', () => {
  it.each(LADDER)('surface.%s is %s, %s:1 on the page', (name, want, vsPage) => {
    expect(hex(s(name))).toBe(want);
    expect(ratio(s(name), s('page'))).toBeCloseTo(vsPage, 1);
  });
});

describe('light surface ladder: steps', () => {
  it('raised is distinct from the page like dark: 1.2:1 to 1.25:1', () => {
    expect(ratio(s('raised'), s('page'))).toBeGreaterThanOrEqual(1.2);
    expect(ratio(s('raised'), s('page'))).toBeLessThanOrEqual(1.25);
  });

  it.each(['overlay', 'hover', 'muted', 'sunken', 'selected', 'pressed', 'soft'])(
    '%s reads on raised (at least 1.1:1, darker)',
    (name) => {
      expect(lum(s(name))).toBeLessThan(lum(s('raised')));
      expect(ratio(s(name), s('raised'))).toBeGreaterThanOrEqual(1.1);
    },
  );

  it('sunken is one step past hover/muted (at least 1.1:1)', () => {
    expect(ratio(s('sunken'), s('muted'))).toBeGreaterThanOrEqual(1.1);
    expect(ratio(s('sunken'), s('hover'))).toBeGreaterThanOrEqual(1.1);
  });

  it('selected is not sunken: one step past it (at least 1.1:1), and 1.2:1 past hover/muted', () => {
    expect(hex(s('selected'))).not.toBe(hex(s('sunken')));
    expect(ratio(s('selected'), s('sunken'))).toBeGreaterThanOrEqual(1.1);
    expect(ratio(s('selected'), s('hover'))).toBeGreaterThanOrEqual(1.2);
    expect(ratio(s('selected'), s('muted'))).toBeGreaterThanOrEqual(1.2);
  });

  it('pressed reads darker than hover (at least 1.1:1)', () => {
    expect(lum(s('pressed'))).toBeLessThan(lum(s('hover')));
    expect(ratio(s('pressed'), s('hover'))).toBeGreaterThanOrEqual(1.1);
  });

  it('softHover is one step past soft (at least 1.1:1)', () => {
    expect(ratio(s('softHover'), s('soft'))).toBeGreaterThanOrEqual(1.1);
  });
});

describe('light text on every surface', () => {
  const ALL = LADDER.map(([n]) => n).concat('floating');
  it.each(ALL.flatMap((n) => [['primary', n] as const, ['secondary', n] as const]))(
    'content.%s on surface.%s is AA (4.5:1)',
    (content, surface) => {
      expect(ratio(`semantic.color.content.${content}`, s(surface))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(['page', 'raised', 'overlay', 'hover', 'muted', 'floating'])(
    'content.tertiary on surface.%s is AA (4.5:1)',
    (surface) => {
      expect(ratio('semantic.color.content.tertiary', s(surface))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('keeps the tertiary < secondary < primary hierarchy', () => {
    const page = s('page');
    const [t, sec, p] = ['tertiary', 'secondary', 'primary'].map((c) =>
      ratio(`semantic.color.content.${c}`, page),
    );
    expect(t).toBeLessThan(sec);
    expect(sec).toBeLessThan(p);
  });
});
