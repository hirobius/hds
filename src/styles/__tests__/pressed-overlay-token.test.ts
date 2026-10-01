/**
 * Contract test: the pressed-state overlay token (hds#322).
 *
 * Button (and IconButton, which composes it) expressed pressed as
 * `active:brightness-95 dark:active:brightness-110`, a filter with no token
 * behind it, so Figma's Pressed variants carried a hard-coded 5% black fill —
 * the only unbound colour on those sets. The overlay is now
 * `semantic.color.state.pressed.overlay` (opaque; alpha stays in the class,
 * as with `role.scrim` / `bg-scrim/60`): black in light, white in dark, so a
 * press darkens a light control and lightens a dark one, the way the
 * stone-800 / stone-400 pressed accents do. Button reads it through
 * `role.pressed-overlay` as an inset box-shadow wash.
 *
 * @unit hds#322
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, beforeAll } from 'vitest';

let tokensCss: string;
let buttonSource: string;
let iconButtonSource: string;

beforeAll(() => {
  tokensCss = readFileSync(resolve(__dirname, '../tokens.css'), 'utf8');
  buttonSource = readFileSync(resolve(__dirname, '../../app/components/button.tsx'), 'utf8');
  iconButtonSource = readFileSync(
    resolve(__dirname, '../../app/components/icon-button.tsx'),
    'utf8',
  );
});

/** Body of the first top-level block whose selector list is exactly `selector`. */
function blockBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`Block not found: ${selector}`);
  return match[1];
}

function declaration(body: string, prop: string): string | null {
  const match = body.match(new RegExp(`${prop}:\\s*([^;]+);`));
  return match ? match[1].trim() : null;
}

const TOKEN_VAR = '--semantic-color-state-pressed-overlay';

describe('semantic.color.state.pressed.overlay', () => {
  it('is defined in :root and in the dark block with different values', () => {
    const light = declaration(blockBody(tokensCss, ':root'), TOKEN_VAR);
    const dark = declaration(blockBody(tokensCss, '[data-theme="dark"]'), TOKEN_VAR);
    expect(light).not.toBeNull();
    expect(dark).not.toBeNull();
    expect(dark).not.toBe(light);
  });

  it('is opaque black in light and opaque white in dark (alpha lives in the class)', () => {
    expect(declaration(blockBody(tokensCss, ':root'), TOKEN_VAR)).toBe(
      'var(--primitive-color-neutral-black)', // tier-ok: reads a semantic token's declaration in generated tokens.css; a semantic aliasing a primitive is the tier contract, not a bypass (hds#322)
    );
    expect(declaration(blockBody(tokensCss, '[data-theme="dark"]'), TOKEN_VAR)).toBe(
      'var(--primitive-color-neutral-white)', // tier-ok: reads a semantic token's declaration in generated tokens.css; a semantic aliasing a primitive is the tier contract, not a bypass (hds#322)
    );
  });

  it('is exposed as role.pressed-overlay', () => {
    expect(declaration(blockBody(tokensCss, ':root'), '--role-pressed-overlay')).toBe(
      `var(${TOKEN_VAR})`,
    );
  });

  it('reaches Tailwind as the pressed-overlay colour', () => {
    const tailwind = readFileSync(
      resolve(__dirname, '../../../tailwind.config.tokens.cjs'),
      'utf8',
    );
    expect(tailwind).toMatch(/'pressed-overlay':\s*'var\(--role-pressed-overlay\)'/);
  });
});

describe('Button pressed state', () => {
  it('reads the token instead of a brightness filter', () => {
    expect(buttonSource).not.toMatch(/active:brightness-/);
    expect(buttonSource).toMatch(/active:inset-shadow-pressed-overlay\/\d+/);
  });

  it('IconButton composes Button and carries no brightness filter of its own', () => {
    expect(iconButtonSource).not.toMatch(/brightness-/);
    expect(iconButtonSource).toMatch(/from '\.\/button'/);
  });
});
