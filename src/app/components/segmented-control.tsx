/**
 * SegmentedControl " segmented selection input for compact mutually-exclusive choices.
 * @category Inputs
 * @tier primitive
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
 */
// motion-ok: motion/react drives the secondary-variant press/hover spring (animate/transition below); CSS transitions reference hds.motion tokens via var(--hds-motion-productive-*)
import { forwardRef, useState } from 'react';
import { motion } from 'motion/react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import hds from '../design-system/tokens';
import { useFrozenState } from '../context/DemoStateContext';

// ── Variants ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- semantic space/radius/border tokens have no Tailwind-theme utility; var()-based so still token-driven
const segmentedControlWrapperVariants = cva(
  'inline-flex max-w-full flex-col items-start self-start gap-[var(--semantic-space-component-gap)] p-0',
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

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- rail border/radius/gap are semantic tokens with no Tailwind-theme utility; var()-based so still token-driven
const segmentedControlRailVariants = cva(
  'flex max-w-full items-stretch gap-[var(--semantic-space-subgrid-gap)] overflow-x-auto overflow-y-hidden rounded-[calc(var(--semantic-radius-action)+4px)] border border-solid border-[var(--semantic-color-border-default)] [scrollbar-width:thin]',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--semantic-color-surface-raised)]',
        secondary: 'bg-[var(--semantic-color-surface-page)]',
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
const segmentedControlItemVariants = cva(
  'relative m-0 flex flex-col items-center justify-center gap-[var(--semantic-space-subgrid-hairline)] rounded-[var(--semantic-radius-action)] border-0 bg-transparent py-[var(--semantic-space-subgrid-gap)] text-center transition-[color,outline-color,transform] duration-[var(--hds-motion-productive-duration)] ease-[var(--hds-motion-productive-easing)]',
  {
    variants: {
      size: {
        sm: 'min-h-8',
        md: 'min-h-12',
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
    },
    compoundVariants: [
      // Width / min-width for the non-fullWidth case — compact shrinks to content, md fills the rail.
      { fullWidth: false, size: 'sm', className: 'w-max min-w-max flex-none' },
      { fullWidth: false, size: 'md', className: 'w-full flex-none' },

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
    },
  },
);

// The absolutely-positioned background/ring indicator behind each segment.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- indicator background/ring colors are semantic tokens with no Tailwind-theme utility; var()-based so still token-driven
const segmentedControlIndicatorVariants = cva(
  'pointer-events-none absolute inset-0 z-0 rounded-[var(--semantic-radius-action)] bg-transparent shadow-none',
  {
    variants: {
      variant: { primary: '', secondary: '' },
      active: { true: '', false: '' },
      interaction: { rest: '', hover: '', pressed: '' },
      disabled: { true: '', false: '' },
    },
    compoundVariants: [
      // Background.
      {
        active: true,
        variant: 'secondary',
        className: 'bg-[var(--semantic-color-surface-raised)]',
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
        className: 'shadow-[inset_0_0_0_1px_var(--semantic-color-border-default)]',
      },
      {
        active: true,
        variant: 'primary',
        className: 'shadow-[inset_0_0_0_1px_var(--semantic-color-border-accent)]',
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
    defaultVariants: { variant: 'primary', active: false, interaction: 'rest', disabled: false },
  },
);

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- description text is the semantic caption composite (12px/16px/medium) plus content-* color tokens; no Tailwind-theme utility
const segmentedControlDescriptionVariants = cva(
  // tier-ok: primitive.zIndex.focus (the discrete 0/10/100/1000 stacking scale) has no semantic alias — same primitive ref the pre-Tailwind inline style used
  'relative z-[var(--primitive-zIndex-10)] text-xs font-medium text-[var(--semantic-color-content-secondary)]',
  {
    variants: {
      variant: { primary: '', secondary: '' },
      active: { true: '', false: '' },
      interaction: { rest: '', hover: '', pressed: '' },
      disabled: { true: '', false: '' },
    },
    compoundVariants: [
      {
        active: true,
        interaction: 'rest',
        variant: 'primary',
        className: 'text-[var(--semantic-color-content-onAccent)]',
      },
      { disabled: true, className: 'text-[var(--semantic-color-content-disabled)]' },
    ],
    defaultVariants: { variant: 'primary', active: false, interaction: 'rest', disabled: false },
  },
);

// Demo-forced focus ring — real keyboard focus is handled entirely by the
// shared `.hds-focus` utility class; this only fires when a docs matrix
// freezes the visual state to "focused" (`:focus-visible` can't be faked
// without real keyboard focus).
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- outline width/offset/color are semantic tokens with no Tailwind-theme utility
const segmentedControlFocusRingVariants = cva(
  // tier-ok: primitive.borderWidth.sm (the 2px accent/selection-ring weight) has no semantic alias — same primitive ref the pre-Tailwind inline style used
  'outline outline-[length:var(--primitive-borderWidth-sm)] outline-offset-[length:var(--semantic-space-subgrid-gap)]',
  {
    variants: {
      variant: {
        primary: 'outline-[color:var(--semantic-color-border-accent)]',
        secondary: 'outline-[color:var(--semantic-color-border-default)]',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
);

// The segment's own label text — color always follows the button's computed
// `currentColor` (set by segmentedControlItemVariants above), so this only
// carries the typeStyles.ui composite (15px/24px/medium/60ch) + stacking.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- typeStyles.ui composite + zIndex.focus token have no Tailwind-theme utility; var()-based so still token-driven
const segmentedControlLabelVariants = cva(
  // tier-ok: primitive.zIndex.focus has no semantic alias — same primitive ref the pre-Tailwind inline style used
  'relative z-[var(--primitive-zIndex-10)] max-w-[60ch] text-[15px] font-medium leading-6 text-current',
);

// ── Types ──────────────────────────────────────────────────────────────────────

type SegmentedItemVariantProps = VariantProps<typeof segmentedControlItemVariants>;

interface HdsSegmentedOption {
  /** Value submitted when this option is selected. */
  value: string;
  /** Visible label for the option. */
  label: string;
  /** Optional supporting description shown below the label. */
  description?: string;
}

interface SegmentedControlProps {
  /** Accessible label for the control. */
  label?: string;
  /** Accessible label when no visible label should be rendered. */
  'aria-label'?: string;
  /** Option set rendered inside the segmented rail. */
  options: HdsSegmentedOption[];
  /** Currently selected value. */
  value: string;
  /** Called when the user selects a different option. */
  onChange: (value: string) => void;
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

// ── Component ──────────────────────────────────────────────────────────────────

/** @public */
export const SegmentedControl = forwardRef<HTMLDivElement, SegmentedControlProps>(
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
    const [hoveredValue, setHoveredValue] = useState<string | null>(null);
    const [focusedValue, setFocusedValue] = useState<string | null>(null);
    const frozenState = useFrozenState();
    const demoState = frozenState as 'rest' | 'hover' | 'focused' | 'pressed' | 'disabled' | null;
    const isDisabled = demoState === 'disabled';
    const isCompact = size === 'sm';
    const isSecondary = variant === 'secondary';
    const resolvedAriaLabel = ariaLabel ?? label;
    const resolvedSegmentPaddingX =
      segmentPaddingX ??
      (isCompact ? hds.semantic.space.component.gap : hds.semantic.space.layout.gap);

    return (
      <div ref={ref} className={segmentedControlWrapperVariants({ fullWidth })}>
        {label && (
          // inline-ok: pb here mirrors the dynamic-padding cases below — token value, not a magic number, kept inline to match the group's spacing rhythm without a one-off arbitrary class
          <span
            // eslint-disable-next-line tailwindcss/no-arbitrary-value -- typeStyles.ui composite (15px/24px/medium/60ch) + content-primary color have no Tailwind-theme utility; var()-based so still token-driven
            className="max-w-[60ch] text-[15px] font-medium leading-6 text-[var(--semantic-color-content-primary)]"
            style={{ paddingBottom: hds.semantic.space.subgrid.gap }}
          >
            {label}
          </span>
        )}
        <ToggleGroup.Root
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
            if (next && !isDisabled) onChange(next);
          }}
          disabled={isDisabled}
          className={segmentedControlRailVariants({ variant, fullWidth })}
          // inline-ok: railPadding is a consumer-overridable runtime CSSProperties value (not a static token) — can't be expressed as a static Tailwind class
          style={{ padding: railPadding ?? '4px' }}
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
            const showDisabled = isDisabled;
            const interaction: NonNullable<
              VariantProps<typeof segmentedControlIndicatorVariants>['interaction']
            > = showPressed ? 'pressed' : showHover ? 'hover' : 'rest';
            const demoFocusRing = Boolean(demoState) && showFocused;

            return (
              <ToggleGroup.Item
                asChild
                key={option.value}
                value={option.value}
                disabled={showDisabled}
              >
                <motion.button
                  type="button"
                  onHoverStart={() => !demoState && setHoveredValue(option.value)}
                  onHoverEnd={() => !demoState && setHoveredValue(null)}
                  onFocus={() => !demoState && setFocusedValue(option.value)}
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
                          duration: hds.motion.productive.duration,
                          ease: hds.motion.productive.easing,
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
                    }),
                    demoFocusRing && segmentedControlFocusRingVariants({ variant }),
                  )}
                  // inline-ok: segmentPaddingX is a consumer-overridable runtime CSSProperties value (not a static token) — can't be expressed as a static Tailwind class
                  style={{
                    paddingLeft: resolvedSegmentPaddingX,
                    paddingRight: resolvedSegmentPaddingX,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className={segmentedControlIndicatorVariants({
                      variant,
                      active,
                      interaction,
                      disabled: showDisabled,
                    })}
                  />
                  <span className={segmentedControlLabelVariants()}>{option.label}</span>
                  {option.description && (
                    <span
                      className={segmentedControlDescriptionVariants({
                        variant,
                        active,
                        interaction,
                        disabled: showDisabled,
                      })}
                    >
                      {option.description}
                    </span>
                  )}
                </motion.button>
              </ToggleGroup.Item>
            );
          })}
        </ToggleGroup.Root>
      </div>
    );
  },
);

/** @internal — CVA variant helpers; compose via SegmentedControl props instead. */
export {
  segmentedControlWrapperVariants,
  segmentedControlRailVariants,
  segmentedControlItemVariants,
  segmentedControlIndicatorVariants,
  segmentedControlDescriptionVariants,
  segmentedControlFocusRingVariants,
  segmentedControlLabelVariants,
};
