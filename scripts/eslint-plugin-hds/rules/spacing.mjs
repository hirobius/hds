/**
 * The Tailwind spacing-utility grammar and the off-grid primitive spacing steps,
 * shared by hds/no-primitive-spacing, scripts/check-tailwind-spacing-scale.mjs
 * and codemods/spacing-steps.mjs (hds#778). It lives in rules/ because both the
 * plugin and the codemod ship from here; scripts/lib is not published.
 */

/** Spacing utility names: padding and margin sides, gap, space-x/y. */
export const SPACING_UTILITY = 'p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy]';

/** A numeric (`2`, `1.5`) or pxN (`px6`) spacing step. */
export const SPACING_STEP = '\\d+(?:\\.\\d+)?|px\\d+';

/** A bare utility (no variant, `!` or `-`): group 1 is the utility, group 2 the step. */
export const SPACING_UTILITY_RE = new RegExp(`^(${SPACING_UTILITY})-(${SPACING_STEP})$`);

/**
 * The off-grid primitive steps and the on-grid step the hds-spacing-steps
 * codemod rewrites each to: `scale` (CSS var, DTCG path, Tailwind key) and `js`
 * (hds.space key). 0.31.0 kept them (open layouts need 6px and 10px), so the
 * rewrite is optional; a future deprecated step joins this map.
 */
export const OFF_GRID_STEPS = Object.freeze({
  px6: Object.freeze({ scale: '2', js: 'px8' }),
  px10: Object.freeze({ scale: '3', js: 'px12' }),
});
