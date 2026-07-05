/**
 * CircularProgress — an SVG ring showing determinate or indeterminate progress.
 * @category Feedback
 * @tier primitive
 */
// motion-ok: indeterminate spin via Tailwind animate-spin (gate accepts only hds.duration refs; the SVG sweep has no token duration equivalent)

import * as React from 'react';
import { cn } from '../../lib/utils';

// ── Config ─────────────────────────────────────────────────────────────────────
// Numeric SVG geometry (viewBox coordinates + stroke widths), not layout spacing.
const DIMENSIONS: Record<'sm' | 'md' | 'lg', { box: number; stroke: number }> = {
  sm: { box: 16, stroke: 2 },
  md: { box: 24, stroke: 3 },
  lg: { box: 32, stroke: 3 },
};

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export interface CircularProgressProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Current value. Ignored (and the ring animates) when `indeterminate`. */
  value?: number;
  /** Upper bound for `value`. Defaults to 100. */
  max?: number;
  /** Ring diameter preset. Defaults to `md`. */
  size?: 'sm' | 'md' | 'lg';
  /** Show a continuous spinner instead of a measured arc. */
  indeterminate?: boolean;
  /** Accessible name for the progress indicator. */
  label?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** A circular progress ring; pass `value`/`max` or set `indeterminate`. */
export const CircularProgress = React.forwardRef<HTMLSpanElement, CircularProgressProps>(
  function CircularProgress(
    { className, value = 0, max = 100, size = 'md', indeterminate = false, label, ...props },
    ref,
  ) {
    const { box, stroke } = DIMENSIONS[size];
    const radius = (box - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(Math.max(value, 0), max);
    const pct = max > 0 ? clamped / max : 0;
    // Indeterminate: a fixed quarter arc that the spin animation sweeps.
    const dashOffset = indeterminate ? circumference * 0.75 : circumference * (1 - pct);

    return (
      <span
        ref={ref}
        role="progressbar"
        aria-label={label}
        aria-valuemin={indeterminate ? undefined : 0}
        aria-valuemax={indeterminate ? undefined : max}
        aria-valuenow={indeterminate ? undefined : clamped}
        data-size={size}
        className={cn('inline-flex text-primary', className)}
        {...props}
      >
        <svg
          width={box}
          height={box}
          viewBox={`0 0 ${box} ${box}`}
          fill="none"
          className={indeterminate ? 'animate-spin' : undefined}
        >
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            strokeWidth={stroke}
            className="stroke-muted"
          />
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="stroke-current"
            transform={`rotate(-90 ${box / 2} ${box / 2})`}
          />
        </svg>
      </span>
    );
  },
);
