/**
 * Tests for the internal ExpandTooltip pill (AssetImg's "Expand" label).
 * hds#392: its text was fixed white on `surface.accent`, which flips to a light
 * neutral in dark mode, so the label read at about 1.1:1 there. It now uses
 * `content.onAccent`, the token that flips with the accent fill. The contrast
 * check resolves whatever the pill actually renders from hirobius.tokens.json.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { resolveAlias } from '../../../scripts/build-tokens.mjs';
import { contrastRatio } from '../utils/colorUtils';
import { ExpandTooltip } from './tooltip';

afterEach(cleanup);

const TOKENS = JSON.parse(
  readFileSync(resolve(__dirname, '../../../hirobius.tokens.json'), 'utf8'),
) as Record<string, unknown>;

/** `var(--semantic-color-content-onAccent)` -> the token's hex in that Figma mode. */
function tokenHex(cssVar: string, mode: 'Light' | 'Dark'): string {
  const path = /^var\(--([\w-]+)\)$/.exec(cssVar)?.[1];
  if (!path) throw new Error(`not a token var: ${cssVar}`);
  type Leaf = {
    $value: unknown;
    $extensions?: Record<string, { modes?: Record<string, unknown> }>;
  };
  const node = path
    .split('-')
    .reduce<unknown>((n, key) => (n as Record<string, unknown> | undefined)?.[key], TOKENS) as
    | Leaf
    | undefined;
  if (!node || !('$value' in node)) throw new Error(`no token at ${path}`);
  const raw = node.$extensions?.['com.figma.variables']?.modes?.[mode] ?? node.$value;
  const hex = resolveAlias(raw, TOKENS);
  if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) {
    throw new Error(`${path} (${mode}) is not a 6-digit hex: ${JSON.stringify(hex)}`);
  }
  return hex;
}

function renderPill(): HTMLElement {
  render(<ExpandTooltip visible mode="centered" label="Expand" />);
  return screen.getByText('Expand').closest('[data-hds-component="Surface"]') as HTMLElement;
}

describe('ExpandTooltip pill', () => {
  it('draws its label in content.onAccent on surface.accent', () => {
    const pill = renderPill();
    expect(pill.style.background).toBe('var(--semantic-color-surface-accent)');
    expect(pill.style.color).toBe('var(--semantic-color-content-onAccent)');
  });

  it.each(['Light', 'Dark'] as const)('clears WCAG AA (4.5:1) for its label in %s mode', (mode) => {
    const pill = renderPill();
    const ratio = contrastRatio(
      tokenHex(pill.style.color, mode),
      tokenHex(pill.style.background, mode),
    );
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
