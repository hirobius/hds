/**
 * Progress - linear bar or circular ring (determinate or indeterminate).
 * @category Feedback
 * @tier primitive
 * @usage Show how far a task has got, as a bar or ring that is determinate or indeterminate.
 * @whenNot A wait of unknown length with no bar, or content that is still loading.
 * @useInstead Spinner a wait of unknown length
 * @useInstead Skeleton placeholder shapes for loading content
 * @figma https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=88-91
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- the track is surface-overlay, not the unmapped shadcn `bg-muted` that equalled the fill; semantic color token has no Tailwind-theme utility, var()-based so still token-driven
const progressTrackVariants = /* @__PURE__ */ cva(
  'w-full overflow-hidden rounded-full bg-[var(--semantic-color-surface-overlay)]',
  {
    variants: {
      size: {
        sm: 'h-1.5',
        md: 'h-2',
        lg: 'h-3',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

// Tone (hds#393) colors the fill: the bar's background, the ring's stroke via
// currentColor. `neutral` keeps each shape's existing color: `bg-primary` (the accent surface, which contrasts with the track) for
// the bar, `text-primary` for the ring (the color the standalone ring used).
//
// `tone` and `variant` are lookups here, not cva axes: a cva contract axis is a
// VARIANT on the Figma Progress set (88:91; docs/architecture/variant-contract.md
// "Figma mapping"), and that set has no Tone or Variant yet. When Figma gains
// them, move these into cva and list them in Progress's variantAxes in
// scripts/build-tokens.mjs, like the dot-size lookup in badge.tsx.
const PROGRESS_TONES = {
  neutral: { bar: 'bg-primary', ring: 'text-primary' },
  danger: { bar: 'bg-feedback-danger', ring: 'text-feedback-danger' },
  success: { bar: 'bg-feedback-success', ring: 'text-feedback-success' },
  warning: { bar: 'bg-feedback-warning', ring: 'text-feedback-warning' },
  info: { bar: 'bg-feedback-info', ring: 'text-feedback-info' },
} as const;

// Ring geometry in SVG units (diameter and stroke width) per size: sm 16px,
// md 24px, lg 32px.
const RING = {
  sm: { box: 16, stroke: 2 },
  md: { box: 24, stroke: 3 },
  lg: { box: 32, stroke: 3 },
} as const;

// ── Types ──────────────────────────────────────────────────────────────────────

type ProgressVariantProps = VariantProps<typeof progressTrackVariants>;

/** @public */
export interface ProgressProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'>, ProgressVariantProps {
  /**
   * Completion 0–max. Omit (or pass null) for an indeterminate bar that
   * animates until the work completes.
   */
  value?: number | null;
  /** Upper bound for `value`. Defaults to 100. */
  max?: number;
  /** Shape: `linear` bar (default) or `circular` ring. */
  variant?: 'linear' | 'circular';
  /** Fill color: `neutral` (default) or a feedback tone. */
  tone?: keyof typeof PROGRESS_TONES;
  /** Accessible label for the progress bar. */
  label?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Linear bar or circular ring. Determinate when `value` is a number, else indeterminate. */
export const Progress = /* @__PURE__ */ React.forwardRef<HTMLDivElement, ProgressProps>(
  function Progress(
    {
      className,
      size,
      value = null,
      max = 100,
      variant = 'linear',
      tone = 'neutral',
      label = 'Progress',
      ...props
    },
    ref,
  ) {
    const isIndeterminate = value === null || value === undefined;
    const clamped = isIndeterminate ? max : Math.max(0, Math.min(max, value));
    // The default scale uses the value as the percent, untouched by float math,
    // so the bar's width renders as it did before `max` existed.
    const pct = max === 100 ? clamped : max > 0 ? (clamped * 100) / max : 0;
    const shared = {
      role: 'progressbar',
      'aria-label': label,
      'aria-valuemin': isIndeterminate ? undefined : 0,
      'aria-valuemax': isIndeterminate ? undefined : max,
      // The default 0-100 scale keeps its whole-number aria-valuenow; a custom
      // max reports the value as given.
      'aria-valuenow': isIndeterminate ? undefined : max === 100 ? Math.round(clamped) : clamped,
      'data-state': isIndeterminate ? 'indeterminate' : 'determinate',
      'data-variant': variant,
      'data-tone': tone,
    } as const;

    if (variant === 'circular') {
      const { box, stroke } = RING[size ?? 'md'];
      const radius = (box - stroke) / 2;
      const circumference = 2 * Math.PI * radius;
      // Indeterminate: a fixed quarter arc that the spin sweeps.
      const dashOffset = circumference * (isIndeterminate ? 0.75 : 1 - pct / 100);
      // A span, not a div, so the ring can sit inline in phrasing content (a
      // <p>, a label). The ref then points at that span.
      return (
        <span
          ref={ref as React.Ref<HTMLSpanElement>}
          {...shared}
          className={cn('inline-flex', PROGRESS_TONES[tone].ring, className)}
          {...props}
        >
          <svg
            width={box}
            height={box}
            viewBox={`0 0 ${box} ${box}`}
            fill="none"
            aria-hidden="true"
            className={cn(isIndeterminate && 'animate-spin motion-reduce:animate-none')}
          >
            <circle
              cx={box / 2}
              cy={box / 2}
              r={radius}
              strokeWidth={stroke}
              // eslint-disable-next-line tailwindcss/no-arbitrary-value -- ring track matches the bar track (surface-overlay); var()-based so still token-driven
              className="stroke-[var(--semantic-color-surface-overlay)]"
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
    }

    return (
      <div
        ref={ref}
        {...shared}
        className={cn(progressTrackVariants({ size }), className)}
        {...props}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300 ease-out',
            PROGRESS_TONES[tone].bar,
            isIndeterminate && 'animate-pulse motion-reduce:animate-none',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  },
);
