/**
 * @category Display
 * @tier primitive
 * @figma https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=88-247
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// Non-interactive — no hover/active/focus states. Tone drives only the value
// color; label/sub stay muted regardless. Renamed the pre-contract 'default'
// value to the fixed vocabulary's 'neutral' (#60 — check-prop-vocabulary rule C).
const statVariants = /* @__PURE__ */ cva('m-0 hds-type-title', {
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
 * Headline metric — large value, caption label, optional sub-line.
 * @usage Show one standalone headline figure with its label and an optional sub-line.
 * @whenNot A figure inside a Card, or a status with a trailing badge.
 * @useInstead Card.Metric a figure inside a Card (hds#254 folds Stat into the Card slot)
 * @useInstead StatusTile a titled status with notes and a trailing badge
 */
export const Stat = /* @__PURE__ */ React.forwardRef<HTMLDivElement, StatProps>(function Stat(
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
      <p className="m-0 hds-type-caption text-muted-foreground">{label}</p>
      {sub && <p className="m-0 hds-type-caption text-muted-foreground">{sub}</p>}
    </div>
  );
});
