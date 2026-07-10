/**
 * Contract test: interactive surface state tokens (ISSUE-03, #127).
 *
 * hover/pressed/selected surfaces used to be hardcoded to
 * `var(--semantic-color-surface-raised)` / `var(--semantic-color-surface-accentSubtle)`
 * across `.hds-*` rules in theme.css, so a tenant could not shift interaction
 * feel by overriding a single dial. Asserts the dedicated
 * `--semantic-color-surface-hover` token is wired into the `.hds-dropdown-item`
 * hover rule instead of a literal surface reference.
 *
 * @unit ISSUE-03
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, beforeAll } from 'vitest';

let themeCss: string;

beforeAll(() => {
  themeCss = readFileSync(resolve(__dirname, '../theme.css'), 'utf8');
});

function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`Selector not found in theme.css: ${selector}`);
  return match[1];
}

describe('interactive surface tokens', () => {
  it('.hds-dropdown-item:hover reads the surface-hover token, not a literal surface alias', () => {
    const body = ruleBody(themeCss, '.hds-dropdown-item:hover');
    expect(body).toMatch(/var\(--semantic-color-surface-hover\)/);
    expect(body).not.toMatch(/var\(--semantic-color-surface-(raised|accentSubtle)\)/);
  });

  it('semantic.color.surface.{hover,pressed,selected,muted,sunken} resolve to generated CSS vars', () => {
    const tokensCss = readFileSync(resolve(__dirname, '../tokens.generated.css'), 'utf8');
    for (const name of ['hover', 'pressed', 'selected', 'muted', 'sunken']) {
      expect(tokensCss).toMatch(new RegExp(`--semantic-color-surface-${name}:`));
    }
  });

  it('semantic.color.content.{success,warning,danger} resolve to generated CSS vars', () => {
    const tokensCss = readFileSync(resolve(__dirname, '../tokens.generated.css'), 'utf8');
    for (const name of ['success', 'warning', 'danger']) {
      expect(tokensCss).toMatch(new RegExp(`--semantic-color-content-${name}:`));
    }
  });

  it('semantic.color.border.{success,warning} resolve to generated CSS vars', () => {
    const tokensCss = readFileSync(resolve(__dirname, '../tokens.generated.css'), 'utf8');
    for (const name of ['success', 'warning']) {
      expect(tokensCss).toMatch(new RegExp(`--semantic-color-border-${name}:`));
    }
  });
});
