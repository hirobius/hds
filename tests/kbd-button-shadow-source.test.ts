import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The hard shadow ships as the default since hds#888/#891: Button (.hds-btn-hard) and Kbd
// (.hds-kbd) live in theme.css.
describe('Kbd shadow follows the Button light source', () => {
  const theme = readFileSync(resolve(__dirname, '../src/styles/theme.css'), 'utf8');
  // --hds-edge-now: a hovered Button's hover-fill edge, when it has one (primary).
  const colour = 'var(--hds-edge-now, var(--hds-edge, var(--component-button-edge-secondary)))';

  it('shipped Kbd takes a 2px straight-down key shadow in its own-colour edge, through --semantic-shadow-key', () => {
    expect(theme).toMatch(
      /\.hds-kbd\s*{[^}]*box-shadow:\s*var\(\s*--semantic-shadow-key,\s*0 2px 0 var\(--hds-kbd-edge, var\(--hds-edge-kbd\)\)\s*\)/,
    );
  });

  it('shipped Button rests, compresses on hover and presses straight down in its own-colour edge', () => {
    // One depth token set since hds#1387: the edge height and both offsets are tokens.
    const flat = theme.replace(/\s+/g, ' ');
    expect(flat).toContain(
      `0 var(--hds-hs, var(--component-button-depth-edge)) 0 var( --hds-btn-edge, ${colour} )`,
    );
    expect(flat).toContain(
      '--hds-hs: calc( var(--component-button-depth-edge) - var(--component-button-depth-hoverOffset) );',
    );
    expect(flat).toContain(
      '--hds-hs: calc( var(--component-button-depth-edge) - var(--component-button-depth-pressedOffset) );',
    );
  });

  it('every hard shadow drops straight down: no x offset anywhere', () => {
    expect(theme).not.toMatch(/--hds-hs:\s*\d+px \d+px/);
    expect(theme).not.toMatch(
      /[1-9]px [1-9]px 0 var\(--(hds-(btn|kbd)-edge|hds-edge|semantic-color-shadow-hard)/,
    );
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
