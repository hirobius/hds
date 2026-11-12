/**
 * SegmentedControl " segmented selection input for compact mutually-exclusive choices.
 * @category Inputs
 * @tier primitive
 * @usage Switch between two to five mutually exclusive views or modes in a compact row. Give each option an `href` to make the segments navigation links (a nav, not a radiogroup). Give an option an `icon` and an `aria-label` (no `label`) for an icon-only segment.
 * @whenNot A form choice that submits with the form, or more than five options.
 * @useInstead Radio a form choice that submits with the form
 * @useInstead Tabs switching between panels of content
 * @useInstead Select more than five options
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=82-334
 *
 * The active×hover×pressed×disabled×secondary state matrix is expressed
 * through `cva` compound variants keyed by `active` / `interaction` (the
 * live-or-frozen-demo hover/pressed/rest sub-state) / `variant` / `disabled`,
 * each resolving to the same `--semantic-*` custom properties the pre-Tailwind
 * inline styles referenced — same tokens, same pixels, just Tailwind classes
 * instead of a `style` object. Per ADR-015 this control keeps its own
 * hover/focus tracking (per-segment `string | null` cardinality) rather than
 * the shared `useInteractionState` single-element machine; only the class
 * composition changed, not the state machine feeding it.
 *
 * When the segments outgrow the rail (a phone), the rail scrolls: it fades the
 * hidden edge (`data-overflow`, the same mask as the tab list) and keeps the selected
 * segment in view on mount and on change (hds#823).
 * @a11y component required a11y:segmented-control.roving-focus The control is one Tab stop; arrow keys move focus between segments and select, like a native radio group.
 * @a11y component required a11y:segmented-control.group-and-radio-roles It is a radiogroup named by label or aria-label, and each segment is a radio with aria-checked.
 * @a11y component required a11y:segmented-control.sr-group A screen reader speaks the group name and each radio with its state, position and set size.
 * @a11y component required a11y:segmented-control.focus-ring Every segment carries the shared hds-focus ring.
 * @a11y component required a11y:segmented-control.target-size Each segment hit area is 24px or taller, including the compact size (WCAG 2.5.8).
 * @a11y component required gate:check-reduced-motion The indicator slide goes through useHdsMotion, so it stops under prefers-reduced-motion.
 * @a11y component required a11y:segmented-control.link-mode When options carry an href the control is a nav (named by label or aria-label) holding a list of links; the current link is aria-current="page", each is a real anchor, and Tab walks them like any links.
 * @a11y component required a11y:segmented-control.icon-only An icon-only option (`icon` + `aria-label`, no visible text) is named by its aria-label, hides the icon from assistive tech and keeps a 44px target in both radiogroup and link mode.
 * @a11y consumer required Give the control a label or an aria-label so the group has a name.
 */
// Motion: motion/react drives the secondary-variant press/hover spring (animate/transition below); CSS transitions reference hds.motion tokens via var(--hds-motion-productive-*)
import { forwardRef, useRef, useState } from 'react';
import { LazyMotion, domAnimation, m } from 'motion/react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import hds from '../design-system/tokens';
import { useFrozenState } from '../context/DemoStateContext';
import { useHdsMotion } from '../hooks/useHdsMotion';
import { safeHref } from '../../lib/safe-href';
import { isDevelopment } from '../../lib/env';
import { warnOncePlain } from '../../lib/deprecation';
import { useHdsRouter } from '../context/RouterContext';
import { scrollEdgeFadeStyle, useKeepSelectedInView, useScrollEdgeFade } from './scroll-edge-fade';

// ── Variants ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- semantic space/radius/border tokens have no Tailwind-theme utility; var()-based so still token-driven
const segmentedControlWrapperVariants = /* @__PURE__ */ cva(
  'inline-flex max-w-full flex-col items-start self-start gap-[var(--semantic-space-scale-xs)] p-0',
  {
    variants: {
      fullWidth: {
        true: 'w-full',
        false: 'w-fit',
      },
    },
    defaultVariants: { fullWidth: false },
  },
);

// Concentric corners (hds#1468): a pill inset by padding + border inside a rail has radius
// rail radius - (padding + border), else the gap between the two curves is uneven at the corners.
// --seg-rail-radius is the rounded-lg formula (role radius + up to 4px), --seg-rail-pad the rail padding
// (set inline from railPadding), the 1px is the rail's border; the segment and indicator read --seg-inner-radius.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- rail border/radius/gap are semantic tokens with no Tailwind-theme utility; var()-based so still token-driven
const segmentedControlRailVariants = /* @__PURE__ */ cva(
  'flex max-w-full items-stretch gap-[var(--semantic-space-subgrid-gap)] overflow-x-auto overflow-y-hidden rounded-[var(--seg-rail-radius)] border border-solid border-[color:transparent] [scrollbar-width:thin] [--seg-rail-radius:calc(var(--role-radius)+min(var(--role-radius),4px))] [--seg-inner-radius:max(0px,calc(var(--seg-rail-radius)-var(--seg-rail-pad)-1px))]',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--semantic-color-surface-muted)]',
        secondary: 'bg-[var(--semantic-color-surface-muted)]',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-fit',
      },
    },
    defaultVariants: { variant: 'primary', fullWidth: false },
  },
);

// The segment button chrome. `active` / `interaction` / `variant` / `disabled`
// are matcher-only axes here (empty base strings) — every actual color class
// lives in compoundVariants so each branch below maps 1:1 to the original
// inline-style ternary it replaces. `disabled` compounds are listed LAST so
// `cn()` (twMerge) resolves them as the winning class for a given Tailwind
// slot regardless of what else matched, mirroring the old `showDisabled ? … :
// …` short-circuit.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- segment button color/spacing/motion tokens have no Tailwind-theme utility; var()-based so still token-driven
const segmentedControlItemVariants = /* @__PURE__ */ cva(
  'relative m-0 flex flex-col items-center justify-center gap-[var(--semantic-space-subgrid-hairline)] rounded-[var(--seg-inner-radius)] border-0 bg-transparent py-[var(--semantic-space-subgrid-gap)] text-center hds-touch-target transition-[color,outline-color,transform] duration-[var(--hds-motion-productive-duration)] ease-[var(--hds-motion-productive-easing)]',
  {
    variants: {
      size: {
        // Rail = item + 2 x 4px padding + 2px border: 22px -> 32px (Button sm), 30px -> 40px (Button/Input md).
        // WCAG 2.5.8: the 22px segment is under 24px, so an invisible pseudo-element grows the
        // hit area 1px above and below into the rail padding, to 24px, without moving the layout.
        // Default inline padding is a class so it can step down on a phone: five 16px-padded segments are
        // wider than a 390px viewport (bug bash 24, item 15). A consumer segmentPaddingX still wins inline.
        sm: "min-h-[22px] py-0 px-[var(--semantic-space-scale-xs)] before:absolute before:inset-x-0 before:-inset-y-[1px] before:content-['']",
        md: 'min-h-[30px] px-[var(--semantic-space-scale-xs)] sm:px-[var(--semantic-space-layout-gap)]',
      },
      fullWidth: {
        true: 'w-full min-w-0 flex-1',
        false: '',
      },
      variant: {
        primary: '',
        secondary: '',
      },
      active: {
        true: 'z-[1]',
        false: 'z-0',
      },
      interaction: {
        rest: '',
        hover: '',
        pressed: '',
      },
      disabled: {
        true: 'cursor-not-allowed',
        false: 'cursor-pointer',
      },
      iconOnly: { true: '', false: '' },
    },
    compoundVariants: [
      // Width for the non-fullWidth case: every segment hugs its content. A
      // `w-full` segment inside the `w-fit` rail is circular (hds#522): one
      // segment took the whole rail and the rest scrolled out of view.
      { fullWidth: false, className: 'w-max min-w-max flex-none' },

      // Icon-only (hds#1439): a 44px target at every size and pointer (semantic.size.touchTarget),
      // listed after the width compound so cn() lets it win min-w and the sm min-h.
      {
        iconOnly: true,
        className:
          'min-h-[var(--semantic-size-touchTarget)] min-w-[var(--semantic-size-touchTarget)]',
      },

      // Foreground color — active wins over hover/rest regardless of interaction sub-state.
      {
        active: true,
        variant: 'secondary',
        className: 'text-[var(--semantic-color-content-primary)]',
      },
      {
        active: true,
        variant: 'primary',
        className: 'text-[var(--semantic-color-content-onAccent)]',
      },
      {
        active: false,
        interaction: 'hover',
        variant: 'secondary',
        className: 'text-[var(--semantic-color-content-secondary)]',
      },
      {
        active: false,
        interaction: 'hover',
        variant: 'primary',
        className: 'text-[var(--semantic-color-content-primary)]',
      },
      {
        active: false,
        interaction: 'rest',
        className: 'text-[var(--semantic-color-content-secondary)]',
      },

      // Pressed micro-offset — primary variant only (secondary never transforms).
      { variant: 'primary', active: true, interaction: 'pressed', className: 'translate-y-px' },

      // Disabled — last, so it wins the text-color slot no matter what else matched.
      { disabled: true, className: 'text-[var(--semantic-color-content-disabled)]' },
    ],
    defaultVariants: {
      size: 'md',
      fullWidth: false,
      variant: 'primary',
      active: false,
      interaction: 'rest',
      disabled: false,
      iconOnly: false,
    },
  },
);

// The indicator and the description read the same per-segment state; their
// axes carry no classes of their own, only compound variants (hds#1009).
const SEGMENT_STATE_AXES = {
  variant: { primary: '', secondary: '' },
  active: { true: '', false: '' },
  interaction: { rest: '', hover: '', pressed: '' },
  disabled: { true: '', false: '' },
};
const SEGMENT_STATE_DEFAULTS = {
  variant: 'primary',
  active: false,
  interaction: 'rest',
  disabled: false,
} as const;

// The absolutely-positioned background/ring indicator behind each segment.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- indicator background/ring colors are semantic tokens with no Tailwind-theme utility; var()-based so still token-driven
const segmentedControlIndicatorVariants = /* @__PURE__ */ cva(
  'pointer-events-none absolute inset-0 z-0 rounded-[var(--seg-inner-radius)] bg-transparent shadow-none',
  {
    variants: SEGMENT_STATE_AXES,
    compoundVariants: [
      // Background.
      // Secondary selected: the page fill with a 1px border.interactive edge, which reads
      // at 3:1+ against the track and a raised Card in light and dark (hds#866). Not
      // border.strong (2.3:1 on white), and no raised shadow on top of the edge: depth is
      // one mechanism, border or shadow (REACT_COMPONENTS.md, Elevation roles).
      {
        active: true,
        variant: 'secondary',
        className: 'bg-[var(--semantic-color-surface-page)]',
      },
      {
        active: true,
        variant: 'primary',
        interaction: 'rest',
        className: 'bg-[var(--semantic-accent-rest)]',
      },
      {
        active: true,
        variant: 'primary',
        interaction: 'hover',
        className: 'bg-[var(--semantic-accent-hover)]',
      },
      {
        active: true,
        variant: 'primary',
        interaction: 'pressed',
        className: 'bg-[var(--semantic-accent-pressed)]',
      },
      {
        active: false,
        interaction: 'hover',
        variant: 'secondary',
        className: 'bg-[var(--semantic-color-surface-raised)]',
      },
      {
        active: false,
        interaction: 'hover',
        variant: 'primary',
        className: 'bg-[var(--semantic-color-surface-accentSubtle)]',
      },

      // Ring — shown whenever active (any interaction) or hovered; color follows variant.
      {
        active: true,
        variant: 'secondary',
        className: 'shadow-[inset_0_0_0_1px_var(--semantic-color-border-interactive)]',
      },
      // Primary selected (C2): the primary fill with the primary hard edge, drawn inset at
      // the bottom because the scrolling rail clips anything below the segment.
      {
        active: true,
        variant: 'primary',
        className: 'shadow-[inset_0_-3px_0_var(--hds-edge-primary)]',
      },
      {
        active: false,
        interaction: 'hover',
        variant: 'secondary',
        className: 'shadow-[inset_0_0_0_1px_var(--semantic-color-border-default)]',
      },
      {
        active: false,
        interaction: 'hover',
        variant: 'primary',
        className: 'shadow-[inset_0_0_0_1px_var(--semantic-color-border-accent)]',
      },

      // Disabled — last, wins both background and ring slots.
      {
        disabled: true,
        variant: 'secondary',
        className: 'bg-[var(--semantic-color-surface-page)] shadow-none',
      },
      {
        disabled: true,
        variant: 'primary',
        className: 'bg-[var(--semantic-color-surface-raised)] shadow-none',
      },
    ],
    defaultVariants: SEGMENT_STATE_DEFAULTS,
  },
);

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- description text is the semantic caption composite (14px/medium) plus content-* color tokens; no Tailwind-theme utility
const segmentedControlDescriptionVariants = /* @__PURE__ */ cva(
  // tier-ok: primitive.zIndex.10 (the discrete 0/10/100/1000 stacking scale, reached as hds.zIndex.focus) has no semantic alias — same primitive ref the pre-Tailwind inline style used
  'relative z-[var(--primitive-zIndex-10)] hds-type-caption text-[var(--semantic-color-content-secondary)]',
  {
    variants: SEGMENT_STATE_AXES,
    compoundVariants: [
      {
        active: true,
        interaction: 'rest',
        variant: 'primary',
        className: 'text-[var(--semantic-color-content-onAccent)]',
      },
      { disabled: true, className: 'text-[var(--semantic-color-content-disabled)]' },
    ],
    defaultVariants: SEGMENT_STATE_DEFAULTS,
  },
);

// The segment's own label text — color always follows the button's computed
// `currentColor` (set by segmentedControlItemVariants above), so this only
// carries the typeStyles.ui composite (16px/24px/medium/60ch) + stacking.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- zIndex.focus token + 60ch max-width have no Tailwind-theme utility; var()-based so still token-driven. font-size/line-height now ramp-driven (ui role).
const segmentedControlLabelVariants = /* @__PURE__ */ cva(
  // tier-ok: primitive.zIndex.10, reached as hds.zIndex.focus, has no semantic alias — same primitive ref the pre-Tailwind inline style used
  'relative z-[var(--primitive-zIndex-10)] max-w-[60ch] hds-type-ui text-current',
  {
    variants: {
      // hds#1214: the ui role's 24px line box overflowed the 22px sm segment, so the sm rail
      // grew to 34px instead of Button sm's 32px. A 1x line box fits; the glyphs stay 16px.
      // type-ramp-ok: the ui role's size and weight stay; only the sm line box drops to the semantic lineHeight.none token (hds#1214)
      size: { sm: 'leading-[var(--semantic-typography-lineHeight-none)]', md: '' },
      // The selected primary segment paints a 3px edge inset at its bottom, so its visible
      // face is 3px shorter and the label read low on it. Lift the label onto the face.
      lifted: { true: '-translate-y-px', false: '' },
    },
    defaultVariants: { size: 'md', lifted: false },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

type SegmentedItemVariantProps = VariantProps<typeof segmentedControlItemVariants>;

interface HdsSegmentedOptionBase {
  /** Value submitted when this option is selected. */
  value: string;
  /**
   * Make the segment a navigation link to this href. When the options carry an `href` the control
   * renders a `nav` holding a list of links (the current one `aria-current="page"`) instead of a
   * radiogroup. Internal paths (one leading "/") go through the router adapter's link component.
   */
  href?: string;
}

/** A text option: a visible label, with an optional description under it. */
interface HdsSegmentedTextOption extends HdsSegmentedOptionBase {
  /** Visible label for the option. */
  label: string;
  /** Optional supporting description shown below the label. */
  description?: string;
  /** Overrides the visible label as the accessible name. */
  'aria-label'?: string;
  icon?: undefined;
}

/** An icon-only option: an icon and no visible text, so the accessible name is required. */
interface HdsSegmentedIconOption extends HdsSegmentedOptionBase {
  /** The icon (an HDS `Icon` or any element drawn in `currentColor`). It is hidden from assistive tech. */
  icon: React.ReactNode;
  /** Accessible name of the segment (required: there is no visible text). The segment is a 44px target. */
  'aria-label': string;
  label?: undefined;
  description?: undefined;
}

type HdsSegmentedOption = HdsSegmentedTextOption | HdsSegmentedIconOption;

function isIconOnly(option: HdsSegmentedOption): option is HdsSegmentedIconOption {
  return option.icon != null && !option.label;
}

export interface SegmentedControlProps {
  /** Accessible label for the control. */
  label?: string;
  /** Accessible label when no visible label should be rendered. */
  'aria-label'?: string;
  /** Option set rendered inside the segmented rail. */
  options: HdsSegmentedOption[];
  /** Currently selected value (the current page in link mode). A value no option has marks none selected. */
  value: string;
  /** Called when the user selects a different option. Optional in link mode, where the link itself navigates. */
  onChange?: (value: string) => void;
  /** Size on the sm/md ramp shared with Button/Input. */
  size?: NonNullable<SegmentedItemVariantProps['size']>;
  /** Visual treatment for the rail and active segment. */
  variant?: NonNullable<SegmentedItemVariantProps['variant']>;
  /** Whether the control should stretch to the width of its container. */
  fullWidth?: boolean;
  /** Padding inside the rail container. */
  railPadding?: React.CSSProperties['padding'];
  /** Horizontal padding inside each segment. */
  segmentPaddingX?: React.CSSProperties['paddingLeft'];
}

/** First length of the rail padding as a CSS length (a bare number is px, like React's padding). */
function railInset(padding: SegmentedControlProps['railPadding']): string {
  if (padding === undefined || padding === null) return '4px';
  if (typeof padding === 'number') return `${padding}px`;
  return String(padding).trim().split(/\s+/)[0];
}

/** An href the router adapter handles (a single leading "/"); anything else is a plain anchor. */
function isInternalHref(href: string): boolean {
  const value = href.trim();
  return value.startsWith('/') && !value.startsWith('//');
}

// ── Component ──────────────────────────────────────────────────────────────────

/** @public */
export const SegmentedControl = /* @__PURE__ */ forwardRef<HTMLDivElement, SegmentedControlProps>(
  function SegmentedControl(
    {
      label,
      'aria-label': ariaLabel,
      options,
      value,
      onChange,
      size = 'md',
      variant = 'primary',
      fullWidth = false,
      railPadding,
      segmentPaddingX,
    },
    ref,
  ) {
    const { LinkComponent } = useHdsRouter();
    const linkMode = options.some((option) => option.href !== undefined);
    if (isDevelopment() && options.some((o) => o.icon != null && !o.label && !o['aria-label'])) {
      warnOncePlain(
        'segmented-control-icon-only-without-name',
        '[SegmentedControl] an icon-only option shows no text, so it has no accessible name; pass aria-label on the option.',
      );
    }
    const [hoveredValue, setHoveredValue] = useState<string | null>(null);
    const [focusedValue, setFocusedValue] = useState<string | null>(null);
    const frozenState = useFrozenState();
    const demoState = frozenState as 'rest' | 'hover' | 'focused' | 'pressed' | 'disabled' | null;
    const isDisabled = demoState === 'disabled';
    const productiveMotion = useHdsMotion('productive');
    const isSecondary = variant === 'secondary';
    const resolvedAriaLabel = ariaLabel ?? label;
    // Arrow/Home/End focus moves select, like a native radio group (WAI-ARIA radio pattern); Tab does not.
    // Radix moves focus in a timeout after the key, so remember when the navigation key was pressed.
    const lastNavKeyAt = useRef(-Infinity);
    // The rail scrolls when segments outgrow it (a phone): fade the hidden edge like
    // the tab list (hds#723) and keep the selected segment in view (hds#823).
    const { ref: railRef, overflow, update: updateOverflow } = useScrollEdgeFade<HTMLDivElement>();
    useKeepSelectedInView(
      railRef,
      linkMode ? '[aria-current="page"]' : '[role="radio"][aria-checked="true"]',
    );

    const renderBody = (
      option: HdsSegmentedOption,
      active: boolean,
      segmentState: {
        variant: typeof variant;
        active: boolean;
        interaction: 'rest' | 'hover' | 'pressed';
        disabled: boolean;
      },
    ) => (
      <>
        <span
          aria-hidden="true"
          // #225: cva only concatenates base + compound class strings — it
          // does not dedupe conflicting Tailwind utilities. The base here
          // always carries `bg-transparent`, so without a twMerge pass the
          // active/hover compounds' accent-background class
          // could lose the cascade to it (stylesheet order, not DOM class
          // order, decides ties) and the indicator never visibly paints.
          // `cn()` (clsx + tailwind-merge) makes the last conflicting
          // utility in the string win deterministically, same as every
          // other multi-source className in this file.
          className={cn(segmentedControlIndicatorVariants(segmentState))}
        />
        {isIconOnly(option) ? (
          // The icon is decoration: the segment's aria-label is its name.
          <span
            aria-hidden="true"
            className={cn(
              segmentedControlLabelVariants({ size, lifted: active && variant === 'primary' }),
              'inline-flex items-center justify-center',
            )}
          >
            {option.icon}
          </span>
        ) : (
          <span
            className={segmentedControlLabelVariants({
              size,
              lifted: active && variant === 'primary',
            })}
          >
            {option.label}
          </span>
        )}
        {option.description && (
          <span
            // Same cascade hazard as the indicator above (base
            // `text-[...secondary]` vs. compound `text-[...onAccent]`).
            className={cn(segmentedControlDescriptionVariants(segmentState))}
          >
            {option.description}
          </span>
        )}
      </>
    );

    return (
      <div ref={ref} className={segmentedControlWrapperVariants({ fullWidth })}>
        {label && (
          // inline-ok: pb here mirrors the dynamic-padding cases below — token value, not a magic number, kept inline to match the group's spacing rhythm without a one-off arbitrary class
          <span
            // eslint-disable-next-line tailwindcss/no-arbitrary-value -- 60ch max-width + content-primary color have no Tailwind-theme utility; var()-based so still token-driven. font-size/line-height now ramp-driven (ui role).
            className="max-w-[60ch] hds-type-ui text-[var(--semantic-color-content-primary)]"
            style={{ paddingBottom: hds.semantic.space.subgrid.gap }}
          >
            {label}
          </span>
        )}
        {linkMode ? (
          <nav
            aria-label={resolvedAriaLabel}
            className={segmentedControlWrapperVariants({ fullWidth })}
          >
            <ul
              ref={railRef as React.Ref<HTMLUListElement>}
              onScroll={updateOverflow}
              data-overflow={overflow}
              className={cn('m-0 list-none', segmentedControlRailVariants({ variant, fullWidth }))}
              // inline-ok: railPadding is a consumer-overridable runtime CSSProperties value; the edge-fade mask is runtime too (scroll position)
              style={{
                padding: railPadding ?? '4px',
                ['--seg-rail-pad' as string]: railInset(railPadding),
                ...scrollEdgeFadeStyle(overflow),
              }}
            >
              {options.map((option) => {
                const active = option.value === value;
                const showHover = demoState
                  ? demoState === 'hover' && active
                  : hoveredValue === option.value;
                const showPressed = demoState === 'pressed' && active;
                const showFocused = demoState
                  ? demoState === 'focused' && active
                  : focusedValue === option.value;
                const interaction: 'rest' | 'hover' | 'pressed' = showPressed
                  ? 'pressed'
                  : showHover
                    ? 'hover'
                    : 'rest';
                const segmentState = { variant, active, interaction, disabled: isDisabled };
                const href = option.href === undefined ? undefined : safeHref(option.href);
                const itemProps = {
                  'aria-current': active ? ('page' as const) : undefined,
                  'aria-label': option['aria-label'],
                  'aria-disabled': isDisabled || undefined,
                  tabIndex: isDisabled ? -1 : undefined,
                  onMouseEnter: () => !demoState && setHoveredValue(option.value),
                  onMouseLeave: () => !demoState && setHoveredValue(null),
                  onFocus: () => !demoState && setFocusedValue(option.value),
                  onBlur: () => !demoState && setFocusedValue(null),
                  onClick: () => {
                    if (!active && !isDisabled) onChange?.(option.value);
                  },
                  className: cn(
                    'no-underline',
                    segmentedControlItemVariants({
                      size,
                      fullWidth,
                      variant,
                      active,
                      interaction,
                      disabled: isDisabled,
                      iconOnly: isIconOnly(option),
                    }),
                    isDisabled && 'pointer-events-none',
                    Boolean(demoState) && showFocused && 'hds-focus-ring',
                  ),
                  // inline-ok: segmentPaddingX is a consumer-overridable runtime CSSProperties value
                  style:
                    segmentPaddingX === undefined
                      ? undefined
                      : { paddingLeft: segmentPaddingX, paddingRight: segmentPaddingX },
                };
                return (
                  <li
                    key={option.value}
                    className={cn('flex', fullWidth ? 'min-w-0 flex-1' : 'flex-none')}
                  >
                    {href !== undefined && isInternalHref(href) ? (
                      <LinkComponent
                        to={href}
                        {...itemProps}
                        className={cn('hds-focus', itemProps.className)}
                      >
                        {renderBody(option, active, segmentState)}
                      </LinkComponent>
                    ) : (
                      <a
                        href={href}
                        {...itemProps}
                        className={cn('hds-focus', itemProps.className)}
                      >
                        {renderBody(option, active, segmentState)}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : (
          <ToggleGroup.Root
            ref={railRef}
            type="single"
            // Radix emits role="radio" + aria-checked on items (canonical
            // mutually-exclusive semantics, upgrading the prior aria-pressed
            // toggle-buttons); pair the container with role="radiogroup".
            role="radiogroup"
            aria-label={resolvedAriaLabel}
            value={value}
            // Radix `single` allows deselect (empty value); a segmented control is
            // always-one-selected, so ignore the empty case. Disabled freeze blocks change.
            onValueChange={(next) => {
              if (next && !isDisabled) onChange?.(next);
            }}
            disabled={isDisabled}
            onKeyDownCapture={(e) => {
              if (
                ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)
              ) {
                lastNavKeyAt.current = performance.now();
              }
            }}
            onScroll={updateOverflow}
            data-overflow={overflow}
            className={segmentedControlRailVariants({ variant, fullWidth })}
            // inline-ok: railPadding is a consumer-overridable runtime CSSProperties value (not a static token) — can't be expressed as a static Tailwind class; the edge-fade mask is runtime too (scroll position)
            style={{
              padding: railPadding ?? '4px',
              // The first length of the padding shorthand drives the concentric inner radius.
              ['--seg-rail-pad' as string]: railInset(railPadding),
              ...scrollEdgeFadeStyle(overflow),
            }}
          >
            <LazyMotion features={domAnimation}>
              {options.map((option) => {
                const active = option.value === value;
                const showHover = demoState
                  ? demoState === 'hover' && active
                  : hoveredValue === option.value;
                const showPressed = demoState === 'pressed' && active;
                const showFocused = demoState
                  ? demoState === 'focused' && active
                  : focusedValue === option.value;
                const showDisabled = isDisabled;
                const interaction: NonNullable<
                  VariantProps<typeof segmentedControlIndicatorVariants>['interaction']
                > = showPressed ? 'pressed' : showHover ? 'hover' : 'rest';
                const demoFocusRing = Boolean(demoState) && showFocused;
                const segmentState = { variant, active, interaction, disabled: showDisabled };

                return (
                  <ToggleGroup.Item
                    asChild
                    key={option.value}
                    value={option.value}
                    disabled={showDisabled}
                  >
                    <m.button
                      type="button"
                      aria-label={option['aria-label']}
                      onHoverStart={() => !demoState && setHoveredValue(option.value)}
                      onHoverEnd={() => !demoState && setHoveredValue(null)}
                      onFocus={() => {
                        if (demoState) return;
                        setFocusedValue(option.value);
                        if (performance.now() - lastNavKeyAt.current < 100 && !active)
                          onChange?.(option.value);
                      }}
                      onBlur={() => !demoState && setFocusedValue(null)}
                      animate={
                        isSecondary
                          ? {
                              y: active ? 0 : showPressed ? 1 : 0,
                              scale: active ? 1 : showHover ? 0.995 : 1,
                            }
                          : undefined
                      }
                      transition={
                        isSecondary
                          ? {
                              duration: productiveMotion.duration,
                              ease: productiveMotion.easing,
                            }
                          : undefined
                      }
                      className={cn(
                        'hds-focus',
                        segmentedControlItemVariants({
                          size,
                          fullWidth,
                          variant,
                          active,
                          interaction,
                          disabled: showDisabled,
                          iconOnly: isIconOnly(option),
                        }),
                        // Frozen "focused" docs state: .hds-focus-ring draws the .hds-focus ring without real
                        // keyboard focus (:focus-visible can't be faked).
                        demoFocusRing && 'hds-focus-ring',
                      )}
                      // inline-ok: segmentPaddingX is a consumer-overridable runtime CSSProperties value (not a static token) — can't be expressed as a static Tailwind class
                      style={
                        segmentPaddingX === undefined
                          ? undefined
                          : { paddingLeft: segmentPaddingX, paddingRight: segmentPaddingX }
                      }
                    >
                      {renderBody(option, active, segmentState)}
                    </m.button>
                  </ToggleGroup.Item>
                );
              })}
            </LazyMotion>
          </ToggleGroup.Root>
        )}
      </div>
    );
  },
);
