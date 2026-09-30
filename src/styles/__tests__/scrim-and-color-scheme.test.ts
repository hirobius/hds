/**
 * Contract test: theme-aware scrim token and native `color-scheme` (hds#335).
 *
 * The Dialog/AlertDialog scrim used a foreground-derived wash, and `role.foreground`
 * resolves to near-white in dark mode, washing a dark page white. The scrim is
 * now `semantic.color.surface.scrim` (opaque; alpha stays in the class) with a
 * distinct dark-mode value. Separately, nothing set `color-scheme: dark`, so
 * native scrollbars and form controls stayed light under the dark theme.
 *
 * @unit hds#335
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, beforeAll } from 'vitest';

let themeCss: string;
let tokensCss: string;

beforeAll(() => {
  themeCss = readFileSync(resolve(__dirname, '../theme.css'), 'utf8');
  tokensCss = readFileSync(resolve(__dirname, '../tokens.css'), 'utf8');
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

describe('semantic.color.surface.scrim', () => {
  it('is defined in :root and in the dark block with different values', () => {
    const light = declaration(blockBody(tokensCss, ':root'), '--semantic-color-surface-scrim');
    const dark = declaration(
      blockBody(tokensCss, '[data-theme="dark"]'),
      '--semantic-color-surface-scrim',
    );
    expect(light).not.toBeNull();
    expect(dark).not.toBeNull();
    expect(dark).not.toBe(light);
  });

  it('does not reference a content token in either mode', () => {
    for (const selector of [':root', '[data-theme="dark"]']) {
      const value = declaration(blockBody(tokensCss, selector), '--semantic-color-surface-scrim');
      expect(value).not.toMatch(/--semantic-color-content-/);
    }
  });

  it('is exposed as role.scrim', () => {
    expect(declaration(blockBody(tokensCss, ':root'), '--role-scrim')).toBe(
      'var(--semantic-color-surface-scrim)',
    );
  });
});

describe('color-scheme', () => {
  it("declares color-scheme: dark in the [data-theme='dark'], .dark block", () => {
    const body = blockBody(themeCss, "[data-theme='dark'],\n.dark");
    expect(declaration(body, 'color-scheme')).toBe('dark');
  });

  it('adds no light color-scheme on :root (would leak into non-HDS hosts)', () => {
    const rootBlocks = themeCss.match(/(?:^|\n):root\s*\{[^}]*\}/g) ?? [];
    for (const block of rootBlocks) expect(block).not.toMatch(/color-scheme/);
  });
});
