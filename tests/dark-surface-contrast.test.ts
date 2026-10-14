/**
 * Dark-mode surface contrast (bug bash item 22 + the menu highlight fill, decided by
 * Adrian 2026-10-14): a card's resting edge must read against the page, and the
 * highlighted menu/select/combobox item (surface.sunken) must differ from the
 * overlay it sits on.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { contrastRatio } from '../src/app/utils/colorUtils';

const tokens = JSON.parse(readFileSync(resolve(process.cwd(), 'hirobius.tokens.json'), 'utf8'));

function at(path: string) {
  return path.split('.').reduce((node, key) => node?.[key], tokens);
}

/** Resolve a semantic token to a hex colour in the given Figma mode. */
function hex(path: string, mode: 'Light' | 'Dark'): string {
  const node = at(path);
  let value: unknown = node?.$extensions?.['com.figma.variables']?.modes?.[mode] ?? node?.$value;
  while (typeof value === 'string' && value.startsWith('{')) {
    const ref = at(value.slice(1, -1));
    value = ref?.$extensions?.['com.figma.variables']?.modes?.[mode] ?? ref?.$value;
  }
  if (typeof value !== 'string') throw new Error(`${path} (${mode}) does not resolve to a colour`);
  return value;
}

describe('dark-mode surface contrast', () => {
  it('a card edge (border.default) reads against the page at 2.5:1 or more', () => {
    const ratio = contrastRatio(
      hex('semantic.color.border.default', 'Dark'),
      hex('semantic.color.surface.page', 'Dark'),
    );
    expect(ratio).toBeGreaterThanOrEqual(2.5);
  });

  it('the highlighted item fill (surface.sunken) differs from the overlay', () => {
    const ratio = contrastRatio(
      hex('semantic.color.surface.sunken', 'Dark'),
      hex('semantic.color.surface.overlay', 'Dark'),
    );
    expect(ratio).toBeGreaterThanOrEqual(1.3);
  });

  it('leaves light mode as it was', () => {
    expect(hex('semantic.color.border.default', 'Light')).toBe(
      hex('primitive.color.neutral.200', 'Light'),
    );
    expect(hex('semantic.color.surface.sunken', 'Light')).toBe(
      hex('primitive.color.neutral.200', 'Light'),
    );
  });
});
