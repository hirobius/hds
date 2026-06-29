/**
 * HdsCheckbox — custom-drawn checkbox with check / indeterminate glyph.
 * @category Inputs
 * @tier primitive
 */

import { forwardRef, useEffect, useRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { motion } from 'motion/react';
import { Check, Minus } from 'lucide-react';
import hds from '../design-system/tokens';
import { useFrozenState } from '../context/DemoStateContext';
import { useInteractionState, type InteractionVisualState } from '../hooks/useInteractionState';
import { Icon } from './icon';

/** HdsCheckbox — custom-drawn checkbox with check / indeterminate glyph. */
export type HdsCheckboxDemoState = 'rest' | 'hover' | 'focused' | 'pressed' | 'disabled';

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'checked' | 'onChange'> {
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
  const { isHover, isFocused, isPressed, isDisabled, handlers } = useInteractionState({
    disabled,
    frozenState: frozenState as InteractionVisualState | null,
  });

  // `indeterminate` is a DOM property, not an attribute — set it imperatively.
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const isOn = checked || indeterminate;
  const borderColor = isDisabled
    ? 'var(--semantic-color-border-default)'
    : isOn || isHover || isFocused || isPressed
      ? 'var(--semantic-color-border-accent)'
      : 'var(--semantic-color-content-secondary)';
  const background = isOn && !isDisabled ? 'var(--semantic-color-surface-accent)' : 'transparent';
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
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: hds.semantic.space.subgrid.gap,
        paddingTop: hds.semantic.space.subgrid.gap,
        paddingBottom: hds.semantic.space.subgrid.gap,
        paddingLeft: hds.semantic.space.component.gap,
        paddingRight: hds.semantic.space.component.gap,
        borderRadius: hds.borderRadius.action,
        cursor: isDisabled ? 'default' : 'pointer',
        userSelect: 'none',
        background:
          isHover || isPressed ? 'var(--semantic-color-surface-accentSubtle)' : 'transparent',
      }}
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
        animate={{ scale: isPressed ? 0.94 : isHover || isFocused ? 1.04 : 1 }}
        transition={{ duration: hds.motion.productive.duration, ease: hds.motion.productive.easing }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: hds.size[20],
          height: hds.size[20],
          borderRadius: hds.borderRadius[4],
          border: `${hds.borderWidth.sm} solid ${borderColor}`,
          background,
          outline: isFocused
            ? `${hds.borderWidth.sm} solid var(--semantic-color-border-accent)`
            : 'none',
          outlineOffset: '2px',
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
        transition={{ duration: hds.motion.productive.duration, ease: hds.motion.productive.easing }}
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
