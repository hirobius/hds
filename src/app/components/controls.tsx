/**
 * Controls — shared input/control primitives.
 * @category Inputs
 * @tier primitive
 */

import { useState, forwardRef, useEffect, useRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import type { Variants } from 'motion/react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';
import hds from '../design-system/tokens';
import { useFrozenState } from '../context/DemoStateContext';
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
  { label, checked, onChange, onFocus, onBlur, ...rest },
  ref,
) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const frozenState = useFrozenState();
  const effectiveDemoState = frozenState as HdsToggleDemoState | null;
  const isDisabled = effectiveDemoState === 'disabled';
  const visualState =
    effectiveDemoState ??
    (isDisabled
      ? 'disabled'
      : pressed
        ? 'pressed'
        : hovered
          ? 'hover'
          : focused
            ? 'focused'
            : 'rest');
  const isHover = visualState === 'hover';
  const isFocused = visualState === 'focused';
  const isPressed = visualState === 'pressed';

  return (
    <motion.label
      whileTap={isDisabled ? undefined : { scale: 0.99 }}
      transition={{ duration: hds.motion.productive.duration, ease: hds.motion.productive.easing }}
      onMouseEnter={(_e) => {
        setHovered(true);
      }}
      onMouseLeave={(_e) => {
        setHovered(false);
        setPressed(false);
      }}
      onPointerDown={(_e) => {
        setPressed(true);
      }}
      onPointerUp={(_e) => {
        setPressed(false);
      }}
      onPointerCancel={(_e) => {
        setPressed(false);
      }}
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
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            setPressed(false);
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
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const frozenState = useFrozenState();
  const demoState = frozenState as HdsRadioDemoState | null;

  const visualState: HdsRadioDemoState =
    demoState ??
    (disabled
      ? 'disabled'
      : pressed
        ? 'pressed'
        : hovered
          ? 'hover'
          : focused
            ? 'focused'
            : 'rest');
  const isDisabled = disabled || visualState === 'disabled';
  const isHover = visualState === 'hover';
  const isFocused = visualState === 'focused';
  const isPressed = visualState === 'pressed';

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
          setHovered(true);
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          setHovered(false);
          setPressed(false);
          onMouseLeave?.(e);
        }}
        onPointerDown={(e) => {
          setPressed(true);
          onPointerDown?.(e);
        }}
        onPointerUp={(e) => {
          setPressed(false);
          onPointerUp?.(e);
        }}
        onPointerCancel={(e) => {
          setPressed(false);
          onPointerCancel?.(e);
        }}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          setPressed(false);
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
/** HdsSelect — animated dropdown selector with keyboard navigation. */
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
  const [open, setOpen] = useState(false);
  const [hov, setHov] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? options[0];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocusIdx(-1);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
        setFocusIdx(-1);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setFocusIdx(-1);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx((i) => Math.min(i + 1, options.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (focusIdx >= 0) {
        onChange(options[focusIdx].value);
        setOpen(false);
        setFocusIdx(-1);
      }
    }
  }

  // Stagger variants
  const listVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.03, delayChildren: 0.01 } },
    exit: { transition: { staggerChildren: 0.02, staggerDirection: -1 as const } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: -4 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: hds.motion.expressive.duration, ...hds.motion.expressive.easing },
    },
    exit: { opacity: 0, y: -2, transition: { duration: hds.motion.productive.duration } },
  };

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}
    >
      {/* Label */}
      {showLabel ? (
        <span
          className="text-secondary"
          style={{ ...hds.typeStyles.caption, marginBottom: hds.semantic.space.component.gap }}
        >
          {label}
        </span>
      ) : null}

      {/* Trigger button */}
      <motion.button
        ref={ref}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={showLabel && label ? `${label}: ${selected.label}` : selected.label}
        onClick={() => {
          setOpen((o) => !o);
          setFocusIdx(-1);
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        onKeyDown={handleKeyDown}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: hds.motion.productive.duration }}
        className="hds-focus"
        style={{
          ...hds.typeStyles.ui,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: hds.semantic.space.component.gap,
          background:
            hov || open
              ? 'var(--semantic-color-surface-accentSubtle)'
              : 'var(--semantic-color-surface-raised)',
          border: `${hds.borderWidth.default} solid ${hov || open ? 'var(--semantic-color-border-accent)' : 'var(--semantic-color-border-default)'}`,
          color: 'var(--semantic-color-content-primary)',
          paddingTop: hds.semantic.space.component.gap,
          paddingBottom: hds.semantic.space.component.gap,
          paddingLeft: hds.semantic.space.component.padding,
          paddingRight: hds.semantic.space.component.padding,
          borderRadius: hds.borderRadius.action,
          width: '100%',
          cursor: 'pointer',
          boxSizing: 'border-box',
          boxShadow:
            hov || open
              ? `inset 0 0 0 ${hds.borderWidth.default} var(--semantic-color-border-accent)`
              : 'none',
          transition: `border-color ${hds.motion.productive.duration}s ${hds.motion.productive.easing}, background-color ${hds.motion.productive.duration}s ${hds.motion.productive.easing}`,
          textAlign: 'left',
        }}
      >
        <span
          style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {selected.label}
        </span>
        <span
          style={{
            flexShrink: 0,
            display: 'flex',
            color: 'var(--semantic-color-content-secondary)',
            transition: `transform ${hds.motion.productive.duration}s ${hds.motion.productive.easing}`,
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        >
          <Icon icon={ChevronDown} size="small" color="currentColor" />
        </span>
      </motion.button>

      {/* Animated dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-label={label}
            onMouseLeave={() => setFocusIdx(-1)}
            initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.97 }}
            transition={{
              duration: hds.motion.expressive.duration,
              ...hds.motion.expressive.easing,
            }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: hds.zIndex.overlay,
              // Theme-aware surface var (re-roots under [data-theme="dark"]); the prior
              // isDark branch was dead — both refs resolved to this same var.
              background: 'var(--semantic-color-surface-raised)',
              border: `${hds.borderWidth.default} solid var(--semantic-color-border-default)`,
              borderRadius: hds.borderRadius[8],
              overflow: 'hidden',
              marginTop: hds.semantic.space.subgrid.gap,
              transformOrigin: 'top',
            }}
          >
            <motion.div variants={listVariants} initial="hidden" animate="visible" exit="exit">
              {options.map((opt, idx) => (
                <SelectOption
                  key={opt.value}
                  option={opt}
                  isSelected={opt.value === value}
                  isFocused={idx === focusIdx}
                  variants={itemVariants}
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setFocusIdx(-1);
                  }}
                  onHover={() => setFocusIdx(idx)}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ── SelectOption ──────────────────────────────────────────────────────────────

function SelectOption({
  option,
  isSelected,
  isFocused,
  variants,
  onSelect,
  onHover,
}: {
  option: { value: string; label: string };
  isSelected: boolean;
  isFocused: boolean;
  variants: Variants;
  onSelect: () => void;
  onHover: () => void;
}) {
  const activeBackground = 'var(--semantic-color-surface-accentSubtle)';

  return (
    <motion.button
      role="option"
      aria-selected={isSelected}
      type="button"
      variants={variants}
      onClick={onSelect}
      onMouseEnter={onHover}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        background: isSelected
          ? activeBackground
          : isFocused
            ? activeBackground
            : 'var(--semantic-color-surface-overlay)',
        border: 'none',
        paddingTop: hds.semantic.space.component.gap,
        paddingBottom: hds.semantic.space.component.gap,
        paddingLeft: hds.semantic.space.component.padding,
        paddingRight: hds.semantic.space.component.padding,
        cursor: 'pointer',
        color: 'var(--semantic-color-content-primary)',
        transition: `background ${hds.motion.productive.duration}s ${hds.motion.productive.easing}, color ${hds.motion.productive.duration}s ${hds.motion.productive.easing}`,
        textAlign: 'left',
      }}
    >
      <span style={{ ...hds.typeStyles.ui }}>{option.label}</span>

      <AnimatePresence>
        {isSelected && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              duration: hds.motion.expressive.duration,
              ...hds.motion.expressive.easing,
            }}
            style={{ display: 'flex', color: 'var(--semantic-accent-rest)', flexShrink: 0 }}
          >
            <Icon icon={Check} size="small" color="var(--semantic-accent-rest)" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
