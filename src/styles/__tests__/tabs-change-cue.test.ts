import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../theme.css', import.meta.url), 'utf8');

describe('Tabs change cue CSS (hds#938)', () => {
  it('animates the active panel in on motion tokens only', () => {
    expect(css).toMatch(/@keyframes hds-tabs-enter\s*\{[^}]*from\s*\{[^}]*opacity:\s*0/);
    const rule = css.match(/\.hds-tabs-content\[data-state='active'\]\s*\{([^}]*)\}/);
    expect(rule?.[1]).toMatch(
      /animation:\s*hds-tabs-enter var\(--hds-motion-productive-duration\)\s+var\(--hds-motion-productive-easing\)/,
    );
  });

  it('is static under prefers-reduced-motion', () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[^@]*\.hds-tabs-content[^{]*\{\s*animation:\s*none/,
    );
  });
});
