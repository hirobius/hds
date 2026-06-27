/**
 * Controls — shared input/control primitives.
 * @category Inputs
 * @tier primitive
 */

import { useState, forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { motion } from 'motion/react';
import * as RSelect from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import hds from '../design-system/tokens';
import { cn } from '../../lib/utils';
import { useFrozenState } from '../context/DemoStateContext';
import { useInteractionState, type InteractionVisualState } from '../hooks/useInteractionState';
import { Icon } from './icon';
import { Surface } from './surface';

// ── Slider ────────────────────────────────────────────────────────────────────

/** HdsSlider — range slider with label and value display. */
interface SliderProps {
  /** Slider label. */
  label: string;
  /** Minimum value in the range. */
  min: number;
  /** Maximum value in the range. */
  max: number;
  /** Step increment for the range input. */
  step?: number;
  /** Current slider value. */
  value: number;
  /** Called when the slider value changes. */
  onChange: (v: number) => void;
}

export const HdsSlider = forwardRef<HTMLInputElement, SliderProps>(function HdsSlider(
  { label, min, max, step = 1, value, onChange },
  ref,
) {
  const [isActive, setIsActive] = useState(false);
  const range = max - min;
  const progress = range <= 0 ? 0 : Math.min(Math.max((value - min) / range, 0), 1);
  const progressPercent = `${progress * 100}%`;

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: hds.semantic.space.component.gap }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: hds.semantic.space.component.gap,
        }}
      >
        <label
          style={{
            ...hds.typeStyles.ui,
            color: 'var(--semantic-color-content-primary)',
          }}
        >
          {label}
        </label>
        <motion.span
          key={value}
          className="text-secondary"
          initial={{ opacity: 0.72, y: hds.space.px2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: hds.motion.productive.duration,
            ease: hds.motion.productive.easing,
          }}
          style={{ ...hds.typeStyles.technical, flexShrink: 0 }}
        >
          {value}
        </motion.span>
      </div>
      <motion.div
        style={{
          position: 'relative',
          height: hds.size[20],
          ['display']: 'grid',
          alignItems: 'center',
        }}
      >
        <Surface
          aria-hidden="true"
          padding="component"
          style={{
            position: 'absolute',
            insetInline: 0,
            top: '50%',
            height: hds.size[8],
            transform: 'translateY(-50%)',
            background: 'var(--semantic-color-border-default)',
            overflow: 'hidden',
          }}
        >
          <motion.div
            animate={{
              width: progressPercent,
              opacity: isActive ? 1 : 0.92,
            }}
            transition={{
              duration: hds.motion.expressive.duration,
              ease: hds.motion.productive.easing,
            }}
            style={{
              height: '100%',
              borderRadius: hds.borderRadius.full,
              background: 'var(--semantic-color-surface-accent)',
            }}
          />
        </Surface>
        <input
          ref={ref}
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerDown={() => setIsActive(true)}
          onPointerUp={() => setIsActive(false)}
          onPointerCancel={() => setIsActive(false)}
          onBlur={() => setIsActive(false)}
          className="hds-focus hds-slider-input"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            margin: 0,
            background: 'transparent',
            accentColor: 'var(--semantic-color-surface-accent)',
            cursor: 'pointer',
            position: 'relative',
            zIndex: hds.zIndex.focus,
          }}
        />
      </motion.div>
    </div>
  );
});

// ── Toggle ────────────────────────────────────────────────────────────────────

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

// ── Radio ─────────────────────────────────────────────────────────────────────

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

// ── Select ────────────────────────────────────────────────────────────────────
/**
 * HdsSelect — dropdown selector built on Radix Select (ADR-001 Radix convention).
 * Radix owns the listbox a11y contract: managed focus + active-descendant, typeahead,
 * full keyboard (Home/End/PageUp-Down/wrap), Popper collision/flip positioning, and
 * dismissal. The HDS surface is styled with the token-backed Tailwind idiom used by
 * tabs.tsx / command-palette.tsx; `ref` targets the trigger button.
 */
interface SelectProps {
  /** Select label rendered above the control. */
  label: string;
  /** Controls whether the label is rendered. */
  showLabel?: boolean;
  /** Select options displayed in the dropdown. */
  options: { value: string; label: string }[];
  /** Currently selected value. */
  value: string;
  /** Called when the user picks a different option. */
  onChange: (v: string) => void;
}

export const HdsSelect = forwardRef<HTMLButtonElement, SelectProps>(function HdsSelect(
  { label, showLabel = true, options, value, onChange },
  ref,
) {
  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="flex flex-col">
      {showLabel ? (
        <span
          className="text-secondary"
          style={{ ...hds.typeStyles.caption, marginBottom: hds.semantic.space.component.gap }}
        >
          {label}
        </span>
      ) : null}

      <RSelect.Root value={value} onValueChange={onChange}>
        <RSelect.Trigger
          ref={ref}
          aria-label={showLabel && label ? `${label}: ${selected.label}` : selected.label}
          className={cn(
            'hds-focus group flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm',
            'border-input bg-muted text-foreground transition-colors',
            'hover:border-ring data-[state=open]:border-ring',
          )}
        >
          <RSelect.Value />
          <RSelect.Icon className="flex shrink-0 -rotate-90 text-muted-foreground transition-transform group-data-[state=open]:rotate-0">
            <Icon icon={ChevronDown} size="small" color="currentColor" />
          </RSelect.Icon>
        </RSelect.Trigger>

        <RSelect.Portal>
          <RSelect.Content
            position="popper"
            sideOffset={4}
            // Radix Popper vars: match trigger width and cap height to the
            // collision-aware available space (replaces the old fixed top:100% panel).
            style={{
              minWidth: 'var(--radix-select-trigger-width)',
              maxHeight: 'var(--radix-select-content-available-height)',
            }}
            className={cn(
              'z-50 overflow-hidden rounded-md border',
              'border-border bg-popover text-popover-foreground shadow-md',
            )}
          >
            <RSelect.Viewport className="p-1">
              {options.map((opt) => (
                <RSelect.Item
                  key={opt.value}
                  value={opt.value}
                  className={cn(
                    'hds-focus relative flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
                    'text-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
                  )}
                >
                  <RSelect.ItemText>{opt.label}</RSelect.ItemText>
                  <RSelect.ItemIndicator className="flex shrink-0">
                    <Icon icon={Check} size="small" color="currentColor" />
                  </RSelect.ItemIndicator>
                </RSelect.Item>
              ))}
            </RSelect.Viewport>
          </RSelect.Content>
        </RSelect.Portal>
      </RSelect.Root>
    </div>
  );
});
