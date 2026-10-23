import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Text links draw a 2px underline 0.2em below the baseline (hds#link-underline-weight). The
// weight lives in two semantic tokens so every text link shares it; .hds-link reads them.
const read = (p: string) => readFileSync(resolve(__dirname, '..', p), 'utf8');
const theme = read('src/styles/theme.css');
const generated = read('src/styles/tokens.generated.css');
const tokens = JSON.parse(read('hirobius.tokens.json'));

describe('link underline weight', () => {
  it('tokens resolve to a 2px thickness and a 0.2em offset', () => {
    expect(tokens.semantic.link.underlineThickness.$value).toBe('{primitive.borderWidth.sm}');
    expect(tokens.primitive.borderWidth.sm.$value).toEqual({ value: 2, unit: 'px' });
    expect(tokens.semantic.link.underlineOffset.$value).toBe('{primitive.underline.offset}');
    expect(tokens.primitive.underline.offset.$value).toEqual({ value: 0.2, unit: 'em' });
    expect(generated).toContain('--primitive-underline-offset: 0.2em;');
    expect(generated).toContain(
      '--semantic-link-underlineThickness: var(--primitive-borderWidth-sm);',
    );
    expect(generated).toContain(
      '--semantic-link-underlineOffset: var(--primitive-underline-offset);',
    );
  });

  it('.hds-link draws the underline from the tokens, capped at 0.125em for small text', () => {
    const rule = theme.match(/\.hds-link\s*{[^}]*}/)?.[0] ?? '';
    expect(rule).toContain(
      'text-decoration-thickness: min(var(--semantic-link-underlineThickness), 0.125em);',
    );
    expect(rule).toContain('text-underline-offset: var(--semantic-link-underlineOffset);');
    expect(rule).toContain('text-decoration-skip-ink: auto;');
  });

  it('hover and focus keep the same weight (only colour changes)', () => {
    const hover = theme.match(/\.hds-link:hover\s*{[^}]*}/)?.[0] ?? '';
    expect(hover).not.toMatch(/thickness|offset/);
    expect(hover).toContain('text-decoration-color');
  });
});
