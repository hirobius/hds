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
    const colour = 'var(--semantic-color-shadow-hard)';
    expect(hard).toContain(`--semantic-shadow-key: 2px 2px 0 ${colour}`);
    // Button rest, hover and press use the same token
    expect(hard).toContain(`3px 3px 0 ${colour}`);
    expect(hard).toContain(`5px 5px 0 ${colour}`);
    expect(hard).toMatch(
      /button\[data-variant='primary'\]:active[^{]*{[^}]*1px 1px 0 var\(--semantic-color-shadow-hard\)/s,
    );
  });

  it('semantic.color.shadow.hard is the shadow ink in Light and the border.strong stroke in Dark (never black)', () => {
    const tokens = JSON.parse(readFileSync(resolve(__dirname, '../hirobius.tokens.json'), 'utf8'));
    const modes = tokens.semantic.color.shadow.hard.$extensions['com.figma.variables'].modes;
    const strongDark =
      tokens.semantic.color.border.strong.$extensions['com.figma.variables'].modes.Dark;
    expect(modes.Dark).toBe(strongDark);
    expect(modes.Light).toBe('{primitive.color.shadow.ink}');
    expect(tokens.primitive.color.shadow.ink.$value).toBe('#282c34'); // hsl(220 13% 18%)

    const css = readFileSync(resolve(__dirname, '../src/styles/tokens.generated.css'), 'utf8');
    const dark = css.match(/--semantic-color-shadow-hard:\s*([^;]+);/g) ?? [];
    expect(dark).toContain('--semantic-color-shadow-hard: var(--primitive-color-neutral-600);');
    expect(css).toMatch(/--primitive-color-neutral-600:\s*#525252/);
    expect(dark.join(' ')).not.toMatch(/#000|neutral-black|0 0% 0%/);
  });

  it('hard preview keeps the border-strong border and presses to 1px + translate', () => {
    expect(docs).toMatch(
      /data-docs-shadow='hard'\] \.hds-kbd\s*{[^}]*border-color:\s*var\(--semantic-color-border-strong\)/,
    );
    expect(docs).toMatch(
      /\.hds-kbd:active[^{]*{[^}]*1px 1px 0 var\(--semantic-color-shadow-hard\)[^}]*translate:\s*1px 1px/s,
    );
  });
});
