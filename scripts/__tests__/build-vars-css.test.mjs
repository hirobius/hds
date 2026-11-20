/**
 * variables.css (hds#1313): a token-only consumer that loads only variables.css
 * (folio) must be able to pick an accent, so the data-accent blocks ship in it,
 * after the token vars, and the sheet stays host-safe (no selector that can
 * restyle a host element).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { offendingSelectors, varsCss } from '../build-vars-css.mjs';

const read = (rel) => readFileSync(join(__dirname, '..', '..', rel), 'utf8');

const ROOT = join(__dirname, '..', '..');
const tokens = readFileSync(join(ROOT, 'src/styles/tokens.generated.css'), 'utf8');
const accents = readFileSync(join(ROOT, 'src/styles/accents.css'), 'utf8');

describe('variables.css', () => {
  const css = varsCss(tokens, accents);

  it('ships the cobalt accent blocks, light and dark', () => {
    expect(css).toContain("[data-accent='cobalt'] {");
    expect(css).toContain("[data-accent='cobalt'][data-theme='dark'] {");
  });

  it('puts the accent blocks after :root, so they win at equal specificity', () => {
    expect(css.indexOf("[data-accent='cobalt']")).toBeGreaterThan(css.indexOf(':root'));
  });

  it('stays host-safe: every rule selector is a vars scope', () => {
    expect(offendingSelectors(css)).toEqual([]);
  });

  it('refuses an input with a selector that could restyle the host', () => {
    expect(() => varsCss(tokens, 'body {\n  color: red;\n}\n')).toThrow(/non-vars selectors/);
  });

  it('refuses a universal `*` rule too (it would reach every host element)', () => {
    expect(() => varsCss(tokens, '* {\n  color: red;\n}\n')).toThrow(/non-vars selectors/);
  });
});

/**
 * The phone-width token steps (below 640px) have ONE source, src/styles/responsive-tokens.css.
 * styles.css and tokens.css take it through index.css; variables.css gets it appended. A
 * consumer that loads variables.css first (folio) therefore paints the phone values at once and
 * does not jump from the desktop ones when styles.css loads (layout shift).
 */
describe('phone-width tokens: one source, in every entry', () => {
  const responsive = read('src/styles/responsive-tokens.css');
  const decls = [...responsive.matchAll(/^\s+(--[\w-]+):\s*([^;]+);/gm)].map((m) => [m[1], m[2]]);

  it('the source declares the phone steps', () => {
    expect(responsive).toContain('@media (max-width: 639px)');
    expect(decls.map(([name]) => name)).toEqual(
      expect.arrayContaining([
        '--semantic-space-section-stack',
        '--semantic-space-section-inset',
        '--semantic-space-region-gutter',
        '--semantic-layout-grid-gap',
      ]),
    );
  });

  it('variables.css carries every phone declaration, after the tokens and accents', () => {
    const css = varsCss(tokens, accents, responsive);
    for (const [name, value] of decls) expect(css, name).toContain(`${name}: ${value}`);
    expect(css.lastIndexOf('@media (max-width: 639px)')).toBeGreaterThan(
      css.indexOf("[data-accent='cobalt']"),
    );
    expect(offendingSelectors(css)).toEqual([]);
  });

  it('theme.css no longer declares them: a second copy would drift', () => {
    const theme = read('src/styles/theme.css');
    const phone = [...theme.matchAll(/@media \(max-width: 639px\) \{([\s\S]*?)\n\}/g)].map(
      (m) => m[1],
    );
    for (const block of phone)
      for (const [name] of decls)
        expect(block, `${name} in a theme.css phone block`).not.toContain(name);
  });

  it('index.css imports the source after theme.css, so a phone step still wins', () => {
    const index = read('src/styles/index.css');
    expect(index.indexOf("@import './responsive-tokens.css'")).toBeGreaterThan(
      index.indexOf("@import './theme.css'"),
    );
  });
});
