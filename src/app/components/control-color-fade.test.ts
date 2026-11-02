import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTROL_COLOR_FADE } from './control-color-fade';

// hds#751 slice: the checked/unchecked colour fade on Checkbox, Toggle (switch)
// and Radio runs on the productive motion token (duration + easing), via the CSS
// custom properties that theme.css zeroes under prefers-reduced-motion.
describe('CONTROL_COLOR_FADE', () => {
  it('fades background and border colour on the productive motion token', () => {
    for (const prop of ['background-color', 'border-color']) {
      expect(CONTROL_COLOR_FADE).toContain(
        `${prop} var(--hds-motion-productive-duration) var(--hds-motion-productive-easing)`,
      );
    }
  });

  it('carries no raw duration or keyword easing', () => {
    expect(CONTROL_COLOR_FADE).not.toMatch(/\d+(\.\d+)?m?s\b/);
    expect(CONTROL_COLOR_FADE).not.toMatch(/\b(ease|ease-in|ease-out|ease-in-out|linear)\b(?!-)/);
  });

  it('is zeroed by theme.css under prefers-reduced-motion', () => {
    const css = readFileSync(join(__dirname, '../../styles/theme.css'), 'utf8');
    const reduced =
      css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\{[^}]*\}/g) ?? [];
    expect(reduced.some((b) => /--hds-motion-productive-duration:\s*0s/.test(b))).toBe(true);
  });

  for (const file of ['checkbox.tsx', 'toggle.tsx', 'radio.tsx']) {
    it(`${file} uses the shared fade, not an inline raw-easing transition`, () => {
      const src = readFileSync(join(__dirname, file), 'utf8');
      expect(src).toContain('CONTROL_COLOR_FADE');
      expect(src).not.toMatch(/s ease,/);
      expect(src).not.toMatch(/\/\/ motion-ok: background-color\/border-color/);
    });
  }
});
