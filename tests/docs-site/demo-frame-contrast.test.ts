/**
 * Guard (#895 review): the docs demo frame must separate from both fills a borderless
 * component sits on — surface.raised (Cards, demo tiles) and surface.muted (Tags, chips,
 * SegmentedControl tracks) — in both themes, without an outline (hds#891). A frame on
 * surface.raised put Cards at 1.00:1; on surface.muted it swallowed the muted controls.
 *
 * Floors: light 1.03:1, dark 1.1:1. On surface.page the frame measures
 * light 1.04 (raised) / 1.09 (muted), dark 1.21 (raised) / 1.39 (muted).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../../src/app/utils/colorUtils';

const ROOT = resolve(__dirname, '../..');
const CSS = readFileSync(resolve(ROOT, 'src/styles/tokens.generated.css'), 'utf8');
const DEMOS = readFileSync(resolve(ROOT, 'docs-site/components/component-demos.tsx'), 'utf8');

type Theme = 'light' | 'dark';
const BLOCK: Record<Theme, RegExp> = {
  light: /^:root \{([\s\S]*?)^\}/m,
  dark: /^\[data-theme="dark"\] \{([\s\S]*?)^\}/m,
};
const FLOOR: Record<Theme, number> = { light: 1.03, dark: 1.1 };

/** A CSS custom property's hex in a theme, following var() chains (dark falls back to :root). */
function hex(name: string, theme: Theme): string {
  const blocks = theme === 'dark' ? [BLOCK.dark, BLOCK.light] : [BLOCK.light];
  for (const re of blocks) {
    const body = CSS.match(re)?.[1] ?? '';
    const m = body.match(new RegExp(`^\\s*${name}:\\s*([^;]+);`, 'm'));
    if (!m) continue;
    const value = m[1].trim();
    const ref = value.match(/^var\((--[\w-]+)\)$/);
    return ref ? hex(ref[1], theme) : value;
  }
  throw new Error(`no ${name} in ${theme}`);
}

function frameBackground(): string {
  const fn = DEMOS.match(/export function DemoFrame[\s\S]*?\n\}/)?.[0] ?? '';
  const bg = fn.match(/background:\s*'var\((--[\w-]+)\)'/)?.[1];
  if (!bg) throw new Error('DemoFrame has no var() background');
  return bg;
}

describe.each<Theme>(['light', 'dark'])('docs demo frame in %s', (theme) => {
  it.each(['--semantic-color-surface-raised', '--semantic-color-surface-muted'])(
    'separates from %s at the floor',
    (fill) => {
      const ratio = contrastRatio(hex(frameBackground(), theme), hex(fill, theme));
      expect(ratio).toBeGreaterThanOrEqual(FLOOR[theme]);
    },
  );

  it('draws no outline', () => {
    const fn = DEMOS.match(/export function DemoFrame[\s\S]*?\n\}/)?.[0] ?? '';
    expect(fn).not.toMatch(/\b(border|outline|boxShadow)\s*:/);
  });
});
