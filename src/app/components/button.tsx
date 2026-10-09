// motion-ok: motion delivered via Tailwind transition-[colors,filter] (colours + the tone hover:brightness filter); the pressed overlay is a token-bound inset shadow that snaps on :active; gate accepts only hds.duration refs
/**
 * @category Actions
 * @tier primitive
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=28-138
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
 *
 * Toggled on (`pressed`, hds#393) is a different state from that momentary
 * wash: `data-pressed="true"` fills with `role.accent` and its foreground,
 * the on-state a toggle needs, so it reads as on at rest, not only mid-click.
 * Only toggle buttons get these classes, so every other Button renders the
 * same markup as before.
 */
// Disabled treatment lives on the BASE string, not per-variant: it is ONE
// uniform neutral state (muted surface + content-disabled text) for every
// variant AND tone, the no-opacity-multiplier contract (DESIGN.md). Keeping it
// here — not on a variant — is also what the tone-over-variant contract
// requires: a `disabled:` class on a variant would become a "must-replace"
// class every tone would have to drop. bg-muted/content-disabled are neutral,
// NOT component-button-primary-*Disabled, which resolve to accentSubtle +
// content-onAccent and render near-white-on-near-white under this brand's
// neutral accent (hds#559 token fix).
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- compound transition list (no single utility for transition-[colors,filter]), the 9999px inset-shadow pressed wash, and content-disabled (no named utility; var()-based, token-driven)
const buttonVariants = /* @__PURE__ */ cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md transition-[colors,filter] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:bg-muted disabled:text-[var(--semantic-color-content-disabled)] active:inset-shadow-[0_0_0_9999px] active:inset-shadow-pressed-overlay/5 [&_svg]:pointer-events-none [&_svg]:shrink-0',
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
      // A tone sets its own bg/text. When disabled, the base string's
      // `disabled:bg-muted` / `disabled:text-…` win via the `:disabled`
      // pseudo-class (higher specificity than the tone's unmodified color), so
      // a disabled toned button reads neutral-disabled WITHOUT the tone needing
      // its own disabled classes — which would break the tone-over-variant
      // contract. So tones stay color-only here.
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
        sm: 'h-8 px-3 hds-type-caption [&_svg]:size-3.5',
        md: 'h-10 px-4 py-2 hds-type-ui [&_svg]:size-4',
        lg: 'h-12 px-6 hds-type-ui [&_svg]:size-5',
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

// On-state fills with the accent surface (`role.primary`), not `bg-accent`: that
// role maps to accentSubtle, which is within 1 step of the secondary variant's
// background, so a pressed toggle looked the same as an unpressed one (hds#522).
const toggleOnClasses =
  'data-[pressed=true]:border-transparent data-[pressed=true]:bg-primary data-[pressed=true]:text-primary-foreground data-[pressed=true]:hover:bg-primary/90';

// ── Types ──────────────────────────────────────────────────────────────────────

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

/** @public */
export interface ButtonProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>,
    Omit<ButtonVariantProps, 'iconOnly'> {
  /** Visual treatment: `primary`, `secondary` or `tertiary`. Defaults to `secondary` (an outline), so pass `primary` for the main action. */
  variant?: ButtonVariantProps['variant'];
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
  /** Render a square icon-only control; `label` becomes its aria-label. */
  iconOnly?: boolean;
  /** Disable interaction. Mirrors the native HTML attribute. */
  disabled?: boolean;
  /** Make it a toggle button (aria-pressed), controlled. */
  pressed?: boolean;
  /** Initial toggle state when `pressed` is not set. */
  defaultPressed?: boolean;
  /** Called with the next pressed state on click. */
  onPressedChange?: (pressed: boolean) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

// Warn once per module load: `iconOnly` renders only `iconLeft` (iconRight is
// hidden), so an icon-only Button without one is an empty square. Not
// `warnOnce` from lib/deprecation: that prefixes `[HDS deprecation]`, and this
// is a misuse, not a deprecation.
let warnedIconOnlyWithoutIcon = false;
// Warn once per module load: iconOnly hides the label text, so without label,
// aria-label, aria-labelledby or title the button has no accessible name.
let warnedIconOnlyWithoutName = false;

/**
 * Triggers an action when activated.
 * @usage Trigger an action (submit, save, open a dialog) with a text label and optional icons; for an icon-only control pass iconOnly with iconLeft and label; for an on/off toggle pass pressed.
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
      pressed: pressedProp,
      defaultPressed,
      onPressedChange,
      onClick,
      ...props
    },
    ref,
  ) {
    const isDisabled = disabled || loading;
    const content = children ?? label;

    // A toggle (hds#393): any of the three pressed props makes this a toggle
    // button; `pressed` controls it, otherwise it keeps its own state. The
    // state goes out as aria-pressed and data-pressed (data-state is loading's).
    const isToggle =
      pressedProp !== undefined || defaultPressed !== undefined || onPressedChange !== undefined;
    const [ownPressed, setOwnPressed] = React.useState(defaultPressed ?? false);
    const isPressed = pressedProp ?? ownPressed;
    const toggleProps = isToggle
      ? {
          'aria-pressed': isPressed,
          'data-pressed': isPressed ? 'true' : 'false',
          onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
            onClick?.(event);
            if (event.defaultPrevented) return;
            if (pressedProp === undefined) setOwnPressed(!isPressed);
            onPressedChange?.(!isPressed);
          },
        }
      : { onClick };
    // A status tone owns the fill, text and border whether or not a toggle is
    // on (ADR-030). The on-state classes carry a `data-[pressed=true]:` variant,
    // so tailwind-merge cannot fold them into the tone's plain classes, and
    // their attribute selector would outrank the tone on specificity; a toned
    // toggle therefore leaves them out, which renders what the old `!` tone
    // did (its important declarations hid them). aria-pressed still reports it.
    const hasStatusTone = tone != null && tone !== 'neutral';
    const classes = cn(
      buttonVariants({ variant, tone, size, iconOnly }),
      isToggle && !hasStatusTone && toggleOnClasses,
      className,
    );

    if (asChild) {
      // A slotted element (e.g. an <a>) can't carry the native `disabled`
      // attribute, so `disabled:` utilities never fire and the link stays
      // clickable + undimmed. Enforce the disabled contract here: block pointer
      // events, drop it from the tab order, and dim it to match the real button.
      return (
        <Slot
          ref={ref as React.Ref<HTMLElement>}
          className={cn(
            classes,
            isDisabled && 'pointer-events-none text-[var(--semantic-color-content-disabled)]',
          )}
          aria-disabled={isDisabled || undefined}
          aria-busy={loading || undefined}
          tabIndex={isDisabled ? -1 : undefined}
          data-state={loading ? 'loading' : undefined}
          data-variant={variant ?? undefined}
          data-tone={tone ?? undefined}
          data-size={size ?? undefined}
          {...(toggleProps as React.HTMLAttributes<HTMLElement>)}
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

    if (
      iconOnly &&
      !label &&
      !props['aria-label'] &&
      !props['aria-labelledby'] &&
      !props.title &&
      !warnedIconOnlyWithoutName &&
      isDevelopment()
    ) {
      warnedIconOnlyWithoutName = true;
      console.warn(
        '[Button] iconOnly hides the label text, so the button has no accessible name; pass label (or aria-label / aria-labelledby).',
      );
    }

    // iconOnly hides the label text, so the label becomes the name instead.
    // Spread only when set, so an aria-label from props keeps its old position.
    const nameProps = iconOnly && label ? { 'aria-label': label } : {};

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...nameProps}
        data-state={loading ? 'loading' : undefined}
        data-variant={variant ?? undefined}
        data-tone={tone ?? undefined}
        data-size={size ?? undefined}
        className={classes}
        {...toggleProps}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : iconLeft}
        {!iconOnly && content}
        {!loading && !iconOnly && iconRight}
      </button>
    );
  },
);
