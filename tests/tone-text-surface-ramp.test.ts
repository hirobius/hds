/**
 * Tone text and the surface ramp (Adrian, 2026-11-15).
 *
 * 1. No colored text on feedback surfaces: Badge and toned Button labels use the plain
 *    content color (content.primary). The tone shows through the fill, border and icon,
 *    so the icon color (feedback.*) must still reach 3:1 on its own fill.
 * 2. Ramp Option A: light button surfaces one step deeper, dark page and raised one
 *    step lighter, tone fills one step stronger in both themes. Every pair stays AA.
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
    '%s uses text-foreground, not the feedback color',
    (tone) => {
      for (const variant of ['primary', 'secondary', 'tertiary'] as const) {
        const { getByRole, unmount } = render(
          React.createElement(Button, { variant, tone }, 'Sign out anyway'),
        );
        const cls = getByRole('button').className;
        unmount();
        expect(cls).toContain('text-foreground');
        expect(cls).not.toMatch(/text-feedback-/);
      }
    },
  );
});

describe('surface ramp Option A', () => {
  it('lifts the dark page and raised surface off near-black', () => {
    expect(hex(surface('page'), 'Dark')).toBe('#0c111b');
    expect(hex(surface('raised'), 'Dark')).toBe('#212630');
  });

  it('deepens the light secondary Button fill (at least 1.6:1 on the page)', () => {
    expect(
      ratio('component.button.secondary.bg.rest', surface('page'), 'Light'),
    ).toBeGreaterThanOrEqual(1.6);
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
