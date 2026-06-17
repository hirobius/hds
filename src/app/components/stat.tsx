/**
 * @category Display
 * @tier primitive
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

const TONE_CLASSES = {
  default: 'text-foreground',
  success: 'text-[var(--semantic-color-feedback-success)]',
  warning: 'text-[var(--semantic-color-feedback-warning)]',
  danger:  'text-[var(--semantic-color-feedback-error)]',
} as const;

export type StatTone = keyof typeof TONE_CLASSES;

/** @public */
export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: StatTone;
}

/**
 * Headline metric — large value, uppercase caption label, optional sub-line.
 */
export const Stat = React.forwardRef<HTMLDivElement, StatProps>(
  function Stat({ label, value, sub, tone = 'default', className, ...props }, ref) {
    return (
      <div ref={ref} className={cn('flex flex-col gap-0.5', className)} {...props}>
        <p className={cn('m-0 text-2xl font-medium leading-tight', TONE_CLASSES[tone])}>{value}</p>
        <p className="m-0 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        {sub && <p className="m-0 text-xs text-muted-foreground">{sub}</p>}
      </div>
    );
  },
);
