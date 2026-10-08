/** @internal — shared single-element interaction state machine; not part of the public API. */
/**
 * useInteractionState — the hover/press/focus state machine shared by the
 * single-element control primitives (Toggle, Radio).
 *
 * After the Toggle disabled-bug fix (71f453f) the two ran byte-identical
 * resolution logic; this hook is the one place that logic now lives. Per
 * ADR-015 it is deliberately scoped to single-element primitives — it does NOT
 * serve SegmentedControl (per-segment `string | null` cardinality), which keeps
 * its own deeper machine.
 *
 * Focus is keyboard-only (`:focus-visible`) and outranks hover, so a mouse
 * resting on a control never masks a keyboard user's ring (and a click never
 * paints one). Press still outranks both.
 *
 * The frozen demo state is passed in (the component still calls
 * `useFrozenState()`) so the hook stays a pure, context-free state machine that
 * is unit-tested directly with `renderHook` (ADR-011).
 */
import { useState } from 'react';

export type InteractionVisualState = 'rest' | 'hover' | 'focused' | 'pressed' | 'disabled';

/** Event-less setters; consumers compose their own forwarded handlers around these. */
export interface InteractionHandlers {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  /**
   * Pass the focused element (`e.currentTarget`) so only keyboard-modality focus
   * (`:focus-visible`) counts. Called with no argument it counts unconditionally.
   */
  onFocus: (target?: Element | null) => void;
  /** Re-checks `:focus-visible` once a key is pressed on an already-focused element. */
  onKeyDown: (target?: Element | null) => void;
  onBlur: () => void;
}

export interface InteractionState {
  /** Resolved visual state — the frozen demo state wins when present. */
  visualState: InteractionVisualState;
  isHover: boolean;
  isFocused: boolean;
  isPressed: boolean;
  isDisabled: boolean;
  handlers: InteractionHandlers;
}

export interface UseInteractionStateOptions {
  /** The genuine `disabled` prop — forces `disabled` regardless of pointer/focus. */
  disabled?: boolean;
  /** Frozen demo state from `useFrozenState()`; when set it overrides live state. */
  frozenState?: InteractionVisualState | null;
}

/**
 * True when the browser would draw a focus ring on `target` (keyboard modality,
 * or a text-entry control). Falls back to `true` where `:focus-visible` is
 * unsupported so keyboard users are never left without an indicator.
 */
function matchesFocusVisible(target?: Element | null): boolean {
  if (!target) return true;
  try {
    return target.matches(':focus-visible');
  } catch {
    return true;
  }
}

export function useInteractionState({
  disabled,
  frozenState = null,
}: UseInteractionStateOptions): InteractionState {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);

  // Honor the real `disabled` prop as well as the frozen demo state, so a
  // genuinely disabled control renders (and behaves) disabled.
  const isDisabled = disabled === true || frozenState === 'disabled';
  const visualState: InteractionVisualState =
    frozenState ??
    (isDisabled
      ? 'disabled'
      : pressed
        ? 'pressed'
        : focused
          ? 'focused'
          : hovered
            ? 'hover'
            : 'rest');

  return {
    visualState,
    isHover: visualState === 'hover',
    isFocused: visualState === 'focused',
    isPressed: visualState === 'pressed',
    isDisabled,
    handlers: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => {
        setHovered(false);
        setPressed(false);
      },
      onPointerDown: () => setPressed(true),
      onPointerUp: () => setPressed(false),
      onPointerCancel: () => setPressed(false),
      // `focused` means keyboard-visible focus, not just "has focus": a mouse
      // click focuses a checkbox/radio/switch but must not draw the ring.
      onFocus: (target) => setFocused(matchesFocusVisible(target)),
      onKeyDown: (target) => {
        if (matchesFocusVisible(target)) setFocused(true);
      },
      onBlur: () => {
        setFocused(false);
        setPressed(false);
      },
    },
  };
}
