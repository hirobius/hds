/**
 * Surface — governed inset surface primitive.
 *
 * Enforces the "Surface Inset" rule: backgrounds MUST have internal padding.
 * - Default padding: px24 (cards) | px16 (items)
 * - Default border: none (elevation model — use shadow for lift)
 * - Fixed radius: var(--component-card-radius)
 * - shadow prop: applies a two-layer elevation shadow for card lift
 *
 * Usage:
 *   <Surface>Card content</Surface>
 *   <Surface padding="item">Compact item</Surface>
 *   <Surface shadow>Lifted card with elevation shadow.</Surface>
 *
 * @category Layout
 * @tier primitive
 * @doc-exempt: foundational inset primitive documented by usage throughout the system rather than a dedicated component doc page
 * @ai-intent Creates the only approved padded background-bearing wrapper in HDS so agents can express card, panel, and inset content without inventing ad hoc container chrome.
 * @ai-rules Use Surface only when content needs a background-bearing inset wrapper. Do NOT use Surface for macro page layouts, section spacing, or pure width constraints. Do NOT nest extra padded wrappers inside Surface to simulate another card. Do NOT recreate surface behavior with raw div padding, backgroundColor, or border styles elsewhere.
 */
'use client';

import React, { type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import type { PaddingOption } from './surface-padding';

// ── Variants ───────────────────────────────────────────────────────────────────
// The background is the theme-aware `--semantic-color-surface-raised` var, which
// re-roots under `[data-theme="dark"]` (see styles/tokens.css). The `theme` prop
// therefore forces a theme by setting `data-theme` on the element itself — that
// re-roots BOTH the surface background AND descendant content-color vars, so
// forced-dark content stays readable. (Previously a JS isDark branch picked a
// token whose dark/light refs both pointed at the same context var, so forcing
// was a silent no-op.)
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven radius/padding/elevation; var()-based, no Tailwind-theme utility exists
const surfaceVariants = cva(
  'box-border h-full border-none rounded-[var(--component-card-radius)] bg-[color:var(--semantic-color-surface-raised)] text-[color:var(--semantic-color-content-primary)]',
  {
    variants: {
      padding: {
        component: 'p-[var(--semantic-space-component-padding)]',
        // spacing-ok: 16px/24px are the surface's fixed inset contract (not layout spacing); kept as the legacy values these named options have always resolved to
        item: 'p-[16px]',
        px16: 'p-[16px]',
        px24: 'p-[24px]',
        none: 'p-0',
      },
      shadow: {
        // ADR-007: bind to the elevation-role token (raised) instead of a magic
        // RGBA value. Resolves to --semantic-shadow-subtle; theme-aware.
        true: 'shadow-[var(--semantic-elevation-raised-shadow)]',
        false: '',
      },
    },
    defaultVariants: { padding: 'component', shadow: false },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

type SurfaceVariantProps = VariantProps<typeof surfaceVariants>;

interface SurfaceProps
  extends
    Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'className'>,
    Omit<SurfaceVariantProps, 'shadow'> {
  /** Surface content. */
  children?: ReactNode;
  /** Padding: 'component' (24px, default) | 'item' (16px) | primitive px values | 'none' (0px). */
  padding?: PaddingOption;
  /** Apply the two-layer card elevation shadow for lift. */
  shadow?: boolean;
  /** Override CSS overflow. */
  overflow?: CSSProperties['overflow'];
  /** Force a theme regardless of context: 'dark' | 'light'. Defaults to context value. */
  theme?: 'dark' | 'light';
  /** Escape hatch: only use for narrow layout adjustments that do not belong in the primitive API. */
  style?: CSSProperties;
  /** Escape hatch: only use when tokenized props cannot express the required wrapper class. */
  className?: string;
  /** Element rendered as the outer wrapper. Defaults to 'div'. */
  as?: React.ElementType;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** @public */
export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
  {
    children,
    padding = 'component',
    shadow = false,
    overflow,
    theme: themeProp,
    style,
    className,
    as: Tag = 'div',
    ...rest
  },
  ref,
) {
  const surfaceStyle: CSSProperties | undefined =
    overflow !== undefined || style
      ? { ...(overflow !== undefined && { overflow }), ...style }
      : undefined;

  return (
    <Tag
      ref={ref}
      data-theme={themeProp}
      className={cn(surfaceVariants({ padding, shadow }), className)}
      style={surfaceStyle}
      data-hds-surface="true"
      data-hds-component="Surface"
      data-hds-metrics={`padding:${padding}`}
      {...rest}
    >
      {children}
    </Tag>
  );
});

/** @internal — CVA variant helper; compose via Surface props instead. */
export { surfaceVariants };
