/**
 * Contract test: the font dial reaches every type role, at any scope (hds#478).
 *
 * `--hds-font-family` / `--hds-font-family-mono` are the documented font dial
 * (ADR-023, README "the four dials"). The type roles were declared once on
 * `:root`, pointing at the primitive family variables, so they resolved there and
 * descendants inherited the already-resolved stack: setting the dial anywhere
 * changed nothing.
 *
 * The fix re-declares every font-family variable on each element of the HDS
 * subtree, pointing at the dial, so the dial resolves where it is set. This test
 * pins that every font-family variable the tokens declare is re-declared there
 * (a new type role without a dial mapping fails here), sans roles to
 * `--hds-font-family` and the mono role to `--hds-font-family-mono`.
 *
 * jsdom cannot resolve `var()` chains, so the rendered behaviour is verified in a
 * real browser separately; this test guards the wiring.
 *
 * @unit hds#478
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, beforeAll } from 'vitest';

const DIAL_SELECTOR = ':where([data-hds], [data-hds] *)';

let themeCss: string;
let tokensCss: string;

beforeAll(() => {
  themeCss = readFileSync(resolve(__dirname, '../theme.css'), 'utf8');
  tokensCss = readFileSync(resolve(__dirname, '../tokens.generated.css'), 'utf8');
});

/** Every font-family custom property the generated tokens declare. */
function fontFamilyVars(css: string): string[] {
  const names = new Set<string>();
  for (const m of css.matchAll(
    /(--(?:primitive-typography-family-[a-z]+|semantic-typography-[a-zA-Z0-9]+-font-family))\s*:/g,
  )) {
    names.add(m[1]);
  }
  return [...names].sort();
}

/** Body of the block whose selector is exactly `selector`. */
function blockBody(css: string, selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
}

const isMono = (name: string) => /mono/.test(name);

describe('font dial (hds#478)', () => {
  it('finds the type-role font-family variables in the tokens', () => {
    const vars = fontFamilyVars(tokensCss);
    expect(vars).toContain('--primitive-typography-family-primary');
    expect(vars).toContain('--semantic-typography-body-font-family');
    expect(vars).toContain('--semantic-typography-mono-font-family');
  });

  it('re-declares every font-family variable on the HDS subtree, pointing at the dial', () => {
    const body = blockBody(themeCss, DIAL_SELECTOR);
    expect(body, `theme.css has no ${DIAL_SELECTOR} block`).not.toBeNull();
    for (const name of fontFamilyVars(tokensCss)) {
      const dial = isMono(name) ? '--hds-font-family-mono' : '--hds-font-family';
      const decl = body!.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
      // Whitespace-insensitive: Prettier may wrap a long declaration.
      expect(decl?.[1].replace(/\s+/g, ''), `${name} is not wired to ${dial}`).toBe(`var(${dial})`);
    }
  });

  it('keeps a root default for both dials, so an unset dial still renders the brand fonts', () => {
    // Which font leads the stack is pinned by check-css-integrity I12, not here.
    expect(themeCss).toMatch(/--hds-font-family:\s*['"][^;]+;/);
    expect(themeCss).toMatch(/--hds-font-family-mono:\s*['"][^;]+;/);
  });
});
