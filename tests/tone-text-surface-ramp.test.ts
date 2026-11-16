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

describe('toned Button labels', () => {
  it.each(['danger', 'success', 'warning', 'info'] as const)(
    '%s labels in the page colour (text-background) on its solid fill, never the feedback colour',
    (tone) => {
      for (const variant of ['primary', 'secondary', 'tertiary'] as const) {
        const { getByRole, unmount } = render(
          React.createElement(Button, { variant, tone }, 'Sign out anyway'),
        );
        const cls = getByRole('button').className.split(' ');
        unmount();
        expect(cls).toContain('text-background');
        expect(cls.filter((c) => c.startsWith('text-feedback-'))).toEqual([]);
        expect(cls.filter((c) => c.includes('tone-ring') || c.startsWith('inset-ring'))).toEqual(
          [],
        );
      }
    },
  );
});

describe('surface ramp: lifted dark surfaces, deeper light Button fills', () => {
  it('lifts the dark page and raised surface off near-black', () => {
    expect(hex(surface('page'), 'Dark')).toBe('#151a24');
    expect(hex(surface('raised'), 'Dark')).toBe('#252a34');
  });

  it('deepens the light secondary Button fill (at least 1.6:1 on the page)', () => {
    expect(
      ratio('component.button.secondary.bg.rest', surface('page'), 'Light'),
    ).toBeGreaterThanOrEqual(2);
  });

  it('deepens the light tertiary Button hover (at least 1.4:1 on the page)', () => {
    expect(
      ratio('component.button.tertiary.bg.hover', surface('page'), 'Light'),
    ).toBeGreaterThanOrEqual(1.4);
  });

  it.each(TONES)('the %s tone fill steps off the page (at least 1.1:1) in both themes', (tone) => {
    for (const mode of MODES) {
      expect(
        ratio(`semantic.color.feedback.bg.${tone}`, surface('page'), mode),
      ).toBeGreaterThanOrEqual(1.1);
    }
  });

  it.each(MODES)(
    'the Button boundary (hard shadow) reaches 3:1 on the page and raised (%s)',
    (mode) => {
      for (const s of ['page', 'raised', 'overlay', 'muted']) {
        expect(ratio('semantic.color.shadow.hard', surface(s), mode)).toBeGreaterThanOrEqual(3);
      }
    },
  );
});

// Solid tone fills (Adrian 2026-11-15). fill = what the Button paints.
const SOLID: Array<[tone: string, fill: string]> = [
  ['danger', 'semantic.color.feedback.error'],
  ['success', 'semantic.color.feedback.success'],
  ['warning', 'semantic.color.feedback.solid.warning'],
  ['info', 'semantic.color.feedback.info'],
];
const L = (h: string) => toOklch(h).l;

describe.each(MODES)('solid tone Buttons (%s)', (mode) => {
  it.each(SOLID)('%s label (the page colour) is 4.5:1 or more on its fill', (_t, fill) => {
    expect(ratio('semantic.color.surface.page', fill, mode)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(SOLID)('%s face is 3:1 or more against page and raised (WCAG 1.4.11)', (_t, fill) => {
    for (const s of ['page', 'raised']) {
      expect(ratio(fill, surface(s), mode)).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(SOLID)('%s edge drops the same OKLCH lightness as the Secondary edge', (tone, fill) => {
    const neutral =
      L(hex('component.button.secondary.bg.rest', mode)) -
      L(hex('semantic.color.edge.neutral', mode));
    const drop = L(hex(fill, mode)) - L(hex(`semantic.color.edge.${tone}`, mode));
    expect(Math.abs(drop - neutral)).toBeLessThan(0.005);
  });
});
