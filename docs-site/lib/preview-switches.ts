/**
 * Docs preview switches (hds#794): Corners (rounded | sharp) and Shadow
 * (soft | hard). They set `data-docs-corners` / `data-docs-shadow` on <html>;
 * the rules that react live in docs-site/app/globals.css. Not one of the four
 * theming dials (ADR-023) and never part of shipped styles.css.
 *
 * Accent (graphite | cobalt, hds#857) is different: it sets the package's own
 * `data-accent` overlay (src/styles/accents.css, shipped in styles.css), which
 * swaps only the accent tokens. Graphite is the default, so it leaves the attribute unset.
 *
 * Density (comfortable | compact) is the package's density dial (ADR-023): it sets
 * `data-density="compact"` on <html>, the generated compact block in tokens.css
 * (the tokens' Compact mode, for dense apps). Comfortable leaves it unset.
 */
export const CORNERS = ['rounded', 'sharp'] as const;
export const SHADOWS = ['soft', 'hard'] as const;
export const ACCENTS = ['graphite', 'cobalt'] as const;
export const DENSITIES = ['comfortable', 'compact'] as const;
export type Corners = (typeof CORNERS)[number];
export type Shadow = (typeof SHADOWS)[number];
export type Accent = (typeof ACCENTS)[number];
export type Density = (typeof DENSITIES)[number];
export interface Switches {
  corners: Corners;
  shadow: Shadow;
  accent: Accent;
  density: Density;
}

export const STORAGE_KEY = 'hds-docs-preview-switches';
export const DEFAULT_SWITCHES: Switches = {
  corners: 'rounded',
  shadow: 'soft',
  accent: 'graphite',
  density: 'comfortable',
};

export function parseSwitches(raw: string | null): Switches {
  if (!raw) return { ...DEFAULT_SWITCHES };
  try {
    const v = JSON.parse(raw) as Partial<Switches>;
    return {
      corners: CORNERS.includes(v.corners as Corners) ? (v.corners as Corners) : 'rounded',
      shadow: SHADOWS.includes(v.shadow as Shadow) ? (v.shadow as Shadow) : 'soft',
      accent: ACCENTS.includes(v.accent as Accent) ? (v.accent as Accent) : 'graphite',
      density: DENSITIES.includes(v.density as Density) ? (v.density as Density) : 'comfortable',
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
  if (s.accent === 'graphite') root.removeAttribute('data-accent');
  else root.setAttribute('data-accent', s.accent);
  if (s.density === 'compact') root.setAttribute('data-density', 'compact');
  else root.removeAttribute('data-density');
}
