/**
 * The primitive space steps as CSS var strings (hds#1519).
 *
 * A leaf module with no imports: `hds.space` (tokens.ts) and the lean
 * component-tokens.ts both read this one table, so neither graph carries a
 * second copy and the duplication gate (check-dupes) stays under its threshold.
 */

/** `hds.space`: the primitive steps, valid in any inline style that takes a length. */
export const space = {
  px1: 'var(--primitive-space-px1)',
  px2: 'var(--primitive-space-px2)',
  px4: 'var(--primitive-space-1)',
  px6: 'var(--primitive-space-px6)',
  px8: 'var(--primitive-space-2)',
  px10: 'var(--primitive-space-px10)',
  px12: 'var(--primitive-space-3)',
  px16: 'var(--primitive-space-4)',
  px20: 'var(--primitive-space-5)',
  px24: 'var(--primitive-space-6)',
  px28: 'var(--primitive-space-7)',
  px32: 'var(--primitive-space-8)',
  px40: 'var(--primitive-space-10)',
  px48: 'var(--primitive-space-12)',
  px64: 'var(--primitive-space-16)',
  px80: 'var(--primitive-space-20)',
  px96: 'var(--primitive-space-24)',
  px128: 'var(--primitive-space-32)',
} as const;
