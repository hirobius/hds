/**
 * Dark-mode surface contrast (bug bash item 22 + the menu highlight fill, decided by
 * Adrian 2026-10-14): a card's resting edge must read against the page, and the
 * highlighted menu/select/combobox item (surface.sunken) must differ from the
 * overlay it sits on.
 */
import { describe, it, expect } from 'vitest';
import { contrastRatio } from '../src/app/utils/colorUtils';
import { tokenHex as hex } from './helpers/token-color';

describe('dark-mode surface contrast', () => {
  it('a card edge (border.default) reads against the page at 2.5:1 or more', () => {
    const ratio = contrastRatio(
      hex('semantic.color.border.default', 'Dark'),
      hex('semantic.color.surface.page', 'Dark'),
    );
    expect(ratio).toBeGreaterThanOrEqual(2.5);
  });

  it('the highlighted item fill (surface.sunken) differs from the overlay', () => {
    const ratio = contrastRatio(
      hex('semantic.color.surface.sunken', 'Dark'),
      hex('semantic.color.surface.overlay', 'Dark'),
    );
    expect(ratio).toBeGreaterThanOrEqual(1.3);
  });

  it('pins the light values', () => {
    // Light moved on purpose: border.default to graphite.200 (divider contrast,
    // 2026-10-22), then the hds#522 ladder re-space moved it to graphite.250 and
    // sunken to neutral.300 (light-surfaces.test.ts owns the ladder).
    expect(hex('semantic.color.border.default', 'Light')).toBe(
      hex('primitive.color.graphite.250', 'Light'),
    );
    expect(hex('semantic.color.surface.sunken', 'Light')).toBe(
      hex('primitive.color.neutral.300', 'Light'),
    );
  });
});

describe('Menu.Item tone="danger" contrast (hds#822)', () => {
  // The danger item text is feedback.error, on the overlay at rest and on the
  // danger tint (feedback.bg.error) that fills the highlighted item on hover/focus
  // (surface.sunken is only 3.7:1 under it in dark mode). AA body text is 4.5:1.
  for (const mode of ['Light', 'Dark'] as const) {
    for (const surface of ['overlay', 'feedback.bg.error'] as const) {
      it(`feedback.error reads on ${surface} at 4.5:1 or more (${mode})`, () => {
        const ratio = contrastRatio(
          hex('semantic.color.feedback.error', mode),
          hex(
            surface.includes('.')
              ? `semantic.color.${surface}`
              : `semantic.color.surface.${surface}`,
            mode,
          ),
        );
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
