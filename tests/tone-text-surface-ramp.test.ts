/**
 * Tone text and the surface ramp (Adrian, 2026-11-15).
 *
 * 1. No colored text on soft feedback tints: Badge labels use content.primary, and the
 *    icon colour (feedback.*) still reaches 3:1 on its tint.
 * 2. Toned Buttons are solid fills with a page-coloured label (4.5:1+), a face at 3:1+
 *    against page and raised, and an edge one equal OKLCH step darker than the fill.
 * 3. The surface ramp: lifted dark surfaces, deeper light Button fills, stronger tints.
 */
import { describe, it, expect } from 'vitest';
import { contrastRatio } from '../src/app/utils/colorUtils';
import * as React from 'react';
import { render } from '@testing-library/react';
import { tokenHex } from './helpers/token-color';
import { oklchToHex, toOklch } from '../scripts/lib/raised-edge.mjs';
import { Button } from '../src/app/components/button';

// Blue primitives are authored in OKLCH; contrastRatio reads hex.
const hex = (p: string, mode: 'Light' | 'Dark') => {
  const v = tokenHex(p, mode);
  return v.startsWith('#') ? v.toLowerCase() : oklchToHex(toOklch(v));
};

const MODES = ['Light', 'Dark'] as const;
type Mode = (typeof MODES)[number];
const ratio = (a: string, b: string, mode: Mode) => contrastRatio(hex(a, mode), hex(b, mode));
const surface = (s: string) => `semantic.color.surface.${s}`;
const TONES = ['success', 'warning', 'error', 'info', 'inProgress'] as const;
const BADGE_TONE: Record<(typeof TONES)[number], string> = {
  success: 'success',
  warning: 'warning',
  error: 'danger',
  info: 'info',
  inProgress: 'inProgress',
};

describe.each(MODES)('tone text is the content color (%s)', (mode) => {
  it.each(TONES)('Badge %s text is content.primary and AA on its fill', (tone) => {
    const b = BADGE_TONE[tone];
    expect(hex(`component.badge.${b}.text`, mode)).toBe(
      hex('semantic.color.content.primary', mode),
    );
    expect(
      ratio(`component.badge.${b}.text`, `component.badge.${b}.bg`, mode),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TONES)('content.primary is AA on feedback.bg.%s', (tone) => {
    expect(
      ratio('semantic.color.content.primary', `semantic.color.feedback.bg.${tone}`, mode),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TONES)('the tone icon (feedback.%s) reaches 3:1 on its fill', (tone) => {
    expect(
      ratio(`semantic.color.feedback.${tone}`, `semantic.color.feedback.bg.${tone}`, mode),
    ).toBeGreaterThanOrEqual(3);
  });
});

describe('toned Button labels (Adrian 2026-11-17: tone follows the variant)', () => {
  const classesOf = (variant: 'primary' | 'secondary' | 'tertiary', tone: string) => {
    const { getByRole, unmount } = render(
      React.createElement(Button, { variant, tone } as never, 'Sign out anyway'),
    );
    const cls = getByRole('button').className.split(' ');
    unmount();
    return cls;
  };

  it.each(['danger', 'success', 'warning', 'info'] as const)(
    '%s: primary labels in the page colour on its solid fill',
    (tone) => {
      const cls = classesOf('primary', tone);
      expect(cls).toContain('text-background');
      expect(cls.filter((c) => c.startsWith('text-feedback-'))).toEqual([]);
      expect(cls.filter((c) => c.includes('tone-ring') || c.startsWith('inset-ring'))).toEqual([]);
    },
  );

  it.each(['danger', 'success', 'warning', 'info'] as const)(
    '%s: secondary is the soft tint with the content.primary label, never coloured text',
    (tone) => {
      const cls = classesOf('secondary', tone);
      expect(cls).toContain(`bg-feedback-bg-${tone}`);
      expect(cls).toContain('text-foreground');
      expect(cls.filter((c) => c.startsWith('text-feedback-'))).toEqual([]);
    },
  );

  it.each(['danger', 'success', 'warning', 'info'] as const)(
    '%s: tertiary is the feedback text and never takes surface.hover',
    (tone) => {
      const cls = classesOf('tertiary', tone);
      expect(cls).toContain(`text-feedback-${tone}`);
      expect(cls.filter((c) => c.includes('tertiary-bg-hover'))).toEqual([]);
    },
  );

  describe.each(MODES)('tertiary text contrast (%s)', (mode) => {
    it.each(['error', 'success', 'warning', 'info'] as const)(
      'feedback.%s is AA on the page (rest) and on its own tint (the wipe hover)',
      (tone) => {
        expect(
          ratio(`semantic.color.feedback.${tone}`, surface('page'), mode),
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          ratio(`semantic.color.feedback.${tone}`, `semantic.color.feedback.bg.${tone}`, mode),
        ).toBeGreaterThanOrEqual(4.5);
      },
    );
  });
});
