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
import { THEMES, resolveVar } from './helpers/token-sheet';

afterEach(cleanup);

const ROOT = resolve(__dirname, '..');
const tokensJson = JSON.parse(readFileSync(resolve(ROOT, 'hirobius.tokens.json'), 'utf8'));

describe('Button disabled tokens (hds#559)', () => {
  it('points the primary disabled tokens at the neutral muted pair', () => {
    const { primary } = tokensJson.component.button;
    expect(primary.bgDisabled.$value).toBe('{semantic.color.surface.muted}');
    expect(primary.textDisabled.$value).toBe('{semantic.color.content.disabled}');
  });

  it.each(['light', 'dark'] as const)(
    'resolves to a distinguishable neutral fill and text in %s',
    (theme) => {
      const bg = resolveVar('--component-button-primary-bgDisabled', theme);
      const fg = resolveVar('--component-button-primary-textDisabled', theme);
      expect(bg).toBe(resolveVar('--semantic-color-surface-muted', theme));
      expect(fg).toBe(resolveVar('--semantic-color-content-disabled', theme));
      // Disabled controls are WCAG-exempt; the floor only proves the text is not
      // lost against its own fill, and keeps both on the neutral ramp.
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(1.3);
    },
  );

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
    expect(THEMES.light[`--component-button-size-${size}-iconSize`]).toBe(
      `var(--primitive-size-${step})`,
    );
    expect(resolveVar(`--component-button-size-${size}-iconSize`, 'light')).toBe(PX[step!]);
  });
});
