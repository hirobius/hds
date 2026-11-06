/**
 * Overlay edge (#893 review): a menu, popover, select listbox, toast or dialog
 * has to separate from whatever it opens over. #893 moved Tags, chips, the
 * SegmentedControl track and the docs demo frame onto surface.muted, which was
 * the same colour as the popover fill in both themes (1.00:1, and in dark the
 * shadow is invisible on near-black).
 *
 * The edge is the fill or the hairline border, whichever separates more, per
 * backdrop. Floors:
 * - light 1.15:1 — the soft overlay shadow reads on every light backdrop, so a
 *   faint step is enough on top of it;
 * - dark 1.5:1 — a shadow cannot darken near-black, so the edge alone must
 *   carry the separation.
 */
import { describe, it, expect } from 'vitest';
import { contrastRatio } from '../../app/utils/colorUtils';
import { repoFile, tokenHex, type TokenMode } from './style-test-helpers';

const FLOOR: Record<TokenMode, number> = { Light: 1.15, Dark: 1.5 };
const FILL = 'role.popover';
const BORDER = 'role.border';
const BACKDROPS = [
  'semantic.color.surface.page',
  'semantic.color.surface.raised',
  'semantic.color.surface.muted',
  'semantic.color.surface.overlay',
];

describe.each<TokenMode>(['Light', 'Dark'])('overlay edge in %s', (mode) => {
  it.each(BACKDROPS)(`separates from %s at the floor`, (backdrop) => {
    const b = tokenHex(backdrop, mode);
    const edge = Math.max(
      contrastRatio(tokenHex(FILL, mode), b),
      contrastRatio(tokenHex(BORDER, mode), b),
    );
    expect(edge).toBeGreaterThanOrEqual(FLOOR[mode]);
  });

  it('fills overlays per the open-layout spec (white / neutral.800 #212630)', () => {
    expect(tokenHex(FILL, mode)).toBe(mode === 'Light' ? '#ffffff' : '#212630');
  });

  it('keeps popover text at WCAG AA on the overlay fill', () => {
    const fg = tokenHex('role.popover-foreground', mode);
    expect(contrastRatio(fg, tokenHex(FILL, mode))).toBeGreaterThanOrEqual(4.5);
  });
});

// The border only counts if every overlay surface draws it.
const OVERLAY_SOURCES = [
  'menu.tsx',
  'popover.tsx',
  'select.tsx',
  'toast.tsx',
  'dialog.tsx',
  'alert-dialog.tsx',
];

describe('overlay surfaces draw the hairline', () => {
  it.each(OVERLAY_SOURCES)('%s pairs bg-popover with border-border', (file) => {
    const src = repoFile(`src/app/components/${file}`);
    expect(src).toContain('bg-popover');
    expect(src).toMatch(/\bborder border-border\b/);
  });
});
