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
});
