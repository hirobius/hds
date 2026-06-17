/**
 * @category Display
 * @tier primitive
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

const VALUE_TONE = {
  default: 'text-foreground',
  success: 'text-[var(--semantic-color-feedback-success)]',
  warning: 'text-[var(--semantic-color-feedback-warning)]',
  danger:  'text-[var(--semantic-color-feedback-error)]',
} as const;

export type FieldTone = keyof typeof VALUE_TONE;

/** @public */
export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value?: React.ReactNode;
  tone?: FieldTone;
  mono?: boolean;
  children?: React.ReactNode;
}

/**
 * Caption label paired with a value — used in metadata grids and read-only forms.
 */
export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  function Field({ label, value, tone = 'default', mono = false, className, children, ...props }, ref) {
    const body = children ?? value;
    return (
      <div ref={ref} className={cn('flex flex-col gap-1', className)} {...props}>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        {body !== undefined && body !== null && (
          <span className={cn('text-sm', mono && 'font-mono text-xs', VALUE_TONE[tone])}>{body}</span>
        )}
      </div>
    );
  },
);
