/**
 * FoundationSwatch stories, dark-mode contrast guard (hds#349).
 *
 * The swatch stories referenced --semantic-color-bg-default / bg-subtle /
 * bg-brand, which are not tokens. Each fell back to a literal light hex that
 * never flips in dark, so the theme-aware label (light in dark) landed on a
 * white or near-white fill at 1.03-1.09:1. Two swatches also forced a literal
 * white label. Stories must use real role tokens (surface-*, content-*) so
 * both halves of the pair flip together. scripts/check-storybook-axe.mjs is
 * the rendered check (light and dark, no allowlist entry).
 */
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/stories/foundation-swatch.stories.tsx'),
  'utf8',
);
const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.generated.css'), 'utf8');

describe('foundation-swatch stories, theme-safe pairs (hds#349)', () => {
  it('only references custom properties that exist', () => {
    const missing = [...source.matchAll(/var\((--[a-zA-Z0-9-]+)/g)]
      .map(([, name]) => name)
      .filter((name) => !css.includes(`${name}:`));
    expect(missing).toEqual([]);
  });

  it('paints no literal colours (a fixed light hex or white label never flips in dark)', () => {
    expect(source).not.toMatch(/(?:color|background|foreground)\s*[:=]\s*['"{`]*#[0-9a-fA-F]{3,8}/);
  });
});
