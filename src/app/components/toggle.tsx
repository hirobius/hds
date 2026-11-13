/**
 * Toggle — boolean on/off toggle with animated thumb.
 * @category Inputs
 * @tier primitive
 * @usage Switch one setting on or off, with the effect applying immediately.
 * @whenNot A choice that only takes effect after submitting a form, or picking from several options.
 * @useInstead Checkbox a form option confirmed on submit
 * @useInstead Radio one choice from a set
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=37-19
 * @a11y component required a11y:toggle.space-toggles Space flips the switch from the keyboard (it is a native input with role=switch).
 * @a11y component required a11y:toggle.sr-switch A screen reader speaks a switch with its name and on or off state.
 * @a11y component required a11y:toggle.disabled-skipped A disabled switch is skipped by Tab.
 * @a11y component required a11y:toggle.focus-ring The focus ring shows on keyboard focus only (:focus-visible) and hover never hides it.
 * @a11y component required a11y:toggle.target-size The row is 24px or taller and lifts to the 44px touch minimum on a phone (WCAG 2.5.8).
 * @a11y component required gate:check-reduced-motion The thumb slide goes through useHdsMotion, so it stops under prefers-reduced-motion.
 * @a11y consumer required Label the switch with the setting it controls, not with its state, because the state is already spoken.
 */

import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { LazyMotion, domAnimation, m } from 'motion/react';
import { cva } from 'class-variance-authority';
import { tokenValues } from '../design-system/generated-token-values';
import { subgrid } from '../design-system/component-tokens';
import { cn } from '../../lib/utils';
import { useHdsMotion } from '../hooks/useHdsMotion';
import { forwardFocusHandlers } from '../hooks/useInteractionState';
import { toggleTrackVariants, toggleThumbVariants } from './toggle-switch-styles';
import { CONTROL_COLOR_FADE } from './control-color-fade';
import { ControlLabel, ControlLabelText, useControlInteraction } from './control-label';

/** Toggle — boolean on/off toggle with animated thumb. */
export type HdsToggleDemoState = 'rest' | 'hover' | 'focused' | 'pressed' | 'disabled';

// ── Geometry ───────────────────────────────────────────────────────────────────
// DESIGN.md: "Toggles — full (pill track + circular thumb)". The track is
// semantic.size.control.md tall and twice that wide; the thumb fills the
// track's padded rail (hds#482). The thumb's travel distance is *derived*
// from those same token values rather than hardcoded, so it can never drift out of sync with the track/thumb/
// padding it's computed from (#225 — "sizing must come from tokens, never
// literals").
const px = (value: string) => parseFloat(value);
const TOGGLE_TRACK_HEIGHT = px(tokenValues.primitive.size['20']); // 20, semantic.size.control.md
const TOGGLE_TRACK_WIDTH = TOGGLE_TRACK_HEIGHT * 2; // 40 (w-[calc(control-md*2)])
// The track is border-box, so its border eats into the rail as much as its
// padding does. Travel once left the border out and the "on" thumb ran 2px
// past the track's right end; toggle.test.tsx now pins this math to the
// tokens the track and thumb classes paint with.
const TOGGLE_TRACK_BORDER = px(tokenValues.primitive.borderWidth.sm); // 2 (border-[length:--primitive-borderWidth-sm])
const TOGGLE_TRACK_PADDING = px(tokenValues.primitive.space.px2); // 2 (p-[--semantic-space-subgrid-xs])
const TOGGLE_TRACK_INSET = TOGGLE_TRACK_BORDER + TOGGLE_TRACK_PADDING; // 4
const TOGGLE_THUMB_SIZE = TOGGLE_TRACK_HEIGHT - TOGGLE_TRACK_INSET * 2; // 12 (h-full of the rail)
const TOGGLE_THUMB_TRAVEL = TOGGLE_TRACK_WIDTH - TOGGLE_THUMB_SIZE - TOGGLE_TRACK_INSET * 2; // 20

// ── Variants ───────────────────────────────────────────────────────────────────
// `state` mirrors InteractionVisualState (see checkbox.tsx for the rationale on
// keeping this a JS-driven cva axis rather than Tailwind pseudo-classes — the
// frozen demo state feature needs a JS-resolved state, not real CSS pseudo-classes).

/** Root label chrome — position context for the absolutely-positioned native
 * input below, hover/press tint, focus ring, cursor affordance. */
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven spacing/radius/color; var()-based, no Tailwind-theme utility exists
const toggleRootVariants = /* @__PURE__ */ cva(
  'relative inline-flex items-center gap-scale-xs rounded-md py-[var(--semantic-space-subgrid-gap)] select-none hds-touch-row',
  {
    variants: {
      state: {
        rest: 'cursor-pointer bg-transparent',
        hover: 'cursor-pointer bg-[var(--semantic-color-surface-accentSubtle)]',
        focused: 'cursor-pointer bg-transparent hds-focus-ring',
        pressed: 'cursor-pointer bg-[var(--semantic-color-surface-accentSubtle)]',
        disabled: 'cursor-default bg-transparent',
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
const toggleInputVariants = /* @__PURE__ */ cva('absolute inset-0 m-0 opacity-0', {
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

export interface ToggleProps extends Omit<
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

export const Toggle = /* @__PURE__ */ forwardRef<HTMLInputElement, ToggleProps>(function Toggle(
  { label, checked, onChange, onFocus, onKeyDown, onBlur, disabled, ...rest },
  ref,
) {
  // Shared single-element interaction machine (ADR-015). The hook honors the
  // real `disabled` prop as well as the frozen demo state.
  const { visualState, isHover, isFocused, isPressed, isDisabled, handlers } =
    useControlInteraction(disabled);
  const productiveMotion = useHdsMotion('productive');

  return (
    <ControlLabel
      disabled={isDisabled}
      pointer={handlers}
      animate={{
        y: isPressed ? subgrid.hairline : 0,
      }}
      className={toggleRootVariants({ state: visualState })}
    >
      <input
        ref={ref}
        type="checkbox"
        // A native checkbox with role="switch" is announced as an on/off switch, not a checkbox (hds#522).
        role="switch"
        checked={checked}
        disabled={isDisabled}
        onChange={(e) => onChange(e.target.checked)}
        {...forwardFocusHandlers(handlers, { onFocus, onKeyDown, onBlur })}
        className={cn('hds-focus', toggleInputVariants({ state: visualState }))}
        {...rest}
      />
      <LazyMotion features={domAnimation}>
        <m.span
          aria-hidden="true"
          animate={{
            scale: isPressed ? 0.96 : isHover || isFocused ? 1.04 : 1,
          }}
          transition={{
            duration: productiveMotion.duration,
            ease: productiveMotion.easing,
          }}
          style={{
            transition: CONTROL_COLOR_FADE,
          }}
          className={toggleTrackVariants({ on: checked, disabled: isDisabled })}
        >
          <m.span
            initial={false}
            animate={{ x: checked ? TOGGLE_THUMB_TRAVEL : 0 }}
            transition={{
              duration: productiveMotion.duration,
              ease: productiveMotion.easing,
            }}
            className={toggleThumbVariants({ on: checked, disabled: isDisabled })}
          />
        </m.span>
      </LazyMotion>
      <ControlLabelText pressed={isPressed} disabled={isDisabled} className="text-muted-foreground">
        {label}
      </ControlLabelText>
    </ControlLabel>
  );
});
