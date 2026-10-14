/**
 * Contract test: Slider touch target (WCAG 2.5.8). The native range input is only
 * as tall as its 20px row; under a coarse pointer the hit area lifts to the
 * interactive-min token while negative margins keep the row's layout height.
 * Fine pointers get no rule, so desktop renders unchanged.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const css = readFileSync(resolve(__dirname, '../theme.css'), 'utf8');

function coarseBlock(): string {
  const start = css.indexOf('@media (pointer: coarse)');
  if (start === -1) throw new Error('@media (pointer: coarse) not found in theme.css');
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1);
  }
  throw new Error('unbalanced @media (pointer: coarse)');
}

describe('slider touch target', () => {
  it('a11y:slider.target-size lifts .hds-slider-input to the interactive-min token under a coarse pointer', () => {
    const block = coarseBlock();
    const rule = block.match(/\.hds-slider-input\s*\{([^}]*)\}/);
    expect(rule, '.hds-slider-input rule inside @media (pointer: coarse)').toBeTruthy();
    expect(rule![1]).toMatch(/height:\s*var\(--primitive-size-interactive-min\)/);
  });

  it('cancels the extra height with negative margins so the row does not grow', () => {
    const rule = coarseBlock().match(/\.hds-slider-input\s*\{([^}]*)\}/)![1];
    expect(rule).toMatch(
      /margin-block:\s*calc\(\s*\(var\(--semantic-size-control-md\) - var\(--primitive-size-interactive-min\)\) \/ 2\s*\)/,
    );
  });

  it('adds no base .hds-slider-input height/margin outside the coarse query', () => {
    const outside = css.replace(coarseBlock(), '');
    const base = outside.match(/\.hds-slider-input\s*\{([^}]*)\}/)![1];
    expect(base).not.toMatch(/height|margin/);
  });
});
