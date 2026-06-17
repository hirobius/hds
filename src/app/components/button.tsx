// motion-ok: motion delivered via Tailwind transition-[colors,filter] + active:brightness; gate accepts only hds.duration refs
/**
 * @category Actions
 * @tier primitive
 * @figma Variant=Button/Variant
 * @figma Size=Button/Size
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- compound transition list; Tailwind has no single utility for transition-[colors,filter]
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[colors,filter] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:brightness-95 dark:active:brightness-110 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'border border-input bg-background text-foreground hover:bg-accent hover:border-ring',
        tertiary: 'text-foreground hover:bg-accent',
      },
      size: {
        sm: 'h-8 px-3 text-xs [&_svg]:size-3.5',
        md: 'h-10 px-4 py-2 text-sm [&_svg]:size-4',
        lg: 'h-12 px-6 text-base [&_svg]:size-5',
      },
      iconOnly: {
        true: 'p-0',
        false: '',
      },
    },
    compoundVariants: [
      { iconOnly: true, size: 'sm', className: 'w-8' },
      { iconOnly: true, size: 'md', className: 'w-10' },
      { iconOnly: true, size: 'lg', className: 'w-12' },
    ],
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
      iconOnly: false,
    },
  }
);

// ── Types ──────────────────────────────────────────────────────────────────────

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

/** @public */
export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>,
    Omit<ButtonVariantProps, 'iconOnly'> {
  /** Render the button chrome onto a single child element for link semantics. */
  asChild?: boolean;
  /** Optional accessible label used when children are not suitable as the name. */
  label?: string;
  /** Show a busy indicator and disable interaction. */
  loading?: boolean;
  /** Leading icon rendered before the label. */
  iconLeft?: React.ReactNode;
  /** Trailing icon rendered after the label. */
  iconRight?: React.ReactNode;
  /** Render the button as a square icon-only control. Requires aria-label. */
  iconOnly?: boolean;
  /** Disable interaction. Mirrors the native HTML attribute. */
  disabled?: boolean;
  /** @deprecated CSS vars are theme-aware. Retained for backward compatibility. */
  isDark?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Triggers an action when activated.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant,
      size,
      iconOnly = false,
      asChild = false,
      label,
      loading = false,
      iconLeft,
      iconRight,
      disabled,
      isDark: _isDark,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) {
    const isDisabled = disabled || loading;
    const content = children ?? label;

    if (asChild) {
      return (
        <Slot
          ref={ref as React.Ref<HTMLElement>}
          className={cn(buttonVariants({ variant, size, iconOnly, className }))}
          aria-disabled={isDisabled || undefined}
          aria-busy={loading || undefined}
          data-state={loading ? 'loading' : undefined}
          data-variant={variant ?? undefined}
          data-size={size ?? undefined}
          {...(props as React.HTMLAttributes<HTMLElement>)}
        >
          {children as React.ReactElement}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        data-state={loading ? 'loading' : undefined}
        data-variant={variant ?? undefined}
        data-size={size ?? undefined}
        className={cn(buttonVariants({ variant, size, iconOnly, className }))}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : iconLeft}
        {!iconOnly && content}
        {!loading && !iconOnly && iconRight}
      </button>
    );
  },
);

/** @internal — CVA variant helper; compose via Button props instead. */
export { buttonVariants };
