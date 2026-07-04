/**
 * InputGroup — a text input framed with leading and/or trailing adornments.
 * @category Inputs
 * @tier primitive
 */
// motion-ok: focus ring + color feedback via Tailwind transition-colors (gate accepts only hds.duration refs); mirrors input.tsx

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// The wrapper carries the input chrome (border, surface, focus ring via
// focus-within) and the inner <input> is transparent. Mirrors input.tsx tokens
// so a grouped field is visually identical to a bare one.
const inputGroupVariants = cva(
  'flex items-center gap-2 w-full rounded-md border border-input bg-background px-3 text-foreground ring-offset-background transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 has-[input:disabled]:cursor-not-allowed has-[input:disabled]:bg-muted has-[input:disabled]:opacity-70',
  {
    variants: {
      size: {
        sm: 'h-8 text-xs',
        md: 'h-10 text-sm',
        lg: 'h-12 text-base',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

type InputGroupVariantProps = VariantProps<typeof inputGroupVariants>;

/** @public */
export interface InputGroupProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>, InputGroupVariantProps {
  /** Content rendered before the input, e.g. an icon or a static prefix. */
  leading?: React.ReactNode;
  /** Content rendered after the input, e.g. a unit or a clear button. */
  trailing?: React.ReactNode;
  /** Class applied to the wrapper (the input itself stays transparent). */
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** A single-line input with optional `leading`/`trailing` adornments. */
export const InputGroup = React.forwardRef<HTMLInputElement, InputGroupProps>(function InputGroup(
  { className, size, leading, trailing, disabled, ...props },
  ref,
) {
  return (
    <div data-size={size ?? 'md'} className={cn(inputGroupVariants({ size }), className)}>
      {leading != null && (
        <span className="shrink-0 text-muted-foreground" aria-hidden="true">
          {leading}
        </span>
      )}
      <input
        ref={ref}
        disabled={disabled}
        className="h-full w-full min-w-0 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        {...props}
      />
      {trailing != null && (
        <span className="shrink-0 text-muted-foreground" aria-hidden="true">
          {trailing}
        </span>
      )}
    </div>
  );
});
