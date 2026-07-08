/**
 * HdsCheckbox — custom-drawn checkbox with check / indeterminate glyph.
 * @category Inputs
 * @tier primitive
 */

import { forwardRef, useEffect, useRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { motion } from 'motion/react';
import { cva } from 'class-variance-authority';
import { Check, Minus } from 'lucide-react';
import hds from '../design-system/tokens';
import { useFrozenState } from '../context/DemoStateContext';
import { useInteractionState, type InteractionVisualState } from '../hooks/useInteractionState';
import { Icon } from './icon';

/** HdsCheckbox — custom-drawn checkbox with check / indeterminate glyph. */
export type HdsCheckboxDemoState = 'rest' | 'hover' | 'focused' | 'pressed' | 'disabled';

// ── Variants ───────────────────────────────────────────────────────────────────
// `state` mirrors useInteractionState's InteractionVisualState — the shared
// hover/press/focus/disabled machine (ADR-015) that also drives the frozen
// demo state used by Storybook/docs screenshots. Kept as a JS-driven cva axis
// (not Tailwind pseudo-classes) so freezing an arbitrary visual state for
// docs still works — see docs/architecture/variant-contract.md "State matrix"
// for the general rule and why this component is the documented exception.

/** Root label chrome — hover/press tint + cursor affordance. */
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven spacing/radius/color; var()-based, no Tailwind-theme utility exists
const checkboxRootVariants = cva(
  'relative inline-flex items-center gap-[var(--semantic-space-subgrid-gap)] rounded-[var(--semantic-radius-action)] py-[var(--semantic-space-subgrid-gap)] px-[var(--semantic-space-component-gap)] select-none',
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
const checkboxInputVariants = cva('absolute inset-0 m-0 opacity-0', {
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
const checkboxGlyphVariants = cva(
  'inline-flex shrink-0 items-center justify-center w-[var(--primitive-size-20)] h-[var(--primitive-size-20)] rounded-[var(--primitive-radius-4)] border-solid border-[length:var(--primitive-borderWidth-sm)] outline-offset-2',
  {
    variants: {
      state: {
        rest: '',
        hover: '',
        focused:
          '[outline:var(--primitive-borderWidth-sm)_solid_var(--semantic-color-border-accent)]',
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

interface CheckboxProps extends Omit<
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

export const HdsCheckbox = forwardRef<HTMLInputElement, CheckboxProps>(function HdsCheckbox(
  { label, checked, onChange, indeterminate = false, onFocus, onBlur, disabled, ...rest },
  ref,
) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const frozenState = useFrozenState();
  // Shared single-element interaction machine (ADR-015) — same seam as Toggle/Radio.
  const { visualState, isHover, isFocused, isPressed, isDisabled, handlers } = useInteractionState({
    disabled,
    frozenState: frozenState as InteractionVisualState | null,
  });

  // `indeterminate` is a DOM property, not an attribute — set it imperatively.
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const isOn = checked || indeterminate;
  const glyphColor = isDisabled
    ? 'var(--semantic-color-content-disabled)'
    : 'var(--semantic-color-content-onAccent)';

  return (
    <motion.label
      whileTap={isDisabled ? undefined : { scale: 0.99 }}
      transition={{ duration: hds.motion.productive.duration, ease: hds.motion.productive.easing }}
      onMouseEnter={handlers.onMouseEnter}
      onMouseLeave={handlers.onMouseLeave}
      onPointerDown={handlers.onPointerDown}
      onPointerUp={handlers.onPointerUp}
      onPointerCancel={handlers.onPointerCancel}
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
        onFocus={(e) => {
          handlers.onFocus();
          onFocus?.(e);
        }}
        onBlur={(e) => {
          handlers.onBlur();
          onBlur?.(e);
        }}
        className={checkboxInputVariants({ state: visualState })}
        {...rest}
      />
      <motion.span
        aria-hidden="true"
        animate={{ scale: isPressed ? 0.94 : isHover || isFocused ? 1.04 : 1 }}
        transition={{
          duration: hds.motion.productive.duration,
          ease: hds.motion.productive.easing,
        }}
        className={checkboxGlyphVariants({ state: visualState, on: isOn })}
        // motion-ok: background-color/border-color swap on state change; the CSS
        // transition (not a framer `animate` target) is left inline so the color
        // fade keeps working even though the colors themselves now live in cva.
        style={{
          transition: `background-color ${hds.motion.productive.duration}s ease, border-color ${hds.motion.productive.duration}s ease`,
        }}
      >
        {indeterminate ? (
          <Icon icon={Minus} size={14} color={glyphColor} aria-hidden />
        ) : checked ? (
          <Icon icon={Check} size={14} color={glyphColor} aria-hidden />
        ) : null}
      </motion.span>
      <motion.span
        className="text-secondary"
        animate={{ x: isPressed ? hds.space.px1 : 0 }}
        transition={{
          duration: hds.motion.productive.duration,
          ease: hds.motion.productive.easing,
        }}
        style={{
          ...hds.typeStyles.ui,
          color: isDisabled
            ? 'var(--semantic-color-content-disabled)'
            : 'var(--semantic-color-content-primary)',
        }}
      >
        {label}
      </motion.span>
    </motion.label>
  );
});
