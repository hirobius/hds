/**
 * HdsToggle — boolean on/off toggle with animated thumb.
 * @category Inputs
 * @tier primitive
 */

import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { motion } from 'motion/react';
import { cva } from 'class-variance-authority';
import hds from '../design-system/tokens';
import { cn } from '../../lib/utils';
import { useFrozenState } from '../context/DemoStateContext';
import { useInteractionState, type InteractionVisualState } from '../hooks/useInteractionState';

/** HdsToggle — boolean on/off toggle with animated thumb. */
export type HdsToggleDemoState = 'rest' | 'hover' | 'focused' | 'pressed' | 'disabled';

// ── Variants ───────────────────────────────────────────────────────────────────
// `state` mirrors InteractionVisualState (see checkbox.tsx for the rationale on
// keeping this a JS-driven cva axis rather than Tailwind pseudo-classes — the
// frozen demo state feature needs a JS-resolved state, not real CSS pseudo-classes).

/** Root label chrome — hover/press tint, focus ring, cursor affordance. */
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven spacing/radius/color; var()-based, no Tailwind-theme utility exists
const toggleRootVariants = cva(
  'flex items-center gap-[var(--semantic-space-subgrid-gap)] rounded-[var(--semantic-radius-action)] py-[var(--semantic-space-subgrid-gap)] px-[var(--semantic-space-component-gap)] outline-offset-2 select-none',
  {
    variants: {
      state: {
        rest: 'cursor-pointer bg-transparent',
        hover: 'cursor-pointer bg-[var(--semantic-color-surface-accentSubtle)]',
        focused:
          'cursor-pointer bg-transparent [outline:var(--primitive-borderWidth-sm)_solid_var(--semantic-color-border-accent)]',
        pressed: 'cursor-pointer bg-[var(--semantic-color-surface-accentSubtle)]',
        disabled: 'cursor-default bg-[var(--semantic-color-surface-raised)]',
      },
    },
    defaultVariants: { state: 'rest' },
  },
);

/** Native checkbox — static token sizing + cursor affordance. */
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven size/color; var()-based, no Tailwind-theme utility exists
const toggleInputVariants = cva(
  'w-[var(--primitive-size-16)] h-[var(--primitive-size-16)] shrink-0 accent-[var(--semantic-color-surface-accent)]',
  {
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
  },
);

interface ToggleProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'checked' | 'onChange'
> {
  /** Toggle label displayed next to the control. */
  label: string;
  /** Current checked state. */
  checked: boolean;
  /** Called when the toggle changes. */
  onChange: (v: boolean) => void;
}

export const HdsToggle = forwardRef<HTMLInputElement, ToggleProps>(function HdsToggle(
  { label, checked, onChange, onFocus, onBlur, disabled, ...rest },
  ref,
) {
  const frozenState = useFrozenState();
  // Shared single-element interaction machine (ADR-015). The hook honors the
  // real `disabled` prop as well as the frozen demo state.
  const { visualState, isHover, isFocused, isPressed, isDisabled, handlers } = useInteractionState({
    disabled,
    frozenState: frozenState as InteractionVisualState | null,
  });

  return (
    <motion.label
      whileTap={isDisabled ? undefined : { scale: 0.99 }}
      transition={{ duration: hds.motion.productive.duration, ease: hds.motion.productive.easing }}
      onMouseEnter={handlers.onMouseEnter}
      onMouseLeave={handlers.onMouseLeave}
      onPointerDown={handlers.onPointerDown}
      onPointerUp={handlers.onPointerUp}
      onPointerCancel={handlers.onPointerCancel}
      animate={{
        y: isPressed ? hds.space.px1 : 0,
      }}
      className={toggleRootVariants({ state: visualState })}
    >
      <motion.span
        animate={{
          scale: isPressed ? 0.96 : isHover || isFocused ? 1.04 : 1,
        }}
        transition={{
          duration: hds.motion.productive.duration,
          ease: hds.motion.productive.easing,
        }}
        className="inline-flex shrink-0"
      >
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.checked)}
          onFocus={(e) => {
            handlers.onFocus();
            onFocus?.(e);
          }}
          onBlur={(e) => {
            handlers.onBlur();
            onBlur?.(e);
          }}
          className={cn('hds-focus', toggleInputVariants({ state: visualState }))}
          {...rest}
        />
      </motion.span>
      <motion.span
        className="text-secondary"
        animate={{
          x: isPressed ? hds.space.px1 : 0,
        }}
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
