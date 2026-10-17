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
const skeletonVariants = /* @__PURE__ */ cva('hds-skeleton block', {
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
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement>, SkeletonVariantProps {
  /** Explicit width (number → px, or any CSS length). */
  width?: number | string;
  /** Explicit height (number → px, or any CSS length). For `text`, defaults to 1em; for `rectangular`, 5rem. */
  height?: number | string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Decorative loading placeholder. Tagged here rather than in the file block so
 * SkeletonSwap, in this module, does not claim Skeleton's Figma node.
 * @usage Reserve the shape of content that is still loading, so the layout does not jump.
 * @whenNot A task with measurable progress, or a wait with no layout to reserve.
 * @useInstead Progress a task with measurable progress
 * @useInstead Spinner a short wait with no layout to reserve
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=88-95
 *
 * Marked aria-hidden — announce the loading
 * state on the surrounding region (e.g. aria-busy) rather than per skeleton.
 */
export const Skeleton = /* @__PURE__ */ React.forwardRef<HTMLDivElement, SkeletonProps>(
  function Skeleton({ className, variant = 'rectangular', width, height, style, ...props }, ref) {
    const resolvedHeight =
      height ?? (variant === 'text' ? '1em' : variant === 'rectangular' ? '5rem' : undefined);
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
  },
);

/** @public */
export interface SkeletonSwapProps extends React.HTMLAttributes<HTMLDivElement> {
  /** True while the content is loading: the skeleton shows. */
  loading: boolean;
  /** The placeholder shown while loading, usually Skeletons in the content's shape. */
  skeleton: React.ReactNode;
  /** The loaded content. */
  children?: React.ReactNode;
}

/**
 * Shows `skeleton` while `loading`, then fades the content in over the same
 * footprint (.hds-motion-reveal), so loaded content settles in rather than
 * popping. Content that was never loading renders without the fade.
 * @usage Swap loading placeholders for the loaded content with a short fade, so it settles in instead of popping.
 * @whenNot Content that is ready on first render, or a placeholder that never resolves to content.
 * @useInstead Skeleton a bare placeholder you swap out yourself
 */
export const SkeletonSwap = /* @__PURE__ */ React.forwardRef<HTMLDivElement, SkeletonSwapProps>(
  function SkeletonSwap({ loading, skeleton, children, className, ...props }, ref) {
    const wasLoading = React.useRef(loading);
    if (loading) wasLoading.current = true;
    return (
      <div
        ref={ref}
        aria-busy={loading || undefined}
        className={cn(!loading && wasLoading.current && 'hds-motion-reveal', className)}
        {...props}
      >
        {loading ? skeleton : children}
      </div>
    );
  },
);
