/**
 * Kbd — inline keyboard key / shortcut hint rendered as a native <kbd>.
 * @category Display
 * @tier primitive
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// One styling axis (size). Chrome is a muted key cap on the neutral surface —
// no second hue, font-medium (never bold), all spacing on the 8px grid.
const kbdVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap align-middle select-none rounded border border-border bg-muted font-medium text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'h-5 min-w-5 px-1 text-xs',
        md: 'h-6 min-w-6 px-1.5 text-xs',
        lg: 'h-7 min-w-7 px-2 text-sm',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

type KbdVariantProps = VariantProps<typeof kbdVariants>;

/** @public */
export interface KbdProps extends React.HTMLAttributes<HTMLElement>, KbdVariantProps {}

// ── Component ──────────────────────────────────────────────────────────────────

/** Renders a keyboard key or shortcut token, e.g. `<Kbd>⌘K</Kbd>`. */
export const Kbd = React.forwardRef<HTMLElement, KbdProps>(function Kbd(
  { className, size, children, ...props },
  ref,
) {
  return (
    <kbd
      ref={ref}
      data-size={size ?? 'md'}
      className={cn(kbdVariants({ size }), className)}
      {...props}
    >
      {children}
    </kbd>
  );
});

/** @internal — CVA variant helper; compose via Kbd props instead. */
export { kbdVariants };
