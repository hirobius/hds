"use client";

/**
 * __NAME__ — Swiss-canonical component scaffold.
 * @category Component
 * @tier primitive
 *
 * Body emphasis is font-medium (500), never bold. Color hierarchy uses
 * opacity on a single hue (semantic.color.content.{primary,secondary,
 * tertiary}), never a second hue. Spacing on the 8px grid only.
 *
 * For interactive/overlay components, wrap a Radix primitive here (see
 * popover.tsx / hds-tooltip.tsx for the token-skinned pattern) and keep this
 * cva block as the class contract.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────

const __CAMEL__Variants = cva(
  'flex flex-col gap-2 rounded-md bg-muted p-4 font-sans font-medium text-foreground',
  {
    variants: {
      variant: {
        primary: 'bg-muted text-foreground',
        secondary: 'bg-background text-muted-foreground',
        tertiary: 'bg-transparent text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export type __NAME__Variant = NonNullable<VariantProps<typeof __CAMEL__Variants>['variant']>;

export interface __NAME__Props extends React.HTMLAttributes<HTMLDivElement> {
  /** Variant — primary | secondary | tertiary. */
  variant?: __NAME__Variant;
  /** Slot content. */
  children?: React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** @public */
export const __NAME__ = React.forwardRef<HTMLDivElement, __NAME__Props>(function __NAME__(
  { variant = 'primary', className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      data-component="__NAME__"
      data-variant={variant}
      className={cn(__CAMEL__Variants({ variant }), className)}
      {...rest}
    >
      {children}
    </div>
  );
});

/** @internal — CVA variant helper; compose via __NAME__ props instead. */
export { __CAMEL__Variants };
