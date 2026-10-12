/**
 * Dark mode surface ladder: a raised surface (Card, Surface, StatusTile,
 * MetricTile) has to read as distinct from the page, which it did not at
 * neutral.950 on black (1.06:1, no border). Resolves the committed token
 * source, so it pins what the build emits.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';
import { resolveAlias } from '../../../scripts/build-tokens.mjs';
import { contrastRatio, hexToLuminance } from '../../app/utils/colorUtils';

const TOKENS = JSON.parse(
  readFileSync(resolve(__dirname, '../../../hirobius.tokens.json'), 'utf8'),
) as Record<string, unknown>;

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

/** A token's hex in a Figma mode, following aliases. */
function hex(path: string, mode: 'Light' | 'Dark'): string {
  const t = leaf(path);
  const raw = t.$extensions?.['com.figma.variables']?.modes?.[mode] ?? t.$value;
  return resolveAlias(raw, TOKENS) as string;
}

const PAGE = 'semantic.color.surface.page';
const RAISED = 'semantic.color.surface.raised';
const OVERLAY = 'semantic.color.surface.overlay';
const HOVER = 'semantic.color.surface.hover';
const MUTED = 'semantic.color.surface.muted';
const PRESSED = 'semantic.color.surface.pressed';
const BORDER_SUBTLE = 'semantic.color.border.subtle';
const lum = (p: string) => hexToLuminance(hex(p, 'Dark'));
const ratio = (a: string, b: string) => contrastRatio(hex(a, 'Dark'), hex(b, 'Dark'));

describe('dark surface ladder', () => {
  it('raised is distinct from the page: at least 1.2:1', () => {
    expect(contrastRatio(hex(RAISED, 'Dark'), hex(PAGE, 'Dark'))).toBeGreaterThanOrEqual(1.2);
  });

  it('orders page < raised < overlay by luminance', () => {
    const [page, raised, overlay] = [PAGE, RAISED, OVERLAY].map((p) =>
      hexToLuminance(hex(p, 'Dark')),
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
    const fg = hex(`semantic.color.${content}`, 'Dark');
    expect(contrastRatio(fg, hex(surface, 'Dark'))).toBeGreaterThanOrEqual(4.5);
  });

  it('leaves light mode alone', () => {
    expect(hex(PAGE, 'Light')).toBe('#ffffff');
    expect(hex(RAISED, 'Light')).toBe('#fafafa');
    expect(hex(OVERLAY, 'Light')).toBe('#f5f5f5');
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
      contrastRatio(hex('semantic.color.content.primary', 'Dark'), hex(surface, 'Dark')),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('leaves the light steps alone', () => {
    expect(hex(HOVER, 'Light')).toBe('#f5f5f5');
    expect(hex(MUTED, 'Light')).toBe('#f5f5f5');
    expect(hex(PRESSED, 'Light')).toBe('#fafafa');
    expect(hex(BORDER_SUBTLE, 'Light')).toBe('#f5f5f5');
  });
});

describe('component.inlineCode.bg', () => {
  it('aliases semantic.color.surface.overlay, so it follows it into dark', () => {
    const t = leaf('component.inlineCode.bg');
    expect(t.$value).toBe('{semantic.color.surface.overlay}');
    // A component token carries no modes of its own; the alias takes the semantic token's.
    expect(t.$extensions).toBeUndefined();
    expect(hex('component.inlineCode.bg', 'Light')).toBe(hex(OVERLAY, 'Light'));
  });
});
