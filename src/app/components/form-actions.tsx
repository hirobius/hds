/**
 * FormActions - the footer row of a form: primary right-most, secondary to its left.
 * @category Actions
 * @tier pattern
 */

import * as React from 'react';
import { cn } from '../../lib/utils';
import { Cluster } from './cluster';

/** @public */
export interface FormActionsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The submit action (a primary `Button`). Always last in DOM order and right-most. */
  primary: React.ReactNode;
  /** The cancel or back action, placed immediately left of the primary. */
  secondary?: React.ReactNode;
  /**
   * A destructive action (delete, remove). Placed on the far left, apart from the
   * primary and secondary so a mis-click never lands on it. Never right of the primary.
   */
  destructive?: React.ReactNode;
  /** Pin the row to the bottom of the scroll container. Off by default. */
  sticky?: boolean;
}

/**
 * Form footer with one fixed order: destructive (far left, if any), then secondary,
 * then primary last and right-most. Gap is the tight layout token.
 * @screenPattern
 */
export const FormActions = React.forwardRef<HTMLDivElement, FormActionsProps>(function FormActions(
  { primary, secondary, destructive, sticky = false, className, style, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-hds-component="FormActions"
      data-sticky={sticky ? 'true' : undefined}
      className={cn(sticky && 'border-t border-border bg-background py-3', className)}
      style={sticky ? { position: 'sticky', bottom: 0, ...style } : style}
      {...props}
    >
      <Cluster gap="tight" align="center" justify={destructive ? 'space-between' : 'end'}>
        {destructive ? <div data-slot="destructive">{destructive}</div> : null}
        <Cluster gap="tight" align="center" justify="end">
          {secondary}
          {primary}
        </Cluster>
      </Cluster>
    </div>
  );
});
