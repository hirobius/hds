// motion-ok: motion delivered via Tailwind transition-[colors,filter] (colours + the tone hover:brightness filter); the pressed overlay is a token-bound inset shadow that snaps on :active; gate accepts only hds.duration refs
/**
 * @category Actions
 * @tier primitive
 * @figma https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=28-138
 * @figma Variant=Button/Variant
 * @figma Size=Button/Size
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { isDevelopment } from '../../lib/env';

// ── Variants ───────────────────────────────────────────────────────────────────

/**
 * Pressed state (hds#322): an inset box-shadow wash bound to
 * `role.pressed-overlay` (`semantic.color.state.pressed.overlay`: black in
 * light, white in dark; the 5% alpha lives in the class, like `bg-scrim/60`),
 * not the brightness filter it replaces (95% in light, 110% in dark), which
 * had no token behind it and no Figma equivalent. Why an inset shadow and not
 * a pseudo-element: Tailwind v4 composes `--tw-inset-shadow` with the
 * `focus-visible:ring-*` and any consumer `shadow-*` into one `box-shadow`
 * list, so the focus ring, an outer shadow and the press wash all render at
 * once with no `relative`/`after:` classes and no extra DOM; the
 * `inset-shadow-[0_0_0_9999px]` spread fills the padding box, so it works on
 * a transparent tertiary fill and respects the radius. `disabled:pointer-events-none`
 * keeps a disabled control from ever matching `:active`. The wash snaps on
 * and off (`transition-[colors,filter]` is unchanged: the tone variants still
 * hover through the brightness filter), which is also how the Figma Pressed
 * variant behaves. Without `color-mix()` support the fallback is the opaque
 * token, the same fallback Tailwind emits for `bg-scrim/60`.
 */
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- compound transition list (Tailwind has no single utility for transition-[colors,filter]) and the 9999px inset-shadow spread that fills the padding box for the pressed wash
const buttonVariants = /* @__PURE__ */ cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[colors,filter] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:inset-shadow-[0_0_0_9999px] active:inset-shadow-pressed-overlay/5 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary:
          'border border-input bg-background text-foreground hover:bg-accent hover:border-ring',
        tertiary: 'text-foreground hover:bg-accent',
      },
      // Semantic action color. `neutral` (default) keeps the variant's own
      // colors; the status tones apply a token-driven tonal fill (tinted
      // surface + matching feedback text) that clears AA in BOTH light and dark
      // because the fg/bg feedback token pair flips together per theme. Tone
      // beats variant by tailwind-merge class-group replacement (ADR-030): cva
      // emits tone classes after variant classes and the output is only ever
      // rendered through `cn`, so each tone class replaces the variant class in
      // its group. That holds only if a tone sets EVERY group a variant sets,
      // hover fill and hover border included; a group the tone leaves out
      // leaks the variant's class through (the reason the hover pair is here).
      // A consumer `className` comes last and overrides tone the same way.
      // Drives the destructive/status actions consumers previously kept on MUI.
      tone: {
        neutral: '',
        danger:
          'border-transparent bg-feedback-bg-danger text-feedback-danger hover:bg-feedback-bg-danger hover:border-transparent hover:brightness-95 dark:hover:brightness-110',
        success:
          'border-transparent bg-feedback-bg-success text-feedback-success hover:bg-feedback-bg-success hover:border-transparent hover:brightness-95 dark:hover:brightness-110',
        warning:
          'border-transparent bg-feedback-bg-warning text-feedback-warning hover:bg-feedback-bg-warning hover:border-transparent hover:brightness-95 dark:hover:brightness-110',
        info: 'border-transparent bg-feedback-bg-info text-feedback-info hover:bg-feedback-bg-info hover:border-transparent hover:brightness-95 dark:hover:brightness-110',
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
      tone: 'neutral',
      size: 'md',
      iconOnly: false,
    },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

/** @public */
export interface ButtonProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>,
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
}

// ── Component ──────────────────────────────────────────────────────────────────

// Warn once per module load: `iconOnly` renders only `iconLeft` (iconRight is
// hidden), so an icon-only Button without one is an empty square. Not
// `warnOnce` from lib/deprecation: that prefixes `[HDS deprecation]`, and this
// is a misuse, not a deprecation.
let warnedIconOnlyWithoutIcon = false;

/**
 * Triggers an action when activated.
 * @usage Trigger an action (submit, save, open a dialog) with a text label and optional icons; for an icon-only control pass iconOnly with iconLeft.
 * @whenNot Navigating to another page, where a link is the correct element.
 * @useInstead InlineLink navigation to another page
 */
export const Button = /* @__PURE__ */ React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant,
      tone,
      size,
      iconOnly = false,
      asChild = false,
      label,
      loading = false,
      iconLeft,
      iconRight,
      disabled,
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
          className={cn(buttonVariants({ variant, tone, size, iconOnly, className }))}
          aria-disabled={isDisabled || undefined}
          aria-busy={loading || undefined}
          data-state={loading ? 'loading' : undefined}
          data-variant={variant ?? undefined}
          data-tone={tone ?? undefined}
          data-size={size ?? undefined}
          {...(props as React.HTMLAttributes<HTMLElement>)}
        >
          {children as React.ReactElement}
        </Slot>
      );
    }

    if (iconOnly && !iconLeft && !loading && !warnedIconOnlyWithoutIcon && isDevelopment()) {
      warnedIconOnlyWithoutIcon = true;
      console.warn(
        '[Button] iconOnly renders only iconLeft; pass iconLeft (iconRight is hidden in iconOnly mode).',
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
        data-tone={tone ?? undefined}
        data-size={size ?? undefined}
        className={cn(buttonVariants({ variant, tone, size, iconOnly, className }))}
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
