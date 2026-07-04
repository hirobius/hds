/**
 * Hirobius Design System — token bridge.
 *
 * All values here reference W3C CSS custom properties from tokens.css.
 * Source of truth: hirobius.tokens.json → node scripts/build-tokens.mjs
 *
 * For colours that require runtime theme-mode computation see theme.ts / ct(isDark).
 * Once full semantic colour tokens are added those too will become static CSS var references.
 */

import React from 'react';
import { tokenValues } from './generated-token-values';
import { tokenRefs } from './generated-token-refs';

const FONT_FAMILY_PRIMARY = 'var(--primitive-typography-family-primary)';
const FONT_FAMILY_MONO = 'var(--primitive-typography-family-mono)';
const msToSeconds = (value: string) => parseFloat(value) / 1000;

const motion = {
  productive: {
    duration: msToSeconds(tokenValues.primitive.duration.short),
    easing: [0, 0, 0.2, 1] as [number, number, number, number],
  },
  expressive: {
    duration: msToSeconds(tokenValues.primitive.duration.medium),
    easing: { type: 'spring', stiffness: 300, damping: 20, mass: 1 } as const,
  },
  spatial: {
    duration: msToSeconds(tokenValues.primitive.duration.long),
    easing: [0.4, 0, 0.2, 1] as [number, number, number, number],
  },
  exit: {
    duration: msToSeconds(tokenValues.primitive.duration.instant),
    easing: [0.4, 0, 1, 1] as [number, number, number, number],
  },
} as const;

const hds = {
  // ── Colors ──────────────────────────────────────────────────────────────────
  color: {
    brand:        'var(--primitive-color-blue-500)',   // primitive — use only where dark mode adaptation isn't needed (e.g. bg fills)
    content: {
      primary:   'var(--semantic-color-content-primary)',   // semantic — main content and headings
      secondary: 'var(--semantic-color-content-secondary)', // semantic — subdued content and captions
      disabled:  'var(--semantic-color-content-disabled)',  // semantic — disabled / placeholder content
      inverse:   'var(--semantic-color-content-inverse)',   // semantic — content on dark surfaces
      accent:    'var(--semantic-color-content-accent)',     // semantic — links and interactive content
      onAccent:  'var(--semantic-color-content-onAccent)',  // semantic — content on accent surfaces
    },
    brandPressed: 'var(--primitive-color-blue-600)',
    brandRGB:     '30,46,253',
    white:        'var(--primitive-color-neutral-white)',

    surface: {
      page:         { dark: 'var(--semantic-color-surface-page)', light: 'var(--semantic-color-surface-page)' },
      raised:       { dark: 'var(--semantic-color-surface-raised)', light: 'var(--semantic-color-surface-raised)' },
    },

    blue: {
      '50':  'var(--primitive-color-blue-50)',
      '100': 'var(--primitive-color-blue-100)',
      '200': 'var(--primitive-color-blue-200)',
      '300': 'var(--primitive-color-blue-300)',
      '400': 'var(--primitive-color-blue-400)',
      '450': 'var(--primitive-color-blue-450)',
      '500': 'var(--primitive-color-blue-500)',
      '600': 'var(--primitive-color-blue-600)',
      '700': 'var(--primitive-color-blue-700)',
      '800': 'var(--primitive-color-blue-800)',
      '900': 'var(--primitive-color-blue-900)',
    },

    feedback: {
      success: { dark: tokenValues.primitive.color.green['400'], light: tokenValues.primitive.color.green['700'] },
      warning: { dark: tokenValues.primitive.color.amber['400'], light: tokenValues.primitive.color.amber['800'] },
      error:   { dark: tokenValues.primitive.color.red['400'],   light: tokenValues.primitive.color.red['700'] },
      info:    { dark: tokenValues.primitive.color.blue['300'],  light: tokenValues.primitive.color.blue['500'] },
    },

  },

  // ── Typography ───────────────────────────────────────────────────────────────
  fontFamily:     FONT_FAMILY_PRIMARY,
  monoFamily:     FONT_FAMILY_MONO,

  fontSize: {
    '2xs': 'var(--primitive-typography-size-2xs)',
    xs:    'var(--primitive-typography-size-xs)',
    sm:    'var(--primitive-typography-size-sm)',
    base:  'var(--primitive-typography-size-base)',
    lg:    'var(--primitive-typography-size-lg)',
    xl:    'var(--primitive-typography-size-xl)',
    '2xl': 'var(--primitive-typography-size-2xl)',
    '3xl': 'var(--primitive-typography-size-3xl)',
    '4xl': 'var(--primitive-typography-size-4xl)',
    '5xl': 'var(--primitive-typography-size-5xl)',
  },

  fontWeight: {
    regular:  'var(--primitive-typography-weight-regular)',
    medium:   'var(--primitive-typography-weight-medium)',
    semibold: 'var(--primitive-typography-weight-semibold)',
    bold:     'var(--primitive-typography-weight-bold)',
  },

  lineHeight: {
    compact:  'var(--primitive-typography-lineHeight-compact)',
    none:     'var(--primitive-typography-lineHeight-none)',
    tight:    'var(--primitive-typography-lineHeight-tight)',
    snug:     'var(--primitive-typography-lineHeight-snug)',
    normal:   'var(--primitive-typography-lineHeight-normal)',
    relaxed:  'var(--primitive-typography-lineHeight-relaxed)',
  },

  letterSpacing: {
    tighter: 'var(--primitive-typography-letterSpacing-tighter)',
    tight:   'var(--primitive-typography-letterSpacing-tight)',
    normal:  'var(--primitive-typography-letterSpacing-normal)',
    wide:    'var(--primitive-typography-letterSpacing-wide)',
    wider:   'var(--primitive-typography-letterSpacing-wider)',
  },

  semantic: {
    color: {
      accent: {
        rest: tokenRefs.semantic.accent.rest,
        hover: tokenRefs.semantic.accent.hover,
        pressed: tokenRefs.semantic.accent.pressed,
        subtle: tokenRefs.semantic.accent.subtle,
        disabled: tokenRefs.semantic.accent.disabled,
      },
    },
    space: {
      subgrid: {
        gap: 'var(--semantic-space-subgrid-gap)',
        hairline: 'var(--semantic-space-subgrid-hairline)',
        xs: 'var(--semantic-space-subgrid-xs)',
      },
      component: {
        padding: 'var(--semantic-space-component-padding)',
        gap: 'var(--semantic-space-component-gap)',
      },
      stack: {
        gap: 'var(--semantic-space-section-stack)',
      },
      layout: {
        gutter: 'var(--semantic-space-layout-gutter)',
        gap: 'var(--semantic-space-layout-gap)',
        section: 'var(--semantic-layout-section-paddingY)',
      },
      section: {
        stack: 'var(--semantic-space-section-stack)',
        inset: 'var(--semantic-space-section-inset)',
      },
      sidebar: {
        indent: 'var(--semantic-space-sidebar-indent)',
        gap: 'var(--semantic-space-sidebar-gap)',
        sectionGap: 'var(--semantic-space-sidebar-sectionGap)',
        railPadding: 'var(--semantic-space-sidebar-railPadding)',
      },
    },
    typography: {
      label: tokenRefs.semantic.typography.ui as React.CSSProperties,
      labelDescriptive: tokenRefs.semantic.typography.ui as React.CSSProperties,
      labelTechnical: tokenRefs.semantic.typography.mono as React.CSSProperties,
    },
  },

  // Each style object spreads directly into a React inline style prop.
  // CSS vars resolve at paint time — no hardcoded pixel values.
  typeStyles: {
    // ── Canonical composites (Adrian directive 2026-05-04) ────────────────────
    // 7 roles. body/ui/eyebrow/mono carry maxWidth: 60ch where appropriate.
    // Eyebrow bakes text-transform: uppercase + caps tracking into the token —
    // never re-apply textTransform inline. Casing changes are eyebrow-only.
    display:   tokenRefs.semantic.typography.display as React.CSSProperties,
    h1:        tokenRefs.semantic.typography.h1      as React.CSSProperties,
    h2:        tokenRefs.semantic.typography.h2      as React.CSSProperties,
    h3:        tokenRefs.semantic.typography.h3      as React.CSSProperties,
    body:      tokenRefs.semantic.typography.body    as React.CSSProperties,
    ui:        tokenRefs.semantic.typography.ui      as React.CSSProperties,
    eyebrow:   tokenRefs.semantic.typography.eyebrow as React.CSSProperties,
    mono:      tokenRefs.semantic.typography.mono    as React.CSSProperties,
    // ── Migration aliases → canonical composites ──────────────────────────────
    // Pre-2026-05-04 names map to the new roles. small → ui; the eyebrow-pattern
    // callsites migrate explicitly to typeStyles.eyebrow as part of the
    // ops-dashboard sweep. caption now resolves to its own 12/16 composite
    // (semantic.typography.caption, matching Figma) rather than aliasing ui.
    small:     tokenRefs.semantic.typography.ui      as React.CSSProperties,
    caption:   tokenRefs.semantic.typography.caption as React.CSSProperties,
    heading1:  tokenRefs.semantic.typography.h1      as React.CSSProperties,
    heading2:  tokenRefs.semantic.typography.h2      as React.CSSProperties,
    heading3:  tokenRefs.semantic.typography.h3      as React.CSSProperties,
    technical: tokenRefs.semantic.typography.mono    as React.CSSProperties,
    badge:     tokenRefs.semantic.typography.eyebrow as React.CSSProperties,
    micro:     tokenRefs.semantic.typography.eyebrow as React.CSSProperties,
    displayXl:      tokenRefs.semantic.typography.display as React.CSSProperties,
    display1:       tokenRefs.semantic.typography.display as React.CSSProperties,
    display2:       tokenRefs.semantic.typography.h1      as React.CSSProperties,
    headingHero:    tokenRefs.semantic.typography.h1      as React.CSSProperties,
    headingSection: tokenRefs.semantic.typography.h3      as React.CSSProperties,
    title:          tokenRefs.semantic.typography.body    as React.CSSProperties,
    body2:          tokenRefs.semantic.typography.body    as React.CSSProperties,
    bodyLarge:      tokenRefs.semantic.typography.body    as React.CSSProperties,
    bodySmall:      tokenRefs.semantic.typography.ui      as React.CSSProperties,
    monoXs:         tokenRefs.semantic.typography.mono    as React.CSSProperties,
    monoSm:         tokenRefs.semantic.typography.mono    as React.CSSProperties,
    label:          tokenRefs.semantic.typography.ui      as React.CSSProperties,
    labelDescriptive:  tokenRefs.semantic.typography.ui   as React.CSSProperties,
    labelTechnical:    tokenRefs.semantic.typography.mono as React.CSSProperties,
  },

  // ── Icons ────────────────────────────────────────────────────────────────────
  iconSize: {
    small:  'var(--primitive-typography-size-base)',  // 16px — default icon size
    medium: 'var(--primitive-typography-size-lg)',    // 20px — prominent icons
    large:  'var(--primitive-typography-size-xl)',    // 24px — hero / large empty states
  },

  // ── Density-aware spacing ────────────────────────────────────────────────────
  // These vars respond to [data-density="compact"] on <html>.
  // Use for component padding/gap that should tighten in compact mode.
  // hds.space.px* for fixed measurements that never participate in density.
  density: {
    xs:  'var(--hds-space-xs)',   // 4px comfortable / 2px compact
    sm:  'var(--hds-space-sm)',   // 8px comfortable / 6px compact
    md:  'var(--hds-space-md)',   // 16px comfortable / 12px compact
    lg:  'var(--hds-space-lg)',   // 24px comfortable / 20px compact
    xl:  'var(--hds-space-xl)',   // 32px comfortable / 24px compact
    xl2: 'var(--hds-space-2xl)', // 48px comfortable / 40px compact
    xl3: 'var(--hds-space-3xl)', // 64px comfortable / 48px compact
    xl4: 'var(--hds-space-4xl)', // 80px comfortable / 64px compact
  },

  // ── Spacing ──────────────────────────────────────────────────────────────────
  // CSS var strings — valid in any inline style property that accepts a length.
  // Note: avoid interpolating these into template literal shorthand strings,
  // e.g. `margin: \`0 0 ${hds.space.px20}\`` — use individual properties instead.
  // For component spacing that adapts to density, use hds.density.* instead.
  space: {
    px1:  'var(--primitive-space-px1)',
    px2:  'var(--primitive-space-px2)',
    px4:  'var(--primitive-space-1)',
    px6:  'var(--primitive-space-px6)',
    px8:  'var(--primitive-space-2)',
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
    px128:'var(--primitive-space-32)',
  },

  // ── Border width ─────────────────────────────────────────────────────────────
  borderWidth: {
    xs:       'var(--primitive-borderWidth-xs)',  // 1px — standard hairline
    sm:       'var(--primitive-borderWidth-sm)',  // 2px — brand accent, selection ring
    md:       'var(--primitive-borderWidth-md)',  // 4px — indicator bar, callout border
    default:  'var(--semantic-borderWidth-default)',
    emphasis: 'var(--semantic-borderWidth-emphasis)',
  },

  // ── Border radius ────────────────────────────────────────────────────────────
  borderRadius: {
    0:      'var(--primitive-radius-0)',
    2:      'var(--primitive-radius-2)',
    4:      'var(--primitive-radius-4)',
    8:      'var(--primitive-radius-8)',
    full:   'var(--primitive-radius-full)',
    circle: '50%',
    /** Named aliases for common radii — prefer these over numeric keys in new code. */
    sm:     'var(--primitive-radius-4)',   // 4px — tight: tags, badges, small chips
    md:     'var(--primitive-radius-8)',   // 8px — default: cards, panels, inputs
    /** Global action radius — toggle one token to round all buttons, inputs, selects. */
    action: 'var(--semantic-radius-action)',
  },

  // ── Duration (CSS transition timing — use in transition: shorthand values) ──
  duration: {
    /** 100ms — binary toggles, instant dismissals */
    instant: 'var(--primitive-duration-instant)',
    /** 150ms — micro-interactions, hover/focus/press (productive default) */
    fast:    'var(--primitive-duration-short)',
    /** 250ms — entrances, teaching moments (expressive) */
    normal:  'var(--primitive-duration-medium)',
    /** 400ms — spatial movement, page travel (slow / spatial) */
    slow:    'var(--primitive-duration-long)',
  },
  effect: {
    blur: {
      subtle: 'var(--primitive-blur-8)',
      lightboxBackdrop: 'var(--component-lightbox-backdrop-blur)',
    },
  },
  zIndex: {
    base:    'var(--primitive-zIndex-0)',
    focus:   'var(--primitive-zIndex-10)',
    overlay: 'var(--primitive-zIndex-100)',
    modal:   'var(--primitive-zIndex-1000)',
  },

  // ── Breakpoints (read-only reference values — use in JS checks and docs) ─────
  breakpoints: {
    xs:  375,   // iPhone mini baseline
    sm:  640,   // Large phone / landscape — Tailwind sm
    md:  768,   // Tablet / mobile boundary — Tailwind md
    lg:  1024,  // Desktop — Tailwind lg
    xl:  1280,  // Wide desktop — Tailwind xl
    // CSS custom property names for use in @media queries
    css: {
      xs:  tokenRefs.primitive.breakpoint.xs,
      sm:  tokenRefs.primitive.breakpoint.sm,
      md:  tokenRefs.primitive.breakpoint.md,
      lg:  tokenRefs.primitive.breakpoint.lg,
      xl:  tokenRefs.primitive.breakpoint.xl,
    },
  } as const,

  // ── Layout ───────────────────────────────────────────────────────────────────
  layout: {
    pageGutterH:   'var(--semantic-layout-page-gutter-x)',
    mobileGutterH: 'var(--semantic-layout-page-gutter-x-mobile)',
    sectionPad:    'var(--semantic-layout-section-padding-y-shell)',
    sectionPadSm:  'var(--semantic-layout-section-padding-y-shell-tight)',
    panelGap:      'var(--semantic-layout-panel-gap)',
    panelGapMob:   'var(--semantic-layout-panel-gap-mobile)',
    containerMaxWidth: tokenRefs.semantic.layout.container.maxWidth,
    contentMaxWidth: tokenRefs.semantic.layout.content.maxWidth,
    proseMaxWidth:   tokenRefs.semantic.layout.prose.maxWidth,
    sectionPaddingY: tokenRefs.semantic.layout.section.paddingY,
    gridColumnGap:   tokenRefs.semantic.layout.grid.gap,
  },

  size: {
    8: 'var(--primitive-size-8)',
    10: 'var(--primitive-size-10)',
    12: 'var(--primitive-size-12)',
    16: 'var(--primitive-size-16)',
    20: 'var(--primitive-size-20)',
    24: 'var(--primitive-size-24)',
    32: 'var(--primitive-size-32)',
    40: 'var(--primitive-size-40)',
    48: 'var(--primitive-size-48)',
    64: 'var(--primitive-size-64)',
    80: 'var(--primitive-size-80)',
    96: 'var(--primitive-size-96)',
    interactive: {
      min: 'var(--primitive-size-interactive-min)',
    },
    width: {
      '96': 'var(--primitive-size-width-96)',
      '760': 'var(--primitive-size-width-760)',
      '1200': 'var(--primitive-size-width-1200)',
      '50ch': 'var(--primitive-size-width-50ch)',
    },
  },

  // ── Duration (seconds — Motion / CSS transition values) ──────────────────────
  motion,
};

/** @public */
export default hds;

// Re-exported so consuming apps get the full token API from a single subpath
// (`@hirobius/design-system/tokens`): the dark-mode resolver and raw values.
export { ct } from './theme';
export { tokenValues } from './generated-token-values';
