/**
 * Spinner - indeterminate loading indicator.
 * @category Feedback
 * @tier primitive
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// A rotating ring drawn with `border-current` (inherits text color) and one
// transparent edge. `motion-reduce:animate-none` honors prefers-reduced-motion.
// Sizes map to standard Tailwind sizing utilities (no arbitrary values).
const spinnerVariants = cva(
  'inline-block shrink-0 animate-spin rounded-full border-solid border-current border-t-transparent align-middle motion-reduce:animate-none',
  {
    variants: {
      size: {
        sm: 'h-4 w-4 border-2',
        md: 'h-6 w-6 border-2',
        lg: 'h-8 w-8 border-2',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

type SpinnerVariantProps = VariantProps<typeof spinnerVariants>;

/** @public */
export interface SpinnerProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    SpinnerVariantProps {
  /** Accessible label announced to assistive tech. Defaults to "Loading". */
  label?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Indeterminate spinner. Inherits the surrounding text color via currentColor. */
export const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(function Spinner(
  { className, size, label = 'Loading', ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      role="status"
      aria-label={label}
      data-size={size ?? 'md'}
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    />
  );
});

/** @internal — CVA variant helper; compose via Spinner props instead. */
export { spinnerVariants };
