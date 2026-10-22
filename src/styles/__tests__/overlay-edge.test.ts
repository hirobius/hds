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

const FLOOR: Record<Mode, number> = { Light: 1.15, Dark: 1.5 };
const FILL = 'role.popover';
const BORDER = 'role.border';
const BACKDROPS = [
  'semantic.color.surface.page',
  'semantic.color.surface.raised',
  'semantic.color.surface.muted',
  'semantic.color.surface.overlay',
];

describe.each<Mode>(['Light', 'Dark'])('overlay edge in %s', (mode) => {
  it.each(BACKDROPS)(`separates from %s at the floor`, (backdrop) => {
    const b = hex(backdrop, mode);
    const edge = Math.max(contrastRatio(hex(FILL, mode), b), contrastRatio(hex(BORDER, mode), b));
    expect(edge).toBeGreaterThanOrEqual(FLOOR[mode]);
  });

  it('fills overlays per the open-layout spec (white / #262626)', () => {
    expect(hex(FILL, mode)).toBe(mode === 'Light' ? '#ffffff' : '#262626');
  });

  it('keeps popover text at WCAG AA on the overlay fill', () => {
    const fg = hex('role.popover-foreground', mode);
    expect(contrastRatio(fg, hex(FILL, mode))).toBeGreaterThanOrEqual(4.5);
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
    const src = readFileSync(resolve(__dirname, '../../app/components', file), 'utf8');
    expect(src).toContain('bg-popover');
    expect(src).toMatch(/\bborder border-border\b/);
  });
});
