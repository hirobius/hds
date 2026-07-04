/**
 * Blockquote — quoted passage with an optional attribution.
 * @category Typography
 * @tier primitive
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// A left accent rail + indentation. Emphasis is font-medium (never bold); the
// attribution steps down one level on the same hue via the secondary content
// color rather than a second hue.
const blockquoteVariants = cva('border-l-2 border-border pl-4 font-medium text-foreground', {
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    },
  },
  defaultVariants: { size: 'md' },
});

// ── Types ──────────────────────────────────────────────────────────────────────

type BlockquoteVariantProps = VariantProps<typeof blockquoteVariants>;

/** @public */
export interface BlockquoteProps
  extends React.BlockquoteHTMLAttributes<HTMLQuoteElement>, BlockquoteVariantProps {
  /** Optional attribution rendered beneath the quote (e.g. the author). */
  attribution?: React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** A quoted passage; pass `cite` for the source URL and `attribution` for a byline. */
export const Blockquote = React.forwardRef<HTMLQuoteElement, BlockquoteProps>(function Blockquote(
  { className, size, attribution, children, ...props },
  ref,
) {
  return (
    <blockquote
      ref={ref}
      data-size={size ?? 'md'}
      className={cn(blockquoteVariants({ size }), className)}
      {...props}
    >
      {children}
      {attribution != null && (
        <footer className="mt-2 text-sm font-medium text-muted-foreground">{attribution}</footer>
      )}
    </blockquote>
  );
});

/** @internal — CVA variant helper; compose via Blockquote props instead. */
export { blockquoteVariants };
