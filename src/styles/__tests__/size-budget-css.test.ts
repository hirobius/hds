import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (f: string) => readFileSync(resolve(process.cwd(), f), 'utf8');

describe('styles.css size trims (hds#1472)', () => {
  it(".animate-spin reuses Tailwind's spin keyframes instead of shipping a second copy", () => {
    const css = read('src/styles/utilities.css');
    expect(css).not.toMatch(/@keyframes\s+hds-utility-spin/);
    expect(css).toMatch(/\.animate-spin\s*\{\s*animation:\s*spin\s+1s\s+linear\s+infinite/);
  });

  it('Dock sits fixed only below sm, so the desktop needs no reset block', () => {
    const css = read('src/styles/theme.css');
    const block = css.slice(
      css.indexOf('/* --- Dock (hds#1432)'),
      css.indexOf('/* --- Sheet (hds#690)'),
    );
    expect(block).toMatch(/@media \(width < 640px\)\s*\{\s*\.hds-dock\s*\{[^}]*position:\s*fixed/);
    expect(block).not.toMatch(/min-width:\s*640px/);
  });

  it('the scoped styles.css build carries no banner of its own', () => {
    expect(read('scripts/build-styles-css.mjs')).toMatch(/const banner = '';/);
  });
});
