/**
 * Checkbox — custom-drawn checkbox with check / indeterminate glyph.
 * @category Inputs
 * @tier primitive
 * @usage Let people tick one or more independent options, or a parent choice that is partly selected.
 * @whenNot An immediate on/off setting, or a choice of exactly one option from a set.
 * @useInstead Toggle a setting that applies as soon as it flips
 * @useInstead Radio exactly one choice from a set
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=35-29
 * @a11y component required a11y:checkbox.space-toggles Space toggles the checkbox from the keyboard (it is a native input).
 * @a11y component required a11y:checkbox.name-and-state The checkbox is named by its label and reports aria-checked=mixed when indeterminate.
 * @a11y component required a11y:checkbox.disabled-skipped A disabled checkbox is skipped by Tab.
 * @a11y component required a11y:checkbox.sr-state A screen reader speaks the name with checked, not checked or partially checked.
 * @a11y component required a11y:checkbox.focus-ring The focus ring shows on keyboard focus only (:focus-visible) and hover never hides it.
 * @a11y component required a11y:checkbox.target-size The row is 24px or taller and lifts to the 44px touch minimum on a phone (WCAG 2.5.8).
 * @a11y component required gate:check-reduced-motion The check animation goes through useHdsMotion, so it stops under prefers-reduced-motion.
 * @a11y consumer required Put related checkboxes in a fieldset with a legend so the group has a name.
 */

import { forwardRef, useEffect, useRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { motion } from 'motion/react';
import { cva } from 'class-variance-authority';
import { Check, Minus } from 'lucide-react';
import { useHdsMotion } from '../hooks/useHdsMotion';
import { forwardFocusHandlers } from '../hooks/useInteractionState';
import { CONTROL_COLOR_FADE } from './control-color-fade';
import { ControlLabel, ControlLabelText, useControlInteraction } from './control-label';
import { Icon } from './icon';

/** Checkbox — custom-drawn checkbox with check / indeterminate glyph. */
export type HdsCheckboxDemoState = 'rest' | 'hover' | 'focused' | 'pressed' | 'disabled';

// ── Variants ───────────────────────────────────────────────────────────────────
// `state` mirrors useInteractionState's InteractionVisualState — the shared
// hover/press/focus/disabled machine (ADR-015) that also drives the frozen
// demo state used by docs screenshots. Kept as a JS-driven cva axis
// (not Tailwind pseudo-classes) so freezing an arbitrary visual state for
// docs still works — see docs/architecture/variant-contract.md "State matrix"
// for the general rule and why this component is the documented exception.

/** Root label chrome — hover/press tint + cursor affordance. */
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven spacing/radius/color; var()-based, no Tailwind-theme utility exists
const checkboxRootVariants = /* @__PURE__ */ cva(
  'relative inline-flex items-center gap-scale-xs rounded-md py-[var(--semantic-space-subgrid-gap)] select-none hds-touch-row',
  {
    variants: {
      state: {
        rest: 'cursor-pointer bg-transparent',
        hover: 'cursor-pointer bg-[var(--semantic-color-surface-accentSubtle)]',
        focused: 'cursor-pointer bg-transparent',
        pressed: 'cursor-pointer bg-[var(--semantic-color-surface-accentSubtle)]',
        disabled: 'cursor-default bg-transparent',
      },
    },
    defaultVariants: { state: 'rest' },
  },
);

/** Visually-hidden native input overlay — cursor affordance only. */
const checkboxInputVariants = /* @__PURE__ */ cva('absolute inset-0 m-0 opacity-0', {
  variants: {
    state: {
      rest: 'cursor-pointer',
      hover: 'cursor-pointer',
      focused: 'cursor-pointer',
      pressed: 'cursor-pointer',
      disabled: 'cursor-default',
    },
  },
  defaultVariants: { state: 'rest' },
});

/** Glyph box — border/background driven by `state` (interaction) x `on` (checked/indeterminate). */
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven size/radius/border/color; var()-based, no Tailwind-theme utility exists
const checkboxGlyphVariants = /* @__PURE__ */ cva(
  'inline-flex shrink-0 items-center justify-center w-[var(--semantic-size-control-md)] h-[var(--semantic-size-control-md)] rounded-[var(--semantic-radius-control)] border-solid border-[length:var(--semantic-borderWidth-emphasis)]',
  {
    variants: {
      state: {
        rest: '',
        hover: '',
        focused:
          // The shared ring (semantic.focus.*), drawn from the interaction state.
          'hds-focus-ring',
        pressed: '',
        disabled: '',
      },
      on: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        state: 'disabled',
        className: 'border-[color:var(--semantic-color-border-default)] bg-transparent',
      },
      {
        state: 'rest',
        on: false,
        className: 'border-[color:var(--semantic-color-content-secondary)]',
      },
      {
        state: ['hover', 'pressed'],
        className: 'border-[color:var(--semantic-color-border-accent)]',
      },
      { state: 'focused', className: 'border-[color:var(--semantic-color-border-accent)]' },
      { state: 'rest', on: true, className: 'border-[color:var(--semantic-color-border-accent)]' },
      {
        on: true,
        state: ['rest', 'hover', 'focused', 'pressed'],
        className: 'bg-[var(--semantic-color-surface-accent)]',
      },
      {
        on: false,
        state: ['rest', 'hover', 'focused', 'pressed'],
        className: 'bg-transparent',
      },
    ],
    defaultVariants: { state: 'rest', on: false },
  },
);

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'checked' | 'onChange'
> {
  /** Checkbox label displayed next to the control. */
  label: string;
  /** Current checked state. */
  checked: boolean;
  /** Called when the checkbox changes. */
  onChange: (v: boolean) => void;
  /** Mixed state — visually a dash; supersedes the check glyph. */
  indeterminate?: boolean;
}

/** Merge the forwarded ref with the local ref used to drive `.indeterminate`. */
function setRef(ref: React.ForwardedRef<HTMLInputElement>, node: HTMLInputElement | null) {
  if (typeof ref === 'function') ref(node);
  else if (ref) ref.current = node;
}

export const Checkbox = /* @__PURE__ */ forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    {
      label,
      checked,
      onChange,
      indeterminate = false,
      onFocus,
      onKeyDown,
      onBlur,
      disabled,
      ...rest
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    // Shared single-element interaction machine (ADR-015) — same seam as Toggle/Radio.
    const { visualState, isHover, isFocused, isPressed, isDisabled, handlers } =
      useControlInteraction(disabled);

    // `indeterminate` is a DOM property, not an attribute — set it imperatively.
    useEffect(() => {
      if (inputRef.current) inputRef.current.indeterminate = indeterminate;
    }, [indeterminate]);

    const isOn = checked || indeterminate;
    const glyphColor = isDisabled
      ? 'var(--semantic-color-content-disabled)'
      : 'var(--semantic-color-content-onAccent)';
    const productiveMotion = useHdsMotion('productive');

    return (
      <ControlLabel
        disabled={isDisabled}
        pointer={handlers}
        className={checkboxRootVariants({ state: visualState })}
      >
        {/* Visually-hidden native input drives state, keyboard, and a11y. */}
        <input
          ref={(node) => {
            inputRef.current = node;
            setRef(ref, node);
          }}
          type="checkbox"
          checked={checked}
          disabled={isDisabled}
          aria-checked={indeterminate ? 'mixed' : checked}
          onChange={(e) => onChange(e.target.checked)}
          {...forwardFocusHandlers(handlers, { onFocus, onKeyDown, onBlur })}
          className={checkboxInputVariants({ state: visualState })}
          {...rest}
        />
        <motion.span
          aria-hidden="true"
          animate={{ scale: isPressed ? 0.94 : isHover || isFocused ? 1.04 : 1 }}
          transition={{
            duration: productiveMotion.duration,
            ease: productiveMotion.easing,
          }}
          className={checkboxGlyphVariants({ state: visualState, on: isOn })}
          style={{
            transition: CONTROL_COLOR_FADE,
          }}
        >
          {indeterminate ? (
            <Icon icon={Minus} size={14} color={glyphColor} aria-hidden />
          ) : checked ? (
            <Icon icon={Check} size={14} color={glyphColor} aria-hidden />
          ) : null}
        </motion.span>
        <ControlLabelText
          pressed={isPressed}
          disabled={isDisabled}
          className="text-muted-foreground"
        >
          {label}
        </ControlLabelText>
      </ControlLabel>
    );
  },
);
