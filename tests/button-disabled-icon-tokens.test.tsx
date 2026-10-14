/**
 * Button binds its own tokens for the disabled state and the icon slot
 * (hds#559, hds#539).
 *
 * - Disabled primary uses `component.button.primary.{bgDisabled,textDisabled}`,
 *   which must resolve to the neutral muted-surface / content-disabled pair
 *   (not the accentSubtle / onAccent pair, which assumed a coloured accent).
 * - Each size's `[&_svg]:size-*` class references that size's
 *   `component.button.size.<s>.iconSize` CSS variable, and that token resolves
 *   to the px the design calls for (12 / 16 / 20), so code and token can't drift.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as React from 'react';
import { Button } from '@/app/components/button';
import { contrastRatio } from '@/app/utils/colorUtils';

afterEach(cleanup);

const ROOT = resolve(__dirname, '..');
const tokensCss = readFileSync(resolve(ROOT, 'src/styles/tokens.generated.css'), 'utf8');
const tokensJson = JSON.parse(readFileSync(resolve(ROOT, 'hirobius.tokens.json'), 'utf8'));

/** Declarations of the first block opened by `selector`. */
function block(selector: string): Record<string, string> {
  const start = tokensCss.indexOf(`${selector} {`);
  expect(start, `no ${selector} block in tokens.generated.css`).toBeGreaterThanOrEqual(0);
  const body = tokensCss.slice(start, tokensCss.indexOf('\n}', start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/^\s*(--[\w-]+):\s*(.+?);/gm)) out[m[1]] = m[2];
  return out;
}
const light = block(':root');
const dark = { ...light, ...block('[data-theme="dark"]') };

function resolveVar(vars: Record<string, string>, name: string): string {
  let value = vars[name];
  for (let i = 0; value !== undefined && i < 10; i++) {
    const ref = value.match(/^var\((--[\w-]+)\)$/);
    if (!ref) return value;
    value = vars[ref[1]];
  }
  throw new Error(`could not resolve ${name}`);
}

describe('Button disabled tokens (hds#559)', () => {
  it('points the primary disabled tokens at the neutral muted pair', () => {
    const { primary } = tokensJson.component.button;
    expect(primary.bgDisabled.$value).toBe('{semantic.color.surface.muted}');
    expect(primary.textDisabled.$value).toBe('{semantic.color.content.disabled}');
  });

  it.each([
    ['light', light],
    ['dark', dark],
  ])('resolves to a distinguishable neutral fill and text in %s', (_theme, vars) => {
    const bg = resolveVar(vars, '--component-button-primary-bgDisabled');
    const fg = resolveVar(vars, '--component-button-primary-textDisabled');
    expect(bg).toBe(resolveVar(vars, '--semantic-color-surface-muted'));
    expect(fg).toBe(resolveVar(vars, '--semantic-color-content-disabled'));
    // Disabled controls are WCAG-exempt; the floor only proves the text is not
    // lost against its own fill, and keeps both on the neutral ramp.
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(1.3);
  });

  it('renders a disabled primary button bound to its component tokens', () => {
    const { getByRole } = render(
      <Button variant="primary" disabled>
        Save
      </Button>,
    );
    const cls = getByRole('button').className;
    expect(cls).toContain('disabled:bg-[var(--component-button-primary-bgDisabled)]');
    expect(cls).toContain('disabled:text-[var(--component-button-primary-textDisabled)]');
    expect(cls).not.toContain('disabled:bg-muted');
  });
});

describe('Button icon size matches its token (hds#539)', () => {
  const PX: Record<string, string> = { '12': '12px', '16': '16px', '20': '20px' };
  const primitiveSizes = tokensJson.primitive.size;

  it.each(['sm', 'md', 'lg'] as const)('%s icon class binds the size iconSize token', (size) => {
    const { getByRole } = render(
      <Button size={size} iconLeft={<svg data-testid="i" />}>
        Go
      </Button>,
    );
    const cls = getByRole('button').className;
    expect(cls).toContain(`[&_svg]:size-[var(--component-button-size-${size}-iconSize)]`);

    const ref: string = tokensJson.component.button.size[size].iconSize.$value;
    const step = ref.match(/^\{primitive\.size\.(\d+)\}$/)?.[1];
    expect(step, `${size}.iconSize should reference a primitive.size step`).toBeDefined();
    expect(primitiveSizes[step!].$value).toBeDefined();
    expect(light[`--component-button-size-${size}-iconSize`]).toBe(`var(--primitive-size-${step})`);
    expect(resolveVar(light, `--component-button-size-${size}-iconSize`)).toBe(PX[step!]);
  });
});
