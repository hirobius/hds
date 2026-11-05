import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// hds#751 slice 1 (overlays): the listbox/popup family retires its motion-ok
// exemptions. Open/close mounting stays with Radix; the hover/active fades the
// old comments claimed ("token colour transitions via utility classes") now
// really exist, on the productive motion token that theme.css zeroes under
// prefers-reduced-motion.
const read = (f: string) => readFileSync(join(__dirname, f), 'utf8');
const DURATION = 'duration-[var(--hds-motion-productive-duration)]';
const EASING = 'ease-[var(--hds-motion-productive-easing)]';

const RADIX_OWNED = [
  'alert-dialog.tsx',
  'popover.tsx',
  'menu.tsx',
  'select.tsx',
  'combobox.tsx',
  'combobox-creatable.tsx',
  'listbox-option.tsx',
  'command-palette.tsx',
];
// Combobox options render through the shared listbox-option.tsx row (hds#1145).
const FADING = ['listbox-option.tsx', 'command-palette.tsx'];

describe('overlay family carries no motion-ok exemption', () => {
  for (const file of RADIX_OWNED) {
    it(`${file} has no motion-ok line comment`, () => {
      expect(read(file)).not.toMatch(/^\s*\/\/\s*motion-ok:/m);
    });
  }
});

describe('overlay hover/active fades use the productive token (zeroed under reduced motion)', () => {
  for (const file of FADING) {
    it(`${file} rows and chips are timed on the token, never a raw value`, () => {
      const src = read(file);
      const rows = src.match(/'[^'\n]*hds-touch-row[^'\n]*outline-none[^'\n]*'/g) ?? [];
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) expect(row).toContain('transition-colors');
      for (const list of src.match(/'[^'\n]*transition-colors[^'\n]*'/g) ?? []) {
        expect(list).toContain(DURATION);
        expect(list).toContain(EASING);
      }
      expect(src).not.toMatch(/(?<![\w-])(?:duration|ease|animate)-\[(?!var\()/);
    });
  }

  for (const file of ['combobox.tsx', 'combobox-creatable.tsx']) {
    it(`${file} chip remove buttons fade their hover fill`, () => {
      const chip = read(file)
        .split('\n')
        .find((l) => l.includes('hover:bg-[var(--semantic-color-surface-softHover)]'));
      expect(chip).toBeDefined();
      const block = read(file).split("'hds-focus hds-touch-row inline-flex h-7")[1].split(')}')[0];
      expect(block).toContain('transition-colors');
      expect(block).toContain(DURATION);
      expect(block).toContain(EASING);
    });
  }

  it('the productive duration is zeroed under prefers-reduced-motion', () => {
    const css = read('../../styles/theme.css');
    const reduced =
      css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\{[^}]*\}/g) ?? [];
    expect(reduced.some((b) => /--hds-motion-productive-duration:\s*0s/.test(b))).toBe(true);
  });
});
