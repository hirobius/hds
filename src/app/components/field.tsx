/**
 * @category Display
 * @tier primitive
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// Non-interactive — no hover/active/focus states. Tone drives only the value
// color; the label stays muted regardless. Renamed the pre-contract 'default'
// value to the fixed vocabulary's 'neutral' (#60 — check-prop-vocabulary rule C).
const fieldValueVariants = cva('text-sm', {
  variants: {
    tone: {
      neutral: 'text-foreground',
      success: 'text-feedback-success',
      warning: 'text-feedback-warning',
      danger: 'text-feedback-danger',
      info: 'text-feedback-info',
    },
    mono: {
      true: 'font-mono text-xs',
      false: '',
    },
  },
  defaultVariants: { tone: 'neutral', mono: false },
});

// ── Types ──────────────────────────────────────────────────────────────────────

type FieldValueVariantProps = VariantProps<typeof fieldValueVariants>;

/** @public */
export interface FieldProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>, FieldValueVariantProps {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Caption label paired with a value — used in metadata grids and read-only forms.
 */
export const Field = React.forwardRef<HTMLDivElement, FieldProps>(function Field(
  { label, value, tone, mono, className, children, ...props },
  ref,
) {
  const body = children ?? value;
  return (
    <div
      ref={ref}
      data-tone={tone ?? 'neutral'}
      className={cn('flex flex-col gap-1', className)}
      {...props}
    >
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      {body !== undefined && body !== null && (
        <span className={fieldValueVariants({ tone, mono })}>{body}</span>
      )}
    </div>
  );
});

/** @internal — CVA variant helper; compose via Field props instead. */
export { fieldValueVariants };
