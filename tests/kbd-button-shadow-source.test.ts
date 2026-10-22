import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The hard shadow ships as the default since hds#888/#891: Button (.hds-btn-hard) and Kbd
// (.hds-kbd) live in theme.css; the docs Shadow preview only re-points elevation tokens.
describe('Kbd shadow follows the Button light source', () => {
  const theme = readFileSync(resolve(__dirname, '../src/styles/theme.css'), 'utf8');
  const docs = readFileSync(resolve(__dirname, '../docs-site/app/globals.css'), 'utf8');
  const colour = 'var(--semantic-color-shadow-hard)';

  it('shipped Kbd takes a 2px hard key shadow in the Button colour, through --semantic-shadow-key', () => {
    expect(theme).toMatch(
      /\.hds-kbd\s*{[^}]*box-shadow:\s*var\(--semantic-shadow-key,\s*2px 2px 0 var\(--semantic-color-shadow-hard\)\)/,
    );
  });

  it('shipped Button rests, lifts and presses in the same colour', () => {
    expect(theme).toContain(`var(--hds-hs, 3px 3px) 0 ${colour}`);
    expect(theme).toContain('--hds-hs: 5px 5px');
    expect(theme).toContain('--hds-hs: 1px 1px');
  });

  it('the docs preview no longer re-declares Button or Kbd shadows', () => {
    expect(docs).not.toMatch(/data-docs-shadow='hard'\] button\[data-variant/);
    expect(docs).not.toMatch(/data-docs-shadow='hard'\] \.hds-kbd/);
  });

  it('semantic.color.shadow.hard is the shadow ink in Light and border.interactive in Dark (never black)', () => {
    const tokens = JSON.parse(readFileSync(resolve(__dirname, '../hirobius.tokens.json'), 'utf8'));
    const modes = tokens.semantic.color.shadow.hard.$extensions['com.figma.variables'].modes;
    const interactiveDark =
      tokens.semantic.color.border.interactive.$extensions['com.figma.variables'].modes.Dark;
    expect(modes.Dark).toBe(interactiveDark);
    expect(modes.Light).toBe('{primitive.color.shadow.ink}');
    expect(tokens.primitive.color.shadow.ink.$value).toBe('#282c34'); // hsl(220 13% 18%)

    const css = readFileSync(resolve(__dirname, '../src/styles/tokens.generated.css'), 'utf8');
    const dark = css.match(/--semantic-color-shadow-hard:\s*([^;]+);/g) ?? [];
    expect(dark).toContain('--semantic-color-shadow-hard: var(--primitive-color-neutral-500);');
    expect(dark.join(' ')).not.toMatch(/#000|neutral-black|0 0% 0%/);
  });
});
