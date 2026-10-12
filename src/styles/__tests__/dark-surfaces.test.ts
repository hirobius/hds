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

describe('component.inlineCode.bg', () => {
  it('aliases semantic.color.surface.overlay, so it follows it into dark', () => {
    const t = leaf('component.inlineCode.bg');
    expect(t.$value).toBe('{semantic.color.surface.overlay}');
    // A component token carries no modes of its own; the alias takes the semantic token's.
    expect(t.$extensions).toBeUndefined();
    expect(hex('component.inlineCode.bg', 'Light')).toBe(hex(OVERLAY, 'Light'));
  });
});
