/**
 * @category Display
 * @tier primitive
 * @usage Show a labelled read-only value, such as a name and its value in a detail view.
 * @whenNot Editable input, or a single headline figure.
 * @useInstead Input an editable single-line value
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=85-81
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// Non-interactive — no hover/active/focus states. Tone drives only the value
// color; the label stays muted regardless. Renamed the pre-contract 'default'
// value to the fixed vocabulary's 'neutral' (#60 — check-prop-vocabulary rule C).
// min-w-0 + break-words: a long unbroken value (a URL, a hash) wraps inside the column instead of
// widening it past a 390px viewport.
const fieldValueVariants = /* @__PURE__ */ cva('hds-type-ui min-w-0 break-words', {
  variants: {
    tone: {
      neutral: 'text-foreground',
      success: 'text-feedback-success',
      warning: 'text-feedback-warning',
      danger: 'text-feedback-danger',
      info: 'text-feedback-info',
    },
    mono: {
      true: 'hds-type-mono',
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
export const Field = /* @__PURE__ */ React.forwardRef<HTMLDivElement, FieldProps>(function Field(
  { label, value, tone, mono, className, children, ...props },
  ref,
) {
  const body = children ?? value;
  return (
    <div
      ref={ref}
      data-tone={tone ?? 'neutral'}
      className={cn('flex min-w-0 flex-col gap-1', className)}
      {...props}
    >
      <span className="hds-type-caption text-muted-foreground">{label}</span>
      {body !== undefined && body !== null && (
        <span className={fieldValueVariants({ tone, mono })}>{body}</span>
      )}
    </div>
  );
});
