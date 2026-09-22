/**
 * HdsToggle — boolean on/off toggle with animated thumb.
 * @category Inputs
 * @tier primitive
 * @figma https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=37-19
 */

import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { motion } from 'motion/react';
import { cva } from 'class-variance-authority';
import hds, { tokenValues } from '../design-system/tokens';
import { cn } from '../../lib/utils';
import { useFrozenState } from '../context/DemoStateContext';
import { useHdsMotion } from '../hooks/useHdsMotion';
import { useInteractionState, type InteractionVisualState } from '../hooks/useInteractionState';

/** HdsToggle — boolean on/off toggle with animated thumb. */
export type HdsToggleDemoState = 'rest' | 'hover' | 'focused' | 'pressed' | 'disabled';

// ── Geometry ───────────────────────────────────────────────────────────────────
// DESIGN.md: "Toggles — full (pill track + circular thumb)". Track/thumb sizes
// come from the primitive.size scale (no semantic alias exists yet for
// toggle-track geometry — same gap as checkbox/radio's glyph sizing). The
// thumb's travel distance is *derived* from those same token values rather
// than hardcoded, so it can never drift out of sync with the track/thumb/
// padding it's computed from (#225 — "sizing must come from tokens, never
// literals").
const px = (value: string) => parseFloat(value);
const TOGGLE_TRACK_WIDTH = px(tokenValues.primitive.size['40']); // 40
const TOGGLE_TRACK_HEIGHT = px(tokenValues.primitive.size['20']); // 20
const TOGGLE_THUMB_SIZE = px(tokenValues.primitive.size['16']); // 16
// Equal to --semantic-space-subgrid-xs (the token the track's own padding
// class below uses) — derived here, rather than re-parsed from the space
// scale, so the JS travel distance is provably consistent with what's
// actually painted: the thumb exactly fills the track's inner (padded) rail.
const TOGGLE_TRACK_PADDING = (TOGGLE_TRACK_HEIGHT - TOGGLE_THUMB_SIZE) / 2; // 2
const TOGGLE_THUMB_TRAVEL = TOGGLE_TRACK_WIDTH - TOGGLE_THUMB_SIZE - TOGGLE_TRACK_PADDING * 2; // 20

// ── Variants ───────────────────────────────────────────────────────────────────
// `state` mirrors InteractionVisualState (see checkbox.tsx for the rationale on
// keeping this a JS-driven cva axis rather than Tailwind pseudo-classes — the
// frozen demo state feature needs a JS-resolved state, not real CSS pseudo-classes).

/** Root label chrome — position context for the absolutely-positioned native
 * input below, hover/press tint, focus ring, cursor affordance. */
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven spacing/radius/color; var()-based, no Tailwind-theme utility exists
const toggleRootVariants = cva(
  'relative inline-flex items-center gap-[var(--semantic-space-subgrid-gap)] rounded-md py-[var(--semantic-space-subgrid-gap)] px-[var(--semantic-space-component-gap)] outline-offset-2 select-none',
  {
    variants: {
      state: {
        rest: 'cursor-pointer bg-transparent',
        hover: 'cursor-pointer bg-[var(--semantic-color-surface-accentSubtle)]',
        focused:
          'cursor-pointer bg-transparent [outline:var(--semantic-borderWidth-emphasis)_solid_var(--semantic-color-border-accent)]',
        pressed: 'cursor-pointer bg-[var(--semantic-color-surface-accentSubtle)]',
        disabled: 'cursor-default bg-[var(--semantic-color-surface-raised)]',
      },
    },
    defaultVariants: { state: 'rest' },
  },
);

/**
 * Visually-hidden native input overlay — cursor affordance + the real a11y/
 * keyboard/checked driver. Same `absolute inset-0 opacity-0` pattern as
 * checkbox.tsx/radio.tsx: it must stay a non-positioned sibling's *positioned*
 * overlay (anchored to `toggleRootVariants`'s `relative` above) so it keeps
 * receiving clicks across the whole row; the track/thumb below are purely
 * decorative (`aria-hidden`) and deliberately never become positioned
 * themselves (see `toggleTrackVariants`), or they'd paint over this input and
 * silently eat its clicks (CSS stacks positioned siblings above static ones,
 * regardless of DOM order).
 */
const toggleInputVariants = cva('absolute inset-0 m-0 opacity-0', {
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
 * Track — the pill-shaped switch body. This is the fix for #225 ("Toggle
 * renders as a 16x16 transparent box"): previously the *native* checkbox was
 * rendered directly and visibly (sized 16x16 via `accent-color`), which is a
 * native form-control affordance, not a drawn switch. Box model mirrors
 * checkbox.tsx's glyph (`inline-flex shrink-0`, border-solid, static — see
 * the input comment above for why "static" matters here); size/radius are
 * primitive tokens, on/off + disabled colors are semantic tokens.
 */
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven size/radius/border/padding; var()-based, no Tailwind-theme utility exists
const toggleTrackVariants = cva(
  // tier-ok: primitive.size.40 / primitive.size.20 / primitive.radius.full — no semantic alias for toggle-track geometry yet (same gap as checkbox/radio's glyph sizing)
  'inline-flex shrink-0 items-center rounded-[var(--primitive-radius-full)] border-solid border-[length:var(--primitive-borderWidth-sm)] p-[var(--semantic-space-subgrid-xs)] w-[var(--primitive-size-40)] h-[var(--primitive-size-20)]',
  {
    variants: {
      on: { true: '', false: '' },
      disabled: { true: '', false: '' },
    },
    compoundVariants: [
      // Every (on, disabled) pair is listed explicitly so exactly one compound
      // ever matches — no reliance on array order or a twMerge pass to break
      // ties between overlapping classes (see the segmented-control indicator
      // fix in this same PR for what happens when that discipline slips).
      {
        on: true,
        disabled: false,
        className:
          'bg-[var(--semantic-color-surface-accent)] border-[color:var(--semantic-color-border-accent)]',
      },
      {
        on: false,
        disabled: false,
        className: 'bg-transparent border-[color:var(--semantic-color-content-secondary)]',
      },
      {
        on: true,
        disabled: true,
        className:
          'bg-[var(--semantic-color-surface-raised)] border-[color:var(--semantic-color-border-default)]',
      },
      {
        on: false,
        disabled: true,
        className:
          'bg-[var(--semantic-color-surface-raised)] border-[color:var(--semantic-color-border-default)]',
      },
    ],
    defaultVariants: { on: false, disabled: false },
  },
);

/** Thumb — circular indicator that slides across the track. Sized to exactly
 * fill the track's inner (padded) rail; `block` is the same explicit-box-
 * display fix as radio.tsx's dot (a bare `<span>` is `display: inline` and
 * ignores `width`/`height`). Position is animated via framer's `animate={{x}}`
 * below (`TOGGLE_THUMB_TRAVEL`), not cva — it's a transform, not a class swap. */
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven size/radius/color; var()-based, no Tailwind-theme utility exists
const toggleThumbVariants = cva(
  // tier-ok: primitive.size.16 / primitive.radius.full — no semantic alias for toggle-thumb geometry yet
  'pointer-events-none block w-[var(--primitive-size-16)] h-[var(--primitive-size-16)] rounded-[var(--primitive-radius-full)] bg-[var(--semantic-color-surface-page)]',
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
  const productiveMotion = useHdsMotion('productive');

  return (
    <motion.label
      whileTap={isDisabled ? undefined : { scale: 0.99 }}
      transition={{ duration: productiveMotion.duration, ease: productiveMotion.easing }}
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
      <motion.span
        aria-hidden="true"
        animate={{
          scale: isPressed ? 0.96 : isHover || isFocused ? 1.04 : 1,
        }}
        transition={{
          duration: productiveMotion.duration,
          ease: productiveMotion.easing,
        }}
        // motion-ok: background-color/border-color swap on state change; the CSS
        // transition (not a framer `animate` target) is left inline so the color
        // fade keeps working even though the colors themselves now live in cva —
        // same technique as checkbox.tsx's glyph.
        style={{
          transition: `background-color ${productiveMotion.duration}s ease, border-color ${productiveMotion.duration}s ease`,
        }}
        className={toggleTrackVariants({ on: checked, disabled: isDisabled })}
      >
        <motion.span
          animate={{ x: checked ? TOGGLE_THUMB_TRAVEL : 0 }}
          transition={{
            duration: productiveMotion.duration,
            ease: productiveMotion.easing,
          }}
          className={toggleThumbVariants()}
        />
      </motion.span>
      <motion.span
        className="text-secondary"
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
