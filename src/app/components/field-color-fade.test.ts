import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// hds#751 slice: the text fields' colour/focus-ring fade runs on the productive
// motion token (which theme.css zeroes under prefers-reduced-motion), not on
// Tailwind's default 150ms timing, so they need no motion-ok exemption.
const FIELDS = ['input.tsx', 'textarea.tsx', 'token-field.tsx'];
const read = (f: string) => readFileSync(join(__dirname, f), 'utf8');

describe('text field colour fade', () => {
  for (const file of FIELDS) {
    it(`${file} times every transition-colors on the productive token`, () => {
      const src = read(file);
      const classLists = src.match(/'[^'\n]*transition-colors[^'\n]*'/g) ?? [];
      expect(classLists.length).toBeGreaterThan(0);
      for (const list of classLists) {
        expect(list).toContain('duration-[var(--hds-motion-productive-duration)]');
        expect(list).toContain('ease-[var(--hds-motion-productive-easing)]');
      }
    });

    it(`${file} carries no motion-ok exemption`, () => {
      expect(read(file)).not.toMatch(/^\/\/ motion-ok:/m);
    });
  }

  it('the productive duration is zeroed under prefers-reduced-motion', () => {
    const css = read('../../styles/theme.css');
    const reduced =
      css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\{[^}]*\}/g) ?? [];
    expect(reduced.some((b) => /--hds-motion-productive-duration:\s*0s/.test(b))).toBe(true);
  });
});
