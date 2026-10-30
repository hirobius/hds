/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Midnight tint (hds#755, Adrian 2026-10-16): graphite and neutral lean toward hue 262 in
 * OKLCH so the near-monochrome base reads cool rather than flat grey. Each step keeps the
 * lightness of its pre-tint grey (SOURCE), so contrast does not move.
 *
 * Graphite chroma = 0.036 × weight(step).
 * Neutral chroma  = 0.022 × min(1, max(0.12, 1 − L) × 1.25).
 * White stays #ffffff; pure black becomes oklch(0.145 0.022 262).
 *
 * Lifting black to L 0.145 drops the dark page/raised and muted/raised steps under the
 * dark-surfaces.test.ts floors (1.2:1, 1.1:1), so two steps were added for those slots:
 * neutral.825 (dark surface.raised) and neutral.750 (dark surface.muted). Their SOURCE greys
 * were chosen to clear those floors. neutral.725 (dark surface.selected) clears the 1.15:1
 * rest-fill floor on a raised card (hover-fill.contrast.test.tsx, hds#522), which 800 no
 * longer does once raised is 825.
 *
 * hirobius.tokens.json holds the results as hex (the contrast gate reads hex only);
 * scripts/__tests__/midnight-tint.test.mjs recomputes them from SOURCE.
 */
import { hexToOklch, oklchToHex } from './raised-edge.mjs';

export const MIDNIGHT_HUE = 262;

/** The pre-tint greys, kept so each tinted step can be checked against its lightness. */
export const SOURCE = {
  graphite: {
    50: '#f5f4f4',
    100: '#e9e7e8',
    200: '#cbc6c9',
    300: '#b2abae',
    400: '#8b8488',
    500: '#655e62',
    600: '#544d51',
    700: '#4a4146',
    800: '#352e32',
    900: '#2a2428',
    950: '#19161a',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    350: '#b4b4b4',
    400: '#a3a3a3',
    450: '#909090',
    500: '#737373',
    550: '#626262',
    600: '#525252',
    700: '#404040',
    725: '#2c2c2c',
    750: '#2a2a2a',
    800: '#262626',
    825: '#202020',
    850: '#1a1a1a',
    900: '#111111',
    950: '#0a0a0a',
    white: '#ffffff',
    black: '#000000',
  },
};

const GRAPHITE_WEIGHT = {
  50: 0.15,
  100: 0.2,
  200: 0.3,
  300: 0.45,
  400: 0.6,
  500: 0.75,
  600: 0.85,
  700: 0.95,
  800: 1,
  900: 1,
  950: 0.9,
};

/** OKLCH chroma for a step; `l` is the source lightness (neutral only). */
export function midnightChroma(ramp, step, l) {
  if (ramp === 'graphite') return 0.036 * GRAPHITE_WEIGHT[step];
  return 0.022 * Math.min(1, Math.max(0.12, 1 - l) * 1.25);
}

export const NEUTRAL_BLACK = oklchToHex({ l: 0.145, c: 0.022, h: MIDNIGHT_HUE });

/** The tinted hex for one step of graphite or neutral. */
export function midnightTint(ramp, step, sourceHex) {
  if (ramp === 'neutral' && step === 'white') return '#ffffff';
  if (ramp === 'neutral' && step === 'black') return NEUTRAL_BLACK;
  const { l } = hexToOklch(sourceHex);
  return oklchToHex({ l, c: midnightChroma(ramp, step, l), h: MIDNIGHT_HUE });
}
