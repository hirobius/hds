/** @internal — shared single-element interaction state machine; not part of the public API. */
/**
 * useInteractionState — the hover/press/focus state machine shared by the
 * single-element control primitives (HdsToggle, HdsRadio).
 *
 * After the HdsToggle disabled-bug fix (71f453f) the two ran byte-identical
 * resolution logic; this hook is the one place that logic now lives. Per
 * ADR-015 it is deliberately scoped to single-element primitives — it does NOT
 * serve SegmentedControl (per-segment `string | null` cardinality) or NavItem
 * (`active`-priority enum + focus-visible-from-modality), which keep their own
 * deeper machines.
 *
 * The frozen demo state is passed in (the component still calls
 * `useFrozenState()`) so the hook stays a pure, context-free state machine that
 * is unit-tested directly with `renderHook` — same rationale as the hds-search
 * extraction (ADR-011).
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
  onFocus: () => void;
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
        : hovered
          ? 'hover'
          : focused
            ? 'focused'
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
      onFocus: () => setFocused(true),
      onBlur: () => {
        setFocused(false);
        setPressed(false);
      },
    },
  };
}
