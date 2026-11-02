/**
 * Contract test (hds#1009): src/styles keeps one copy of each repeated block.
 * - The slider thumb's shared look lives in custom properties on the input, so
 *   the -webkit and -moz thumb rules stay one-liners, and the hover/active scale
 *   is a custom property (a selector list mixing vendor pseudo-elements is
 *   invalid as a whole, so the old combined rule never applied in any browser).
 * - The fade-up and fade-down reveals share one keyframe driven by an offset
 *   custom property.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const theme = readFileSync(resolve(__dirname, '../theme.css'), 'utf8');
const motion = readFileSync(resolve(__dirname, '../scroll-motion.css'), 'utf8');

describe('styles dedupe', () => {
  it('never mixes -webkit and -moz pseudo-elements in one selector list', () => {
    expect(theme).not.toMatch(/::-webkit-[\w-]+,\s*\n?[^{]*::-moz-/);
  });

  it('drives the slider thumb scale through a custom property', () => {
    expect(theme).toMatch(
      /\.hds-slider-input:is\(:hover, :focus-visible\)\s*\{\s*--hds-slider-thumb-scale:\s*1\.08;/,
    );
    expect(theme).toMatch(/\.hds-slider-input:active\s*\{\s*--hds-slider-thumb-scale:\s*1\.14;/);
    const thumbs = theme.match(/transform:\s*scale\(var\(--hds-slider-thumb-scale, 1\)\)/g) ?? [];
    expect(thumbs.length).toBe(2);
  });

  it('shares one vertical reveal keyframe for fade-up and fade-down', () => {
    expect(motion).not.toMatch(/@keyframes hds-reveal-fade-(up|down)/);
    expect(motion).toMatch(/@keyframes hds-reveal-fade-y/);
    expect(motion).toMatch(
      /\[data-reveal='fade-up'\]\s*\{[^}]*--hds-reveal-offset:\s*var\(--semantic-motion-distance\)/,
    );
    expect(motion).toMatch(
      /\[data-reveal='fade-down'\]\s*\{[^}]*--hds-reveal-offset:\s*calc\(-1 \* var\(--semantic-motion-distance\)\)/,
    );
  });
});
