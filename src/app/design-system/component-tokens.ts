/**
 * The slice of the token bridge the components read (hds#1519).
 *
 * `hds` (tokens.ts) carries every token group plus the generated ref and value
 * tables, about 3 kB gzipped, and a bundler cannot drop it once a component
 * reads one key. Components import these constants instead, so a
 * components-only import of the root ships none of the bridge. Every value is
 * the CSS var string `hds` holds for the same path; tokens.ts keeps its own
 * copy, built from a step helper so it is not a clone of this table (importing
 * this module there would pull it into the tokens entry graphs), and
 * component-tokens.test.ts pins every export against `hds` so the
 * two cannot drift. Add a key here only when a component reads it.
 */
import type { CSSProperties } from 'react';

/** A type role's inline style: the same keys, in the same order, as `tokenRefs.semantic.typography`. */
const role = (name: string, maxWidth?: boolean): CSSProperties => {
  const v = (prop: string) => `var(--semantic-typography-${name}-${prop})`;
  return {
    fontFamily: v('font-family'),
    fontSize: v('font-size'),
    fontWeight: v('font-weight'),
    letterSpacing: v('letter-spacing'),
    lineHeight: v('line-height'),
    ...(maxWidth && { maxWidth: v('max-width') }),
  };
};

export const typeStyles = {
  ui: role('ui', true),
  uiRegular: role('uiRegular', true),
  caption: role('caption'),
  mono: role('mono', true),
  title: role('title'),
  titleSm: role('titleSm'),
};

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

/** `hds.semantic.space.scale`. */
export const scale = {
  xs: 'var(--semantic-space-scale-xs)',
  sm: 'var(--semantic-space-scale-sm)',
  md: 'var(--semantic-space-scale-md)',
  lg: 'var(--semantic-space-scale-lg)',
  xl: 'var(--semantic-space-scale-xl)',
} as const;

/** `hds.semantic.space.subgrid`. */
export const subgrid = {
  gap: 'var(--semantic-space-subgrid-gap)',
  hairline: 'var(--semantic-space-subgrid-hairline)',
  xs: 'var(--semantic-space-subgrid-xs)',
} as const;

/** `hds.semantic.space.sidebar` (the gap roles only). */
export const sidebar = {
  gap: 'var(--semantic-space-sidebar-gap)',
  sectionGap: 'var(--semantic-space-sidebar-sectionGap)',
} as const;

/** `hds.semantic.space.fixed['2xs']`. */
export const FIXED_2XS = 'var(--semantic-space-fixed-2xs)';

/** `hds.iconSize`. */
export const iconSize = {
  small: 'var(--primitive-size-16)',
  medium: 'var(--primitive-size-20)',
  large: 'var(--primitive-size-24)',
} as const;

/** `hds.fontFamily`. */
export const FONT_FAMILY = 'var(--primitive-typography-family-primary)';
/** `hds.borderWidth.default`. */
export const BORDER_WIDTH_DEFAULT = 'var(--semantic-borderWidth-default)';
/** `hds.borderRadius.full` and `hds.borderRadius[2]`. */
export const RADIUS_FULL = 'var(--primitive-radius-full)';
export const RADIUS_2 = 'var(--primitive-radius-2)';
/** `hds.color.content.onAccent`. */
export const CONTENT_ON_ACCENT = 'var(--semantic-color-content-onAccent)';
/** `hds.zIndex.focus` and `hds.zIndex.modal`. */
export const Z_FOCUS = 'var(--primitive-zIndex-10)';
export const Z_MODAL = 'var(--primitive-zIndex-1000)';
/** `hds.breakpoints.sm` and `.lg`, in px. */
export const BREAKPOINT_SM = 640;
export const BREAKPOINT_LG = 1024;
