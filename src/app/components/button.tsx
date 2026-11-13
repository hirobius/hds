// Motion: delivered via a Tailwind transition list (colours, the tone hover:brightness filter, and the C2 hard-edge translate + box-shadow) on the productive motion token; gate accepts only hds.duration refs. The toggle label crossfade below is the one motion/react piece, timed through useHdsMotion.
/**
 * @category Actions
 * @tier primitive
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=2399-11077
 * @figma Variant=Button/Variant
 * @figma Size=Button/Size
 */

import * as React from 'react';
import { Slot, Slottable } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2, SquareArrowOutUpRight } from 'lucide-react';
// m + LazyMotion(domAnimation): the crossfade needs only opacity, and the full `motion`
// component costs Button's import about 14 kB gzip more on Motion 14 (hds#751).
import { AnimatePresence, LazyMotion, domAnimation, m, useIsPresent } from 'motion/react';
import { cn } from '../../lib/utils';
import { isDevelopment } from '../../lib/env';
import { warnOncePlain } from '../../lib/deprecation';
import { crossfadeFade, useHdsMotion } from '../hooks/useHdsMotion';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { installWipeListeners } from './button-wipe';
import { NewTabHint, newTabName } from './new-tab-hint';

// ── Variants ───────────────────────────────────────────────────────────────────

// The classes every status tone shares; each tone adds its own fill and text colour (kept as literals so Tailwind sees them).
const TONE_COMMON =
  'border-transparent hover:border-transparent hover:brightness-95 dark:hover:brightness-110 active:inset-shadow-pressed-overlay/5 disabled:border-transparent';

/**
 * Pressed state (hds#322): an inset box-shadow wash bound to
 * `role.pressed-overlay` (`semantic.color.state.pressed.overlay`: black in
 * light, white in dark; the 5% alpha lives in the class, like `bg-scrim/60`),
 * not the brightness filter it replaces (95% in light, 110% in dark), which
 * had no token behind it and no Figma equivalent. Why an inset shadow and not
 * a pseudo-element: Tailwind v4 composes `--tw-inset-shadow` with any
 * consumer `shadow-*` into one `box-shadow` list, and the focus ring is the
 * `.hds-focus` outline, so the ring, an outer shadow and the press wash all
 * render at once with no `relative`/`after:` classes and no extra DOM; the
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
// Icon sizes bind `component.button.size.<s>.iconSize` so code cannot drift from the token (hds#539);
// heights (and the icon-only width) bind `size.<s>.height`, and the label weight binds
// `component.button.fontWeight`, which beats the hds-type-* role's weight (utilities layer, hds#760).
// binding-ok: button.focus.gapRadius drawn by the .hds-focus outline, which follows the button radius (radius + semantic.focus.gap.width); the token is the Figma binding
// binding-ok: button.depth.edge drawn by theme.css .hds-btn-hard (edge height and hit band, hds#1387)
// binding-ok: button.depth.hoverOffset drawn by theme.css .hds-btn-hard:hover (face travel, hds#1387)
// binding-ok: button.depth.pressedOffset drawn by theme.css .hds-btn-hard:active (face travel, hds#1387)
// binding-ok: button.focus.ringRadius drawn by the .hds-focus outline (radius + gap + semantic.focus.ring.width); the token is the Figma binding
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- compound transition list (no single utility for transition-[colors,filter]), the 9999px inset-shadow pressed wash, and content-disabled (no named utility; var()-based, token-driven)
const buttonVariants = /* @__PURE__ */ cva(
  'inline-flex items-center justify-center gap-scale-xs whitespace-nowrap rounded-md [font-weight:var(--component-button-fontWeight)] transition-[color,background-color,border-color,filter,box-shadow,translate] duration-[var(--hds-motion-productive-duration)] ease-[var(--hds-motion-productive-easing)] hds-focus disabled:pointer-events-none disabled:bg-[var(--component-button-primary-bgDisabled)] disabled:text-[var(--component-button-primary-textDisabled)] active:inset-shadow-[0_0_0_9999px] active:inset-shadow-pressed-overlay/5 [&_svg]:pointer-events-none [&_svg]:shrink-0', // type-ramp-ok: component.button.fontWeight (600) is the button's own label weight over its type role (hds#760)
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
        // below); component.button.tertiary.bg.hover (surface.hover) on hover and, in the
        // neutral tone, the deeper .pressed (surface.soft) on press, wash swapped out like
        // secondary (the compoundVariants: quiet keeps the base wash instead). Ghost and
        // link are the one deliberate flat exception (hds#1387): an edge needs a fill to
        // sit under, and a ghost recedes beside the raised actions next to it.
        tertiary: 'text-foreground hover:bg-[color:var(--component-button-tertiary-bg-hover)]',
        // Link-styled (hds#863): underlined text, no fill, no inline padding (the compound
        // below), no hard shadow and no wipe (both forced off in the component). It keeps the
        // size's height, so it stays a full touch target in a row; inside running prose use
        // InlineLink. The pressed wash is swapped out, so nothing fills behind the text.
        link: 'text-foreground underline hover:bg-transparent active:inset-shadow-transparent',
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
        // Quiet (hds#863): a ghost-only tone. On tertiary and link it sets the secondary text
        // colour (role.muted-foreground = content.secondary) for a low-priority action beside
        // a primary one. A quiet tertiary presses with the base 5% wash, not the surface.soft
        // fill: content.secondary on surface.soft is under 4.5:1 in dark. The classes live in
        // the compoundVariants, so a filled variant ignores it.
        quiet: '',
        danger: `bg-feedback-bg-danger text-feedback-danger hover:bg-feedback-bg-danger active:bg-feedback-bg-danger ${TONE_COMMON}`,
        success: `bg-feedback-bg-success text-feedback-success hover:bg-feedback-bg-success active:bg-feedback-bg-success ${TONE_COMMON}`,
        warning: `bg-feedback-bg-warning text-feedback-warning hover:bg-feedback-bg-warning active:bg-feedback-bg-warning ${TONE_COMMON}`,
        info: `bg-feedback-bg-info text-feedback-info hover:bg-feedback-bg-info active:bg-feedback-bg-info ${TONE_COMMON}`,
      },
      size: {
        sm: 'h-[var(--component-button-size-sm-height)] px-fixed-xs hds-type-caption hds-touch-row [&_svg]:size-[var(--component-button-size-sm-iconSize)]',
        md: 'h-[var(--component-button-size-md-height)] px-fixed-sm py-scale-xs hds-type-ui [&_svg]:size-[var(--component-button-size-md-iconSize)]',
        lg: 'h-[var(--component-button-size-lg-height)] px-[var(--component-button-size-lg-paddingX)] hds-type-ui [&_svg]:size-[var(--component-button-size-lg-iconSize)]',
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
        wipe: 'hds-btn-wipe relative isolate',
      },
      // Hard (zero-blur) edge, theme.css `.hds-btn-hard` (hds#888, C2 fixed base): the face
      // sinks component.button.depth.hoverOffset (1px) on hover and .pressedOffset (3px) on
      // press while the edge (.edge, 3px) shrinks by the same amount, so the button
      // compresses (hds#1196, one token set since hds#1387). `none` opts out. Tertiary
      // (ghost) and link never take it.
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
        tone: ['neutral', 'quiet'],
        variant: 'tertiary',
        className: 'hover:bg-transparent',
      },
      {
        tone: 'neutral',
        variant: 'tertiary',
        className:
          'active:bg-[color:var(--component-button-tertiary-bg-pressed)] active:inset-shadow-transparent',
      },
      { tone: 'quiet', variant: ['tertiary', 'link'], className: 'text-muted-foreground' },
      // A link is plain text in every tone (owner decision 2026-11-05): a status tone keeps its
      // text colour, but its fill, hover brightness and pressed wash are swapped out, and the
      // base disabled fill too. Compound classes come after tone classes, so these win the merge.
      {
        variant: 'link',
        className:
          'px-0 bg-transparent hover:bg-transparent active:bg-transparent disabled:bg-transparent hover:brightness-100 dark:hover:brightness-100 active:inset-shadow-transparent',
      },
      // Link focus (hds#1167, matches the Figma Focus drawing): with px-0 a ring on the button
      // would sit right on the glyphs and the underline. A link instead paints the shared ring
      // (.hds-focus-after: semantic.focus.ring.width, gap.width and ring.color) on an ::after
      // box that reaches space.scale.2xs (4px) past the label on each side, with the control
      // radius (4px), so the ring corners are semantic.focus.radius.control (6 / 8). The ::after
      // is absolutely positioned, so the rest box (width, padding, radius) never moves.
      {
        variant: 'link',
        className:
          'relative hds-focus-after after:pointer-events-none after:absolute after:inset-y-0 after:-inset-x-scale-2xs after:rounded-[var(--semantic-radius-control)]',
      },
      {
        iconOnly: true,
        size: 'sm',
        className: 'w-[var(--component-button-size-sm-height)] hds-touch-target',
      },
      { iconOnly: true, size: 'md', className: 'w-[var(--component-button-size-md-height)]' },
      { iconOnly: true, size: 'lg', className: 'w-[var(--component-button-size-lg-height)]' },
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
  /** Visual treatment: `primary`, `secondary`, `tertiary` or `link` (underlined text, no fill or padding). Defaults to `secondary` (a soft tonal fill), so pass `primary` for the main action. */
  variant?: ButtonVariantProps['variant'];
  /** `wipe` (default) slides the hover fill in from the pointer's edge; `none` changes it in place. */
  hoverEffect?: 'none' | 'wipe';
  /** `hard` (default) raises every filled Button (primary, secondary, each tone, toggles, icon-only) on one edge and press depth, `component.button.depth.*`; `none` opts out. Tertiary (ghost) and link never have one. Its colour is the `component.button.edge.*` token for the variant or tone (`--hds-btn-edge` overrides it). */
  shadow?: 'hard' | 'none';
  /** Drop the inline padding (tertiary), so a back link's icon lines up with the heading below it. The height stays. */
  flush?: boolean;
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
  /** Show the external-link arrow after the label (when `iconRight` is not set). On hover and keyboard focus the arrow nudges up and right; reduced motion keeps it still. With `asChild` it is added inside the slotted link. */
  external?: boolean;
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

/**
 * One label inside a toggle Button's crossfade stack (hds#938). The labels
 * stack in a single grid cell, so while the old and new labels overlap the
 * button is as wide as the wider of the two and nothing around it shifts;
 * once the exit finishes the old label unmounts and the width releases to
 * the new label. While AnimatePresence keeps an exiting label mounted,
 * useIsPresent reports false for it: the label is then aria-hidden, so the
 * button's accessible name is the new label from the moment it changes.
 */
function CrossfadeLabel({ children }: { children: React.ReactNode }) {
  const isPresent = useIsPresent();
  const productiveMotion = useHdsMotion('productive');
  return (
    <m.span
      className="col-start-1 row-start-1"
      data-crossfade-label={isPresent ? 'live' : 'exiting'}
      aria-hidden={!isPresent || undefined}
      {...crossfadeFade(productiveMotion)}
    >
      {children}
    </m.span>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

// Warn once per module load: `iconOnly` renders only `iconLeft` (iconRight is
// hidden), so an icon-only Button without one is an empty square; and iconOnly
// hides the label text, so without label, aria-label, aria-labelledby or
// title the button has no accessible name. Not `warnOnce` from
// lib/deprecation: that prefixes `[HDS deprecation]`, and these are misuse,
// not deprecations — `warnOncePlain` is the same guard without the prefix.

/** The hard edge each raised Button paints (theme.css `.hds-btn-hard`, hds#897). */
const BUTTON_EDGE = {
  primary: 'var(--hds-edge-primary)',
  secondary: 'var(--component-button-edge-secondary)',
  danger: 'var(--component-button-edge-danger)',
  success: 'var(--component-button-edge-success)',
  warning: 'var(--component-button-edge-warning)',
  info: 'var(--component-button-edge-info)',
} as const;

/**
 * Triggers an action when activated.
 * @usage Run an action, such as submit, save or open a dialog. For an icon-only control pass iconOnly, iconLeft and label; for an on/off toggle pass pressed. For a low-priority action beside a primary one use variant="tertiary" tone="quiet"; for a back link whose icon lines up with the heading add flush; for an action that reads as a text link in a row use variant="link".
 * @whenNot Navigating to another page, where a link is the correct element.
 * @useInstead InlineLink navigation to another page
 * @a11y component required a11y:button.keyboard-activate Enter and Space activate it, and it takes part in the Tab order.
 * @a11y component required a11y:button.focus-ring Keyboard focus draws the shared .hds-focus ring (semantic.focus.* width, gap and colour); nothing removes the outline.
 * @a11y component required a11y:button.loading-busy loading sets aria-busy and disables the button, and the spinner is hidden from assistive technology.
 * @a11y component required a11y:button.toggle-pressed A toggle button reports its state with aria-pressed and flips it on activation.
 * @a11y component required a11y:button.aschild-disabled A disabled asChild link is aria-disabled and leaves the tab order, since a link cannot be natively disabled.
 * @a11y component required a11y:button.external-new-tab With `external`, the accessible name ends in "(opens in new tab)", as InlineLink's does: a visually hidden span, or appended to an aria-label (label, aria-label, or the slotted link's own); the arrow is decorative.
 * @a11y component required a11y:button.icon-only-name An icon-only button takes its accessible name from label (as aria-label).
 * @a11y component required a11y:button.target-size Every size is at least 24px tall, and an icon-only button at least 24px wide (WCAG 2.5.8).
 * @a11y component required a11y:button.reduced-motion The loading spinner stops under prefers-reduced-motion.
 * @a11y component required a11y:button.label-crossfade When a toggle button's text label changes, the old label is aria-hidden while it fades out, so the accessible name is the new label from the moment it changes.
 * @a11y component required gate:check-reduced-motion The toggle label crossfade takes its duration from useHdsMotion, which is zero under prefers-reduced-motion, and under reduced motion the label swaps instantly with no overlap.
 * @a11y component required a11y:button.quiet-focus-ring Quiet, flush and link keep a visible focus ring (hds#1167).
 * @a11y component required a11y:button.quiet-contrast Quiet text is content.secondary and clears 4.5:1 at rest (page, raised), hovered (surface.hover) and pressed (the 5% wash), in light and dark.
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
      flush = false,
      asChild = false,
      label,
      loading = false,
      iconLeft,
      iconRight: iconRightProp,
      external,
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
    const iconRight =
      iconRightProp ??
      (external && <SquareArrowOutUpRight aria-hidden="true" className="hds-ext-icon" />);
    // A link-styled Button has no fill to wipe in and no edge (hds#863).
    const isLink = variant === 'link';
    const wipe = hoverEffect === 'wipe' && !isLink;
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
    // A status tone (not quiet, which only recolours a ghost's text).
    const hasTone = tone != null && tone !== 'neutral' && tone !== 'quiet';
    // The hard shadow's colour (theme.css `.hds-btn-hard`, hds#897): the fill it sits under,
    // primary's is its fill stepped darker, precomputed as --hds-edge-primary; secondary and
    // the tones read their component.button.edge.<key> token (a pressed neutral toggle paints
    // bg-primary, so it takes primary's edge). --hds-btn-edge still overrides.
    const edgeKey = hasTone
      ? tone
      : variant === 'primary' || (isToggle && isPressed)
        ? 'primary'
        : 'secondary';
    const edge =
      shadow === 'hard' && variant !== 'tertiary' && !isLink
        ? {
            '--hds-edge': BUTTON_EDGE[edgeKey],
            // The hover fill (component.button.bgHover) has its own edge, so an accent's
            // hover step keeps an edge of the same hue (theme.css .hds-btn-hard:hover).
            ...(variant === 'primary' && { '--hds-edge-hover': 'var(--hds-edge-primaryHover)' }),
          }
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
    // A toggle Button whose text label changes crossfades the two labels
    // (hds#938): old and new stay mounted, overlapped in one grid cell, until
    // the fade ends. Only a plain-text label can crossfade; anything richer
    // renders exactly as it always has. Under prefers-reduced-motion there
    // is no overlap at all — the label swaps instantly.
    const reducedMotion = useReducedMotion();
    const crossfadeLabel =
      isToggle && typeof content === 'string' && content !== '' && !reducedMotion;

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
        hoverEffect: wipe ? 'wipe' : 'none',
        shadow: variant === 'tertiary' || isLink ? 'none' : shadow,
      }),
      isToggle && !hasTone && toggleOnClasses,
      flush && 'px-0',
      external && 'hds-ext',
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
          {...(external && newTabName(props['aria-label']))}
        >
          <Slottable>
            {(external &&
              React.isValidElement<{ 'aria-label'?: string }>(children) &&
              React.cloneElement(children, newTabName(children.props['aria-label']) ?? {})) ||
              (children as React.ReactElement)}
          </Slottable>
          {external && iconRight}
          {external && <NewTabHint />}
        </Slot>
      );
    }

    if (iconOnly && isDevelopment()) {
      if (!iconLeft && !loading) {
        warnOncePlain('button-iconOnly-without-icon', '[Button] iconOnly needs iconLeft');
      }
      if (!label && !props['aria-label'] && !props['aria-labelledby'] && !props.title) {
        warnOncePlain('button-iconOnly-without-name', '[Button] iconOnly needs a label');
      }
    }

    // `label` is the accessible name whenever it is given (iconOnly hides the text; with children it
    // overrides them). Spread only when set, so an aria-label from props keeps its old position.
    // When label is the only content it already is the name, so no redundant aria-label.
    const nameProps = label && (iconOnly || children != null) ? { 'aria-label': label } : {};
    // An aria-label replaces the text, hidden hint included, so it carries the hint (hds#1537).
    const extName =
      external &&
      newTabName(props['aria-label'] ?? (nameProps as { 'aria-label'?: unknown })['aria-label']);

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
        {...extName}
      >
        {loading ? (
          <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          iconLeft
        )}
        {!iconOnly &&
          (crossfadeLabel ? (
            <span className="grid" data-slot="label-crossfade">
              <LazyMotion features={domAnimation}>
                <AnimatePresence initial={false}>
                  <CrossfadeLabel key={content}>{content}</CrossfadeLabel>
                </AnimatePresence>
              </LazyMotion>
            </span>
          ) : (
            content
          ))}
        {!loading && !iconOnly && iconRight}
        {external && <NewTabHint />}
      </button>
    );
  },
);
