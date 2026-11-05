/**
 * Dark mode surface ladder: a raised surface (Card, Surface, StatusTile,
 * MetricTile) has to read as distinct from the page, which it did not at
 * neutral.950 on black (1.06:1, no border). Resolves the committed token
 * source, so it pins what the build emits.
 */
import { describe, it, expect } from 'vitest';
import { contrastRatio, hexToLuminance } from '../../app/utils/colorUtils';
import { tokenHex, tokenLeaf } from './style-test-helpers';

const PAGE = 'semantic.color.surface.page';
const RAISED = 'semantic.color.surface.raised';
const OVERLAY = 'semantic.color.surface.overlay';
const HOVER = 'semantic.color.surface.hover';
const MUTED = 'semantic.color.surface.muted';
const PRESSED = 'semantic.color.surface.pressed';
const BORDER_SUBTLE = 'semantic.color.border.subtle';
const lum = (p: string) => hexToLuminance(tokenHex(p, 'Dark'));
const ratio = (a: string, b: string) => contrastRatio(tokenHex(a, 'Dark'), tokenHex(b, 'Dark'));

describe('dark surface ladder', () => {
  it('raised is distinct from the page: at least 1.2:1', () => {
    expect(contrastRatio(tokenHex(RAISED, 'Dark'), tokenHex(PAGE, 'Dark'))).toBeGreaterThanOrEqual(
      1.2,
    );
  });

  it('orders page < raised < overlay by luminance', () => {
    const [page, raised, overlay] = [PAGE, RAISED, OVERLAY].map((p) =>
      hexToLuminance(tokenHex(p, 'Dark')),
    );
    expect(page).toBeLessThan(raised);
    expect(raised).toBeLessThan(overlay);
  });

  it.each([
    ['content.primary', RAISED],
    ['content.secondary', RAISED],
    ['content.primary', OVERLAY],
    ['content.secondary', OVERLAY],
  ])('keeps %s on %s at WCAG AA (4.5:1) in dark', (content, surface) => {
    const fg = tokenHex(`semantic.color.${content}`, 'Dark');
    expect(contrastRatio(fg, tokenHex(surface, 'Dark'))).toBeGreaterThanOrEqual(4.5);
  });

  // Light was re-spaced on purpose in hds#522 (raised 1.04:1 -> 1.2:1);
  // light-surfaces.test.ts owns the light ladder. These pins catch a drift.
  it('pins the light page, raised and overlay', () => {
    expect(tokenHex(PAGE, 'Light')).toBe('#ffffff');
    expect(tokenHex(RAISED, 'Light')).toBe('#e9eaec');
    expect(tokenHex(OVERLAY, 'Light')).toBe('#dddee0');
  });
});

describe('dark state steps on the lighter raised surface', () => {
  it('hover and muted sit lighter than raised', () => {
    expect(lum(HOVER)).toBeGreaterThan(lum(RAISED));
    expect(lum(MUTED)).toBeGreaterThan(lum(RAISED));
  });

  it('hover is distinct from both raised and overlay (at least 1.2:1)', () => {
    expect(ratio(HOVER, RAISED)).toBeGreaterThanOrEqual(1.2);
    expect(ratio(HOVER, OVERLAY)).toBeGreaterThanOrEqual(1.2);
  });

  it('muted is distinct from raised (at least 1.1:1)', () => {
    expect(ratio(MUTED, RAISED)).toBeGreaterThanOrEqual(1.1);
  });

  it('pressed reads darker than hover and still distinct from raised (at least 1.2:1)', () => {
    expect(lum(PRESSED)).toBeLessThan(lum(HOVER));
    expect(ratio(PRESSED, RAISED)).toBeGreaterThanOrEqual(1.2);
  });

  it('border.subtle is visible on raised (at least 1.2:1) without turning into a hard edge (at most 1.8:1)', () => {
    expect(ratio(BORDER_SUBTLE, RAISED)).toBeGreaterThanOrEqual(1.2);
    expect(ratio(BORDER_SUBTLE, RAISED)).toBeLessThanOrEqual(1.8);
  });

  it.each([HOVER, MUTED, PRESSED])('keeps content.primary on %s at AA (4.5:1)', (surface) => {
    expect(
      contrastRatio(tokenHex('semantic.color.content.primary', 'Dark'), tokenHex(surface, 'Dark')),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('pins the light steps (re-spaced in hds#522)', () => {
    expect(tokenHex(HOVER, 'Light')).toBe('#dddee0');
    expect(tokenHex(MUTED, 'Light')).toBe('#dddee0');
    expect(tokenHex(PRESSED, 'Light')).toBe('#d3d4d6');
    expect(tokenHex(BORDER_SUBTLE, 'Light')).toBe('#f4f5f7');
  });
});

describe('component.inlineCode.bg', () => {
  it('aliases semantic.color.surface.overlay, so it follows it into dark', () => {
    const t = tokenLeaf('component.inlineCode.bg');
    expect(t.$value).toBe('{semantic.color.surface.overlay}');
    // A component token carries no modes of its own; the alias takes the semantic token's.
    expect(t.$extensions).toBeUndefined();
    expect(tokenHex('component.inlineCode.bg', 'Light')).toBe(tokenHex(OVERLAY, 'Light'));
  });
});
