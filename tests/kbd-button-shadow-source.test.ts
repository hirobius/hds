import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Kbd shadow follows the Button light source', () => {
  const theme = readFileSync(resolve(__dirname, '../src/styles/theme.css'), 'utf8');
  const docs = readFileSync(resolve(__dirname, '../docs-site/app/globals.css'), 'utf8');

  it('soft (shipped) Kbd keeps the 2px key edge through --semantic-shadow-key', () => {
    expect(theme).toMatch(/--semantic-shadow-key:\s*0 2px 0 var\(--semantic-color-border-strong\)/);
    expect(theme).toMatch(/\.hds-kbd\s*{[^}]*box-shadow:\s*var\(--semantic-shadow-key\)/);
  });

  it('hard preview re-points the key shadow at the same colour source as Button', () => {
    const hard = docs.slice(docs.indexOf("html[data-docs-shadow='hard'] {"));
    const colour = 'hsl(var(--primitive-shadow-color))';
    expect(hard).toContain(`--semantic-shadow-key: 2px 2px 0 ${colour}`);
    // Button's hard shadow is built from the same token
    expect(hard).toContain(`3px 3px 0 ${colour}`);
  });

  it('hard preview keeps the border-strong border and presses to 1px + translate', () => {
    expect(docs).toMatch(
      /data-docs-shadow='hard'\] \.hds-kbd\s*{[^}]*border-color:\s*var\(--semantic-color-border-strong\)/,
    );
    expect(docs).toMatch(
      /\.hds-kbd:active[^{]*{[^}]*1px 1px 0 hsl\(var\(--primitive-shadow-color\)\)[^}]*translate:\s*1px 1px/s,
    );
  });
});
