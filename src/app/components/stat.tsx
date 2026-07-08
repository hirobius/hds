/**
 * @category Display
 * @tier primitive
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// Non-interactive — no hover/active/focus states. Tone drives only the value
// color; label/sub stay muted regardless. Renamed the pre-contract 'default'
// value to the fixed vocabulary's 'neutral' (#60 — check-prop-vocabulary rule C).
const statVariants = cva('m-0 text-2xl font-medium leading-tight', {
  variants: {
    tone: {
      neutral: 'text-foreground',
      success: 'text-feedback-success',
      warning: 'text-feedback-warning',
      danger: 'text-feedback-danger',
      info: 'text-feedback-info',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

// ── Types ──────────────────────────────────────────────────────────────────────

type StatVariantProps = VariantProps<typeof statVariants>;

/** @public */
export interface StatProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>, StatVariantProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}

/**
 * Headline metric — large value, uppercase caption label, optional sub-line.
 */
export const Stat = React.forwardRef<HTMLDivElement, StatProps>(function Stat(
  { label, value, sub, tone, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-tone={tone ?? 'neutral'}
      className={cn('flex flex-col gap-0.5', className)}
      {...props}
    >
      <p className={statVariants({ tone })}>{value}</p>
      <p className="m-0 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      {sub && <p className="m-0 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
});

/** @internal — CVA variant helper; compose via Stat props instead. */
export { statVariants };
