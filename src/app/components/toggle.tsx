/**
 * HdsToggle — boolean on/off toggle with animated thumb.
 * @category Inputs
 * @tier primitive
 */

import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { motion } from 'motion/react';
import hds from '../design-system/tokens';
import { useFrozenState } from '../context/DemoStateContext';
import { useInteractionState, type InteractionVisualState } from '../hooks/useInteractionState';

/** HdsToggle — boolean on/off toggle with animated thumb. */
export type HdsToggleDemoState = 'rest' | 'hover' | 'focused' | 'pressed' | 'disabled';

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
  const { isHover, isFocused, isPressed, isDisabled, handlers } = useInteractionState({
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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: hds.semantic.space.subgrid.gap,
        paddingTop: hds.semantic.space.subgrid.gap,
        paddingBottom: hds.semantic.space.subgrid.gap,
        paddingLeft: hds.semantic.space.component.gap,
        paddingRight: hds.semantic.space.component.gap,
        borderRadius: hds.borderRadius.action,
        cursor: isDisabled ? 'default' : 'pointer',
        userSelect: 'none',
        background: isDisabled
          ? 'var(--semantic-color-surface-raised)'
          : isHover || isPressed
            ? 'var(--semantic-color-surface-accentSubtle)'
            : 'transparent',
        outline: isFocused
          ? `${hds.borderWidth.sm} solid var(--semantic-color-border-accent)`
          : 'none',
        outlineOffset: '2px',
      }}
    >
      <motion.span
        animate={{
          scale: isPressed ? 0.96 : isHover || isFocused ? 1.04 : 1,
        }}
        transition={{
          duration: hds.motion.productive.duration,
          ease: hds.motion.productive.easing,
        }}
        style={{ display: 'inline-flex', flexShrink: 0 }}
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
          className="hds-focus"
          style={{
            accentColor: 'var(--semantic-color-surface-accent)',
            width: hds.size[16],
            height: hds.size[16],
            cursor: isDisabled ? 'default' : 'pointer',
            flexShrink: 0,
          }}
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
