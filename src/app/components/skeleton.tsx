/**
 * Skeleton - placeholder shimmer for content that is still loading.
 * @category Feedback
 * @tier primitive
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// Shimmer + surface fill come from the shared `.hds-skeleton` class (theme.css),
// which also zeroes its animation under prefers-reduced-motion. Shape is the only
// styling axis; dimensions are caller-supplied via width/height.
const skeletonVariants = cva('hds-skeleton block', {
  variants: {
    variant: {
      text: 'rounded',
      rectangular: 'rounded-md',
      circular: 'rounded-full',
    },
  },
  defaultVariants: { variant: 'rectangular' },
});

// ── Types ──────────────────────────────────────────────────────────────────────

type SkeletonVariantProps = VariantProps<typeof skeletonVariants>;

/** @public */
export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    SkeletonVariantProps {
  /** Explicit width (number → px, or any CSS length). */
  width?: number | string;
  /** Explicit height (number → px, or any CSS length). For `text`, defaults to 1em. */
  height?: number | string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Decorative loading placeholder. Marked aria-hidden — announce the loading
 * state on the surrounding region (e.g. aria-busy) rather than per skeleton.
 */
export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { className, variant = 'rectangular', width, height, style, ...props },
  ref,
) {
  const resolvedHeight = height ?? (variant === 'text' ? '1em' : undefined);
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-variant={variant}
      className={cn(skeletonVariants({ variant }), className)}
      style={{ width, height: resolvedHeight, ...style }}
      {...props}
    />
  );
});

/** @internal — CVA variant helper; compose via Skeleton props instead. */
export { skeletonVariants };
