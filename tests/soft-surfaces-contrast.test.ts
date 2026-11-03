/**
 * Soft surfaces (hds#891) + the default hard shadow (hds#888), contrast in light and dark.
 *
 * A soft secondary Button has no border: its WCAG 1.4.11 boundary is the hard shadow, so
 * semantic.color.shadow.hard must reach 3:1 against every surface a button sits on. Text on
 * the new soft fills (button, tag, chip) must clear AA (4.5:1). Fills must step visibly
 * from the surface under them, or "separation by tone" separates nothing.
 *
 * Scope: a Button sits on page, raised, overlay or muted. In dark mode the hard shadow is
 * under 3:1 on the state fills (surface.sunken/hover 2.2:1, accentSubtle 2.8:1); those are
 * highlight fills for rows and items, not surfaces to place a Button on.
 */
import { describe, it, expect } from 'vitest';
import { contrastRatio } from '../src/app/utils/colorUtils';
import { tokenHex as hex } from './helpers/token-color';

const MODES = ['Light', 'Dark'] as const;
type Mode = (typeof MODES)[number];

const ratio = (a: string, b: string, mode: Mode) => contrastRatio(hex(a, mode), hex(b, mode));
const surface = (s: string) => `semantic.color.surface.${s}`;

describe.each(MODES)('soft surfaces contrast (%s)', (mode) => {
  it.each(['page', 'raised', 'overlay', 'muted'])(
    'the hard shadow (the soft button boundary) reaches 3:1 on surface.%s',
    (s) => {
      expect(ratio('semantic.color.shadow.hard', surface(s), mode)).toBeGreaterThanOrEqual(3);
    },
  );

  it.each([
    ['component.button.secondary.bg.rest'],
    ['component.button.secondary.bg.hover'],
    ['component.button.secondary.bg.pressed'],
  ])('secondary Button text (content.primary) is AA on %s', (fill) => {
    expect(ratio('semantic.color.content.primary', fill, mode)).toBeGreaterThanOrEqual(4.5);
  });

  it('Tag text is AA on its soft pill, and the pill border is its own fill (no rest edge)', () => {
    expect(ratio('component.tag.text', 'component.tag.background', mode)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(hex('component.tag.border', mode)).toBe(hex('component.tag.background', mode));
  });

  it('a selected chip (content.primary on surface.muted) is AA', () => {
    expect(ratio('semantic.color.content.primary', surface('muted'), mode)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it('the soft button fill steps visibly off the page and a raised Card', () => {
    expect(ratio(surface('soft'), surface('page'), mode)).toBeGreaterThanOrEqual(1.2);
    expect(ratio(surface('soft'), surface('raised'), mode)).toBeGreaterThanOrEqual(1.2);
  });

  it('the segmented-control track (surface.muted) steps off the page, and the selected segment edge (border.interactive) reaches 3:1 on it', () => {
    expect(ratio(surface('muted'), surface('page'), mode)).toBeGreaterThanOrEqual(1.05);
    expect(
      ratio('semantic.color.border.interactive', surface('muted'), mode),
    ).toBeGreaterThanOrEqual(3);
  });

  it('a borderless overlay (popover, menu, dialog) steps off the page', () => {
    expect(ratio(surface('overlay'), surface('page'), mode)).toBeGreaterThanOrEqual(1.08);
  });

  it('inputs keep a 3:1 border (border.interactive) on page and raised', () => {
    for (const s of ['page', 'raised'])
      expect(ratio('semantic.color.border.interactive', surface(s), mode)).toBeGreaterThanOrEqual(
        3,
      );
  });
});
