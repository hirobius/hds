/**
 * HdsRadio — radio button with animated selection indicator.
 * @category Inputs
 * @tier primitive
 * @figma https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=36-17
 */

import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { motion } from 'motion/react';
import { cva } from 'class-variance-authority';
import hds from '../design-system/tokens';
import { cn } from '../../lib/utils';
import { useFrozenState } from '../context/DemoStateContext';
import { useHdsMotion } from '../hooks/useHdsMotion';
import { useInteractionState, type InteractionVisualState } from '../hooks/useInteractionState';

/** HdsRadio — radio button with animated selection indicator. */
export type HdsRadioDemoState = 'rest' | 'hover' | 'focused' | 'pressed' | 'disabled';

// ── Variants ───────────────────────────────────────────────────────────────────
// `state` mirrors InteractionVisualState (see checkbox.tsx for the rationale on
// keeping this a JS-driven cva axis rather than Tailwind pseudo-classes).

/** Visually-hidden native input overlay — cursor affordance only. */
const radioInputVariants = cva('absolute inset-0 m-0 opacity-0', {
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

/**
 * Root label chrome — position context for the absolutely-positioned native
 * input above, plus flex layout so the ring and label text sit on one row
 * with a real gap. A bare `<label>` defaults to `display: inline` (no
 * position, no gap), which is half of the #225 rendering bug — see
 * `radioRingVariants` below for the other half.
 */
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven gap; var()-based, no Tailwind-theme utility exists
const radioRootVariants = cva(
  'relative inline-flex items-center gap-[var(--semantic-space-subgrid-gap)] select-none',
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

/**
 * Selection ring — box model matches HdsCheckbox's glyph (see checkbox.tsx):
 * 20x20, `inline-flex` + centering so the declared size actually applies (a
 * bare `<span>` is `display: inline`, which ignores `width`/`height` — #225).
 * Color/border-color are driven by the `animate` prop below (framer-motion
 * inline style), not cva, so there's no state/on variant axis here — only
 * the static box model.
 */
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven size/radius/border; var()-based, no Tailwind-theme utility exists
const radioRingVariants = cva(
  // tier-ok: primitive.size.20 / primitive.radius.full mirror checkbox's glyph box model 1:1 — no semantic alias for either
  'inline-flex shrink-0 items-center justify-center w-[var(--primitive-size-20)] h-[var(--primitive-size-20)] rounded-[var(--primitive-radius-full)] border-solid border-[length:var(--primitive-borderWidth-sm)]',
);

/** Selected-state inner dot — static sizing; color is disabled-only (no animation). */
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven size/radius/color; var()-based, no Tailwind-theme utility exists
const radioDotVariants = cva(
  // `inline-block` is the other half of the #225 fix: the dot's declared
  // width/height are ignored under the browser's default `display: inline`.
  'inline-block w-[var(--primitive-size-8)] h-[var(--primitive-size-8)] rounded-[var(--primitive-radius-full)]',
  {
    variants: {
      disabled: {
        true: 'bg-[var(--semantic-color-content-disabled)]',
        false: 'bg-[var(--semantic-color-content-onAccent)]',
      },
    },
    defaultVariants: { disabled: false },
  },
);

interface RadioProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'checked' | 'onChange'
> {
  /** Radio label displayed next to the control. */
  label: string;
  /** Current checked state. */
  checked: boolean;
  /** Called when the radio changes. */
  onChange: (v: boolean) => void;
}

export const HdsRadio = forwardRef<HTMLInputElement, RadioProps>(function HdsRadio(
  {
    label,
    checked,
    onChange,
    disabled,
    style: _style,
    className: _className,
    onMouseEnter,
    onMouseLeave,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const frozenState = useFrozenState();
  // Shared single-element interaction machine (ADR-015), identical to HdsToggle.
  const { visualState, isHover, isFocused, isPressed, isDisabled, handlers } = useInteractionState({
    disabled,
    frozenState: frozenState as InteractionVisualState | null,
  });
  const productiveMotion = useHdsMotion('productive');
  const expressiveMotion = useHdsMotion('expressive');

  return (
    <motion.label
      whileTap={isDisabled ? undefined : { scale: 0.99 }}
      transition={{ duration: productiveMotion.duration, ease: productiveMotion.easing }}
      className={radioRootVariants({ state: visualState })}
    >
      <input
        ref={ref}
        type="radio"
        checked={checked}
        disabled={isDisabled}
        onChange={(e) => onChange(e.target.checked)}
        onMouseEnter={(e) => {
          handlers.onMouseEnter();
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          handlers.onMouseLeave();
          onMouseLeave?.(e);
        }}
        onPointerDown={(e) => {
          handlers.onPointerDown();
          onPointerDown?.(e);
        }}
        onPointerUp={(e) => {
          handlers.onPointerUp();
          onPointerUp?.(e);
        }}
        onPointerCancel={(e) => {
          handlers.onPointerCancel();
          onPointerCancel?.(e);
        }}
        onFocus={(e) => {
          handlers.onFocus();
          onFocus?.(e);
        }}
        onBlur={(e) => {
          handlers.onBlur();
          onBlur?.(e);
        }}
        className={cn('hds-focus', radioInputVariants({ state: visualState }))}
        {...rest}
      />
      <motion.span
        aria-hidden="true"
        className={radioRingVariants()}
        animate={{
          scale: isPressed ? 0.94 : isHover || isFocused ? 1.04 : 1,
          backgroundColor:
            checked && !isDisabled ? 'var(--semantic-color-surface-accent)' : 'transparent',
          borderColor:
            checked || isFocused || isHover || isPressed
              ? 'var(--semantic-color-border-accent)'
              : 'var(--semantic-color-content-secondary)',
        }}
        transition={{
          duration: productiveMotion.duration,
          ease: productiveMotion.easing,
        }}
      >
        {checked && (
          <motion.span
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{
              duration: expressiveMotion.duration,
              ease: productiveMotion.easing,
            }}
            className={radioDotVariants({ disabled: isDisabled })}
          />
        )}
      </motion.span>
      <motion.span
        animate={{
          x: isPressed ? hds.space.px1 : 0,
        }}
        transition={{
          duration: productiveMotion.duration,
          ease: productiveMotion.easing,
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
