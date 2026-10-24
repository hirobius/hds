// motion-ok: motion delivered via a Tailwind transition list (colours, the tone hover:brightness filter, and the C2 hard-edge translate + box-shadow) on the productive motion token; gate accepts only hds.duration refs
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
import { installWipeListeners } from './button-wipe';

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
 * Secondary is the exception (hds#595): its pressed state is a solid fill bound to
 * `component.button.secondary.bg.pressed` (`active:bg-…`), and `active:inset-shadow-transparent`
 * swaps the wash colour out so nothing stacks on it. A tone restores the wash colour
 * and its own `active:bg-…`, so a toned secondary presses exactly as before. A tone
 * also sets `disabled:border-transparent`, replacing secondary's disabled border
 * (`component.button.secondary.border.disabled`, lighter than the rest border).
 * Primary hover binds `component.button.bgHover` and pressed binds
 * `component.button.bgPressed` (a solid fill, wash swapped out like secondary):
 * the wash on the hover fill sat 1/255 off hover in dark (hds#748).
 *
 * Toggled on (`pressed`, hds#393) is a different state from that momentary
 * wash: `data-pressed="true"` fills with `role.accent` and its foreground,
 * the on-state a toggle needs, so it reads as on at rest, not only mid-click.
 * Only toggle buttons get these classes, so every other Button renders the
 * same markup as before.
 */
// Disabled treatment lives on the BASE string, not per-variant: it is ONE
// uniform neutral state for every variant AND tone, the no-opacity-multiplier
// contract (DESIGN.md). It binds the component's own
// `component.button.primary.{bgDisabled,textDisabled}` tokens (muted surface +
// content-disabled; repointed from accentSubtle + onAccent in hds#559, which
// rendered near-white-on-near-white under the neutral accent). Keeping it here,
// not on a variant, is what the tone-over-variant contract requires: a
// `disabled:` class on a variant would become a "must-replace" class every tone
// would have to drop.
// Icon sizes bind `component.button.size.<s>.iconSize` so code cannot drift from the token (hds#539).
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- compound transition list (no single utility for transition-[colors,filter]), the 9999px inset-shadow pressed wash, and content-disabled (no named utility; var()-based, token-driven)
const buttonVariants = /* @__PURE__ */ cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md transition-[color,background-color,border-color,filter,box-shadow,translate] duration-[var(--hds-motion-productive-duration)] ease-[var(--hds-motion-productive-easing)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:bg-[var(--component-button-primary-bgDisabled)] disabled:text-[var(--component-button-primary-textDisabled)] active:inset-shadow-[0_0_0_9999px] active:inset-shadow-pressed-overlay/5 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground hover:bg-[color:var(--component-button-bgHover)] active:bg-[color:var(--component-button-bgPressed)] active:inset-shadow-transparent',
        // Soft (tonal) fill, no border (hds#891): component.button.secondary.bg.*. Its 3:1 edge
        // against the page is the hard shadow (shadow="hard", the default).
        secondary:
          'bg-[color:var(--component-button-secondary-bg-rest)] text-foreground hover:bg-[color:var(--component-button-secondary-bg-hover)] active:bg-[color:var(--component-button-secondary-bg-pressed)] active:inset-shadow-transparent',
        // Ghost (C2): transparent at rest, no edge and no movement (shadow is forced off
        // below); component.button.tertiary.bg.hover (surface.hover) on hover and the
        // deeper .pressed (surface.soft) on press, wash swapped out like secondary.
        tertiary:
          'text-foreground hover:bg-[color:var(--component-button-tertiary-bg-hover)] active:bg-[color:var(--component-button-tertiary-bg-pressed)] active:inset-shadow-transparent',
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
          'border-transparent bg-feedback-bg-danger text-feedback-danger hover:bg-feedback-bg-danger hover:border-transparent hover:brightness-95 dark:hover:brightness-110 active:bg-feedback-bg-danger active:inset-shadow-pressed-overlay/5 disabled:border-transparent',
        success:
          'border-transparent bg-feedback-bg-success text-feedback-success hover:bg-feedback-bg-success hover:border-transparent hover:brightness-95 dark:hover:brightness-110 active:bg-feedback-bg-success active:inset-shadow-pressed-overlay/5 disabled:border-transparent',
        warning:
          'border-transparent bg-feedback-bg-warning text-feedback-warning hover:bg-feedback-bg-warning hover:border-transparent hover:brightness-95 dark:hover:brightness-110 active:bg-feedback-bg-warning active:inset-shadow-pressed-overlay/5 disabled:border-transparent',
        info: 'border-transparent bg-feedback-bg-info text-feedback-info hover:bg-feedback-bg-info hover:border-transparent hover:brightness-95 dark:hover:brightness-110 active:bg-feedback-bg-info active:inset-shadow-pressed-overlay/5 disabled:border-transparent',
      },
      size: {
        sm: 'h-8 px-3 hds-type-caption [&_svg]:size-[var(--component-button-size-sm-iconSize)]',
        md: 'h-10 px-4 py-2 hds-type-ui [&_svg]:size-[var(--component-button-size-md-iconSize)]',
        lg: 'h-12 px-6 hds-type-ui [&_svg]:size-[var(--component-button-size-lg-iconSize)]',
      },
      iconOnly: {
        true: 'p-0',
        false: '',
      },
      // Hover fill. `wipe` (the default since hds#888): the variant's own hover fill
      // (see the compoundVariants) is drawn by the `.hds-btn-wipe` layer in theme.css
      // and wipes across from the edge the pointer crosses; the instant hover fill is
      // swapped out here. `none` opts out: the fill changes in place.
      hoverEffect: {
        none: '',
        wipe: 'hds-btn-wipe relative isolate overflow-hidden',
      },
      // Hard (zero-blur) edge, theme.css `.hds-btn-hard` (hds#888, C2 fixed base): the face
      // lifts 1px on hover and sinks 2px on press while the edge under it grows or shrinks
      // by the same amount. `none` opts out. Tertiary (ghost) never takes it.
      shadow: {
        hard: 'hds-btn-hard',
        none: '',
      },
    },
    compoundVariants: [
      // wipe x variant (neutral tone only): hold the rest fill on hover; theme.css
      // `.hds-btn-wipe` paints the variant's hover fill as the wiping layer. A status
      // tone keeps its own hover classes, and the layer takes the tone fill plus its
      // hover brightness (theme.css). Tertiary rests transparent and keeps its
      // own pressed fill (the layer hides on :active so the press shows).
      { hoverEffect: 'wipe', tone: 'neutral', variant: 'primary', className: 'hover:bg-primary' },
      {
        hoverEffect: 'wipe',
        tone: 'neutral',
        variant: 'secondary',
        className: 'hover:bg-[color:var(--component-button-secondary-bg-rest)]',
      },
      {
        hoverEffect: 'wipe',
        tone: 'neutral',
        variant: 'tertiary',
        className: 'hover:bg-transparent',
      },
      { iconOnly: true, size: 'sm', className: 'w-8' },
      { iconOnly: true, size: 'md', className: 'w-10' },
      { iconOnly: true, size: 'lg', className: 'w-12' },
    ],
    defaultVariants: {
      variant: 'secondary',
      tone: 'neutral',
      size: 'md',
      iconOnly: false,
      hoverEffect: 'wipe',
      shadow: 'hard',
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
    Omit<ButtonVariantProps, 'iconOnly' | 'hoverEffect' | 'shadow'> {
  /** Visual treatment: `primary`, `secondary` or `tertiary`. Defaults to `secondary` (a soft tonal fill), so pass `primary` for the main action. */
  variant?: ButtonVariantProps['variant'];
  /** `wipe` (default) slides the hover fill in from the pointer's edge; `none` changes it in place. */
  hoverEffect?: 'none' | 'wipe';
  /** `hard` (default) draws the zero-blur shadow on primary and secondary; `none` opts out. Tertiary never has one. Its colour is the button's own fill stepped darker (`--hds-btn-edge` overrides it). */
  shadow?: 'hard' | 'none';
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
 * @usage Run an action, such as submit, save or open a dialog. For an icon-only control pass iconOnly, iconLeft and label; for an on/off toggle pass pressed.
 * @whenNot Navigating to another page, where a link is the correct element.
 * @useInstead InlineLink navigation to another page
 * @a11y component required a11y:button.keyboard-activate Enter and Space activate it, and it takes part in the Tab order.
 * @a11y component required a11y:button.focus-ring Keyboard focus draws a visible ring from the focus-visible utilities; the outline is never removed without it.
 * @a11y component required a11y:button.loading-busy loading sets aria-busy and disables the button, and the spinner is hidden from assistive technology.
 * @a11y component required a11y:button.toggle-pressed A toggle button reports its state with aria-pressed and flips it on activation.
 * @a11y component required a11y:button.aschild-disabled A disabled asChild link is aria-disabled and leaves the tab order, since a link cannot be natively disabled.
 * @a11y component required a11y:button.icon-only-name An icon-only button takes its accessible name from label (as aria-label).
 * @a11y component required a11y:button.target-size Every size is at least 24px tall, and an icon-only button at least 24px wide (WCAG 2.5.8).
 * @a11y component required a11y:button.reduced-motion The loading spinner stops under prefers-reduced-motion.
 * @a11y consumer required Give an icon-only Button a label (or aria-label); without one it has no accessible name.
 * @a11y consumer required Use Button for actions and a link for navigation; do not put a click handler on a link-styled button to change page.
 */
export const Button = /* @__PURE__ */ React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant,
      tone,
      size,
      iconOnly = false,
      hoverEffect = 'wipe',
      shadow = 'hard',
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
      style,
      ...props
    },
    ref,
  ) {
    const isDisabled = disabled || loading;
    const wipe = hoverEffect === 'wipe';
    React.useEffect(() => {
      if (wipe) installWipeListeners();
    }, [wipe]);
    // The wipe layer's fill (theme.css `.hds-btn-wipe`) is the variant's own hover fill:
    // a status tone's fill through its hover brightness (--hds-wipe-f), primary's
    // component.button.bgHover, secondary's component.button.secondary.bg.hover, or
    // tertiary's component.button.tertiary.bg.hover; a pressed neutral toggle paints
    // bg-primary, so it takes primary's hover fill. Inline, so the shipped CSS has no
    // per-variant rules; a consumer `style` still wins.
    // A toggle (hds#393): any of the three pressed props makes this a toggle
    // button; `pressed` controls it, otherwise it keeps its own state. The
    // state goes out as aria-pressed and data-pressed (data-state is loading's).
    const isToggle =
      pressedProp !== undefined || defaultPressed !== undefined || onPressedChange !== undefined;
    const [ownPressed, setOwnPressed] = React.useState(defaultPressed ?? false);
    const isPressed = pressedProp ?? ownPressed;
    const hasTone = tone != null && tone !== 'neutral';
    // The hard shadow's colour (theme.css `.hds-btn-hard`, hds#897): the fill it sits under,
    // stepped darker and precomputed as --hds-edge-<key>; the keys are the tone names plus
    // primary and secondary (a pressed neutral toggle paints bg-primary, so it takes primary's
    // edge). --hds-btn-edge still overrides.
    const edgeKey = hasTone
      ? tone
      : variant === 'primary' || (isToggle && isPressed)
        ? 'primary'
        : 'secondary';
    const edge =
      shadow === 'hard' && variant !== 'tertiary'
        ? { '--hds-edge': `var(--hds-edge-${edgeKey})` }
        : null;
    const wipeProps = wipe
      ? {
          'data-hover-effect': 'wipe',
          style: {
            ...edge,
            '--hds-wipe-fill': hasTone
              ? `var(--semantic-color-feedback-bg-${tone === 'danger' ? 'error' : tone})`
              : edgeKey === 'primary'
                ? 'var(--component-button-bgHover)'
                : variant === 'tertiary'
                  ? 'var(--component-button-tertiary-bg-hover)'
                  : 'var(--component-button-secondary-bg-hover)',
            ...(hasTone && {
              filter: 'none',
              '--hds-wipe-f': 'brightness(var(--hds-wipe-b, 0.95))',
            }),
            ...style,
          } as React.CSSProperties,
        }
      : { style: edge ? ({ ...edge, ...style } as React.CSSProperties) : style };
    const content = children ?? label;

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
    const classes = cn(
      buttonVariants({
        variant,
        tone,
        size,
        iconOnly,
        hoverEffect,
        shadow: variant === 'tertiary' ? 'none' : shadow,
      }),
      isToggle && !hasTone && toggleOnClasses,
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
          {...wipeProps}
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

    // `label` is the accessible name whenever it is given (iconOnly hides the text; with children it
    // overrides them). Spread only when set, so an aria-label from props keeps its old position.
    // When label is the only content it already is the name, so no redundant aria-label.
    const nameProps = label && (iconOnly || children != null) ? { 'aria-label': label } : {};

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
        {...wipeProps}
        className={classes}
        {...toggleProps}
        {...props}
      >
        {loading ? (
          <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          iconLeft
        )}
        {!iconOnly && content}
        {!loading && !iconOnly && iconRight}
      </button>
    );
  },
);
