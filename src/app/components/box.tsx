/**
 * Box — polymorphic layout primitive with a token-first `sx` engine.
 * @category Layout
 * @tier primitive
 * @ai-intent Provides one narrow escape hatch for genuinely one-off layout that no
 * named primitive covers, without inviting ad hoc inline styles or raw hex/px values
 * back into the system — the `sx` engine only accepts HDS token keys and a small,
 * deliberate CSS subset.
 * @ai-rules Reach for Stack/Grid/Container/the every-layout primitives first. Use
 * Box `sx` ONLY for genuinely one-off layout. sx colors/spacing MUST use token
 * keys, not raw hex/px. Prefer named layout primitives over ad-hoc flex.
 *
 * `sx` is a deliberate SUBSET of MUI's sx — not all of CSS-in-JS is a feature:
 *   - Spacing shorthands (m/p/gap family) resolve numbers off the 4px HDS scale
 *     (`--primitive-space-<n>`) and named steps ('tight'|'normal'|'inset'|'spacious')
 *     off `--semantic-space-layout-*`.
 *   - `color`/`bgcolor`/`borderColor`/`fill`/`stroke` resolve dotted token keys
 *     ('content.primary', 'surface.raised', 'border.subtle', 'accent',
 *     'accent.hover', 'feedback.success', …) to the matching semantic CSS var.
 *   - Responsive `{ xs, sm, md, lg, xl }` objects compile to `min-width` media
 *     queries off the HDS breakpoint scale.
 *   - `&`-prefixed keys ('&:hover', '& > *', '&[data-state=open]') nest a
 *     selector, composable with responsive values.
 *   - Everything else passes through as a plain camelCase→kebab-case CSS
 *     declaration (numbers get `px` unless in the unitless allowlist).
 *
 * See `box-sx.ts` for the pure resolver + hashing/injection engine.
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { injectSx, type SxObject } from './box-sx';

export type { SxObject, SxValue, ResponsiveValue, Breakpoint } from './box-sx';

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export interface BoxProps extends React.HTMLAttributes<HTMLElement> {
  /** Element (or component) rendered as the outer wrapper. Defaults to 'div'. */
  as?: React.ElementType;
  /** Token-first `sx` layout engine — see the file-level docstring for the supported subset. */
  sx?: SxObject;
  /** Box content. */
  children?: React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** @public */
export const Box = React.forwardRef<HTMLDivElement, BoxProps>(function Box(
  { as: Tag = 'div', sx, className, children, ...rest },
  ref,
) {
  const sxClass = sx ? injectSx(sx) : undefined;

  return (
    <Tag
      ref={ref}
      className={cn(sxClass, className)}
      data-hds-component="Box"
      data-hds-metrics={sx ? `sx:${Object.keys(sx).length}` : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
});
