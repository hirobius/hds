/**
 * Docs-only preview switches (hds#794): Corners (rounded | sharp) and Shadow
 * (soft | hard). They set `data-docs-corners` / `data-docs-shadow` on <html>;
 * the rules that react live in docs-site/app/globals.css. Not one of the four
 * theming dials (ADR-023) and never part of shipped styles.css.
 */
export const CORNERS = ['rounded', 'sharp'] as const;
export const SHADOWS = ['soft', 'hard'] as const;
export type Corners = (typeof CORNERS)[number];
export type Shadow = (typeof SHADOWS)[number];
export interface Switches {
  corners: Corners;
  shadow: Shadow;
}

export const STORAGE_KEY = 'hds-docs-preview-switches';
export const DEFAULT_SWITCHES: Switches = { corners: 'rounded', shadow: 'soft' };

export function parseSwitches(raw: string | null): Switches {
  if (!raw) return { ...DEFAULT_SWITCHES };
  try {
    const v = JSON.parse(raw) as Partial<Switches>;
    return {
      corners: CORNERS.includes(v.corners as Corners) ? (v.corners as Corners) : 'rounded',
      shadow: SHADOWS.includes(v.shadow as Shadow) ? (v.shadow as Shadow) : 'soft',
    };
  } catch {
    return { ...DEFAULT_SWITCHES };
  }
}

export function readSwitches(): Switches {
  try {
    return parseSwitches(localStorage.getItem(STORAGE_KEY));
  } catch {
    return { ...DEFAULT_SWITCHES };
  }
}

export function writeSwitches(s: Switches): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage blocked: the switch still applies for this page view */
  }
}

/** Defaults leave the attribute unset, so today's look is the untouched cascade. */
export function applySwitches(s: Switches): void {
  const root = document.documentElement;
  if (s.corners === 'sharp') root.setAttribute('data-docs-corners', 'sharp');
  else root.removeAttribute('data-docs-corners');
  if (s.shadow === 'hard') root.setAttribute('data-docs-shadow', 'hard');
  else root.removeAttribute('data-docs-shadow');
}
