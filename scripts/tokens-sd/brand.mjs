/**
 * Single-seed brand theming (roadmap B2/B3; feedback #1 P2/P4 + feedback #2).
 *
 * Give one brand seed (hue + chroma) and get a fully AA-safe `--semantic-accent-*`
 * override block — the accent LIGHTNESS is solved from the white-on-accent
 * contrast contract, never copied from another hue. This encodes the feedback-#2
 * principle: a seed is a hue, the *system* owns role lightness, and you never
 * invert the foreground to rescue contrast — you project the seed onto the
 * lightness the role needs.
 *
 * Dependency-free; reuses color.mjs for OKLCH→sRGB.
 *
 *   import { createBrandTheme } from '.../brand.mjs';
 *   createBrandTheme({ hue: 165.2, chroma: 0.14 }).css   // jade override block
 */

import { oklchToRgb, rgbToHex } from './color.mjs';

// ── WCAG contrast ─────────────────────────────────────────────────────────────
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const relLuminance = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export const contrastRatio = (l1, l2) => {
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
};
const lumOf = (L, c, h) => relLuminance(oklchToRgb({ L, C: c, H: h }));
const WHITE_LUM = 1;
const BLACK_LUM = 0;

/**
 * Largest (lightest) OKLCH L for hue/chroma such that white-on-accent meets the
 * target ratio. Binary search — accent gets darker as L drops, raising the
 * ratio against white. Returns the lightest L that still passes (so the brand
 * stays as vivid as the contract allows).
 */
export function solveAccentLightness(hue, chroma, target = 4.5) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const ratio = contrastRatio(WHITE_LUM, lumOf(mid, chroma, hue));
    if (ratio >= target) lo = mid; // still passes → try lighter
    else hi = mid; // failed → must go darker
  }
  return lo;
}

const clampL = (x) => Math.max(0, Math.min(1, x));
const ok = (L, c, h) => `oklch(${L.toFixed(3)} ${c} ${h})`;

/**
 * @param {{ hue:number, chroma:number, target?:number, hoverStep?:number, pressedStep?:number }} seed
 * @returns {{ css:string, vars:Record<string,string>, resolved:Record<string,string>, report:object }}
 */
export function createBrandTheme({ hue, chroma, target = 4.5, hoverStep = 0.05, pressedStep = 0.1 }) {
  const restL = solveAccentLightness(hue, chroma, target);
  const hoverL = clampL(restL - hoverStep);
  const pressedL = clampL(restL - pressedStep);
  const subtleC = Math.min(chroma, 0.04);

  const vars = {
    '--semantic-accent-rest': ok(restL, chroma, hue),
    '--semantic-accent-hover': ok(hoverL, chroma, hue),
    '--semantic-accent-pressed': ok(pressedL, chroma, hue),
    '--semantic-accent-content': ok(restL, chroma, hue), // symmetric: accent-on-white == white-on-accent
    '--semantic-accent-subtle': ok(0.96, subtleC, hue),
    '--semantic-color-surface-accent': 'var(--semantic-accent-rest)',
    '--semantic-color-surface-accentSubtle': ok(0.96, subtleC, hue),
    '--semantic-color-border-accent': 'var(--semantic-accent-rest)',
    // Role tier — required so Tailwind-classed components (Button `bg-primary`,
    // ring, accent surfaces) re-skin. The role tokens bake in their :root value
    // (`var()` substitutes at declaration site), so a downstream
    // `--semantic-accent-*` override alone never reaches them; we re-declare the
    // accent-bound role vars here so they recompute against the seed.
    '--role-primary': 'var(--semantic-accent-rest)',
    '--role-ring': 'var(--semantic-accent-rest)',
    '--role-accent': 'var(--semantic-color-surface-accentSubtle)',
    '--role-accent-foreground': 'var(--semantic-accent-content)',
  };

  // B3: pick on-accent ink only as a safety net. We solved for white ≥ target, so
  // white wins — and per the feedback-#2 anti-pattern we DON'T override the
  // foreground unless white genuinely fails (e.g. an un-darkenable light seed).
  const restRgb = oklchToRgb({ L: restL, C: chroma, H: hue });
  const restLum = relLuminance(restRgb);
  const whiteRatio = contrastRatio(WHITE_LUM, restLum);
  const blackRatio = contrastRatio(BLACK_LUM, restLum);
  const ink = whiteRatio >= target ? 'white' : blackRatio > whiteRatio ? 'black' : 'white';
  if (ink !== 'white') vars['--semantic-color-content-onAccent'] = '#000000';

  const css =
    `/* HDS brand override — seed hue ${hue}, chroma ${chroma}. AA-safe; do not invert the foreground. */\n` +
    `:root {\n` +
    Object.entries(vars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n') +
    `\n}\n`;

  const resolved = {
    rest: rgbToHex(restRgb),
    hover: rgbToHex(oklchToRgb({ L: hoverL, C: chroma, H: hue })),
    pressed: rgbToHex(oklchToRgb({ L: pressedL, C: chroma, H: hue })),
  };

  return {
    css,
    vars,
    resolved,
    report: {
      restL: Number(restL.toFixed(3)),
      ink,
      whiteOnAccent: Number(whiteRatio.toFixed(2)),
      accentOnWhite: Number(whiteRatio.toFixed(2)), // symmetric
      borderOnWhite: Number(whiteRatio.toFixed(2)),
    },
  };
}

export default createBrandTheme;

// ── CLI: node scripts/tokens-sd/brand.mjs --hue 165.2 --chroma 0.14 ───────────
// Guarded so the module stays importable in the browser (Storybook), where
// `process` is undefined.
if (
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  import.meta.url === `file://${process.argv[1]}`
) {
  const arg = (name, def) => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? Number(process.argv[i + 1]) : def;
  };
  const hue = arg('hue');
  const chroma = arg('chroma', 0.14);
  if (Number.isNaN(hue)) {
    console.error('usage: node scripts/tokens-sd/brand.mjs --hue <deg> [--chroma <0..0.4>]');
    process.exit(1);
  }
  const t = createBrandTheme({ hue, chroma });
  console.error(
    `# seed hue ${hue}, chroma ${chroma} → restL ${t.report.restL}, ink ${t.report.ink}, ` +
      `white-on-accent ${t.report.whiteOnAccent}:1 (AA)\n`,
  );
  process.stdout.write(t.css);
}
