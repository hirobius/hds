/**
 * Divider — semantic separator between content regions.
 * @category Layout
 * @tier primitive
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// Decorative, non-interactive — no hover/active/focus states in the matrix.
// `orientation` is a layout axis (not part of the variant contract's four
// axes) that swaps which edge carries the stroke. `variant` is the structural
// axis: `default` is a hairline rule, `strong` steps up to the emphasis
// border color for a firmer separator.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- border-default/border-strong have no named Tailwind color utility (only the generic `border` role token is mapped); var()-based so still token-driven
const dividerVariants = cva('m-0 shrink-0 border-solid', {
  variants: {
    orientation: {
      horizontal: 'w-full self-stretch border-t',
      vertical: 'h-full border-l',
    },
    variant: {
      default: 'border-[var(--semantic-color-border-default)]',
      strong: 'border-[var(--semantic-color-border-strong)]',
    },
  },
  defaultVariants: { orientation: 'horizontal', variant: 'default' },
});

// ── Types ──────────────────────────────────────────────────────────────────────

type DividerVariantProps = VariantProps<typeof dividerVariants>;

/** @public */
export interface DividerProps
  extends Omit<React.HTMLAttributes<HTMLHRElement>, 'children'>, DividerVariantProps {
  /** Perpendicular spacing around the divider. */
  spacing?: string | number;
  /**
   * @deprecated Use `variant="strong"` instead. Kept for backward
   * compatibility; when set, it takes precedence over `variant`.
   */
  strong?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** @public */
export const Divider = React.forwardRef<HTMLHRElement, DividerProps>(function Divider(
  { orientation = 'horizontal', variant, spacing, strong, style, className, ...props },
  ref,
) {
  const resolvedVariant: DividerVariantProps['variant'] =
    strong !== undefined ? (strong ? 'strong' : 'default') : variant;
  const isHorizontal = orientation === 'horizontal';

  return (
    <hr
      ref={ref}
      aria-orientation={orientation ?? 'horizontal'}
      data-variant={resolvedVariant ?? 'default'}
      className={cn(dividerVariants({ orientation, variant: resolvedVariant }), className)}
      style={{
        ...(isHorizontal
          ? { marginTop: spacing, marginBottom: spacing }
          : { marginLeft: spacing, marginRight: spacing }),
        ...style,
      }}
      {...props}
    />
  );
});
