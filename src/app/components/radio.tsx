/**
 * HdsRadio — radio button with animated selection indicator.
 * @category Inputs
 * @tier primitive
 */

import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { motion } from 'motion/react';
import hds from '../design-system/tokens';
import { useFrozenState } from '../context/DemoStateContext';
import { useInteractionState, type InteractionVisualState } from '../hooks/useInteractionState';

/** HdsRadio — radio button with animated selection indicator. */
export type HdsRadioDemoState = 'rest' | 'hover' | 'focused' | 'pressed' | 'disabled';

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
  const { isHover, isFocused, isPressed, isDisabled, handlers } = useInteractionState({
    disabled,
    frozenState: frozenState as InteractionVisualState | null,
  });

  return (
    <motion.label
      whileTap={isDisabled ? undefined : { scale: 0.99 }}
      transition={{ duration: hds.motion.productive.duration, ease: hds.motion.productive.easing }}
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
        className="hds-focus"
        style={{
          position: 'absolute',
          inset: 0,
          margin: 0,
          opacity: 0,
          cursor: isDisabled ? 'default' : 'pointer',
        }}
        {...rest}
      />
      <motion.span
        aria-hidden="true"
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
          duration: hds.motion.productive.duration,
          ease: hds.motion.productive.easing,
        }}
      >
        {checked && (
          <motion.span
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{
              duration: hds.motion.expressive.duration,
              ease: hds.motion.productive.easing,
            }}
            style={{
              width: hds.size[8],
              height: hds.size[8],
              borderRadius: hds.borderRadius.full,
              background: isDisabled
                ? 'var(--semantic-color-content-disabled)'
                : 'var(--semantic-color-content-onAccent)',
            }}
          />
        )}
      </motion.span>
      <motion.span
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
