/**
 * ToggleButton — a two-state (on/off) pressable button on Radix Toggle.
 * @category Actions
 * @tier primitive
 *
 * Radix Toggle (@radix-ui/react-toggle) themed as a button-shaped control with
 * a native aria-pressed contract, keyboard support, and data-[state=on] active
 * styling. Use for a single independent toggle (bold, mute, pin); for a set of
 * mutually-related toggles reach for the segmented control instead.
 *
 *   <ToggleButton aria-label="Bold" pressed={bold} onPressedChange={setBold}>
 *     <Bold />
 *   </ToggleButton>
 */
// motion-ok: Radix Toggle owns the pressed-state contract; transition-colors carries the on/off feedback.

import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────

const hdsToggleButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors hds-focus disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        secondary:
          'border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        sm: 'h-8 px-3 text-xs [&_svg]:size-3.5',
        md: 'h-10 px-4 text-sm [&_svg]:size-4',
        lg: 'h-12 px-6 text-base [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

type ToggleButtonVariantProps = VariantProps<typeof hdsToggleButtonVariants>;

/** @public */
export interface ToggleButtonProps
  extends React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root>, ToggleButtonVariantProps {}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * A single two-state toggle button exposing a native `aria-pressed` contract —
 * use for one independent on/off control such as bold, mute, or pin.
 */
export const ToggleButton = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  ToggleButtonProps
>(function ToggleButton({ className, variant, size, ...props }, ref) {
  return (
    <TogglePrimitive.Root
      ref={ref}
      data-variant={variant ?? 'secondary'}
      className={cn(hdsToggleButtonVariants({ variant, size }), className)}
      {...props}
    />
  );
});

/** @internal — CVA variant helper; compose via ToggleButton props instead. */
export { hdsToggleButtonVariants };
