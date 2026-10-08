/**
 * Tests for useInteractionState — the single-element interaction machine shared
 * by Toggle and Radio (ADR-015). Pure state machine: no context, driven
 * entirely by the `disabled` / `frozenState` inputs and the returned handlers.
 */
import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useInteractionState } from './useInteractionState';

describe('useInteractionState', () => {
  it('defaults to rest with all flags false', () => {
    const { result } = renderHook(() => useInteractionState({}));
    expect(result.current.visualState).toBe('rest');
    expect(result.current.isHover).toBe(false);
    expect(result.current.isFocused).toBe(false);
    expect(result.current.isPressed).toBe(false);
    expect(result.current.isDisabled).toBe(false);
  });

  it('resolves hover, focus, and press from the handlers', () => {
    const { result } = renderHook(() => useInteractionState({}));

    act(() => result.current.handlers.onMouseEnter());
    expect(result.current.visualState).toBe('hover');
    expect(result.current.isHover).toBe(true);

    act(() => result.current.handlers.onFocus());
    // Focus outranks hover: a resting mouse must not mask the keyboard ring.
    expect(result.current.visualState).toBe('focused');
    expect(result.current.isFocused).toBe(true);

    act(() => result.current.handlers.onMouseLeave());
    // mouseLeave clears hover (and press); focus remains.
    expect(result.current.visualState).toBe('focused');
  });

  it('shows hover (not focus) while hovering an unfocused control', () => {
    const { result } = renderHook(() => useInteractionState({}));
    act(() => result.current.handlers.onMouseEnter());
    expect(result.current.visualState).toBe('hover');
  });

  describe('focus-visible gating', () => {
    const el = (visible: boolean | 'throws') =>
      ({
        matches: (sel: string) => {
          if (visible === 'throws') throw new SyntaxError(sel);
          return sel === ':focus-visible' && visible;
        },
      }) as unknown as Element;

    it('ignores pointer-modality focus (a mouse click does not draw the ring)', () => {
      const { result } = renderHook(() => useInteractionState({}));
      act(() => result.current.handlers.onFocus(el(false)));
      expect(result.current.visualState).toBe('rest');
      expect(result.current.isFocused).toBe(false);
    });

    it('counts keyboard-modality focus and keeps it while hovered', () => {
      const { result } = renderHook(() => useInteractionState({}));
      act(() => {
        result.current.handlers.onMouseEnter();
        result.current.handlers.onFocus(el(true));
      });
      expect(result.current.visualState).toBe('focused');
    });

    it('falls back to focused where :focus-visible is unsupported', () => {
      const { result } = renderHook(() => useInteractionState({}));
      act(() => result.current.handlers.onFocus(el('throws')));
      expect(result.current.visualState).toBe('focused');
    });

    it('picks up the ring when a key is pressed on a mouse-focused control', () => {
      const { result } = renderHook(() => useInteractionState({}));
      act(() => result.current.handlers.onFocus(el(false)));
      expect(result.current.visualState).toBe('rest');
      act(() => result.current.handlers.onKeyDown(el(true)));
      expect(result.current.visualState).toBe('focused');
    });

    it('blur clears focus', () => {
      const { result } = renderHook(() => useInteractionState({}));
      act(() => result.current.handlers.onFocus(el(true)));
      act(() => result.current.handlers.onBlur());
      expect(result.current.visualState).toBe('rest');
    });
  });

  it('press outranks hover and focus', () => {
    const { result } = renderHook(() => useInteractionState({}));
    act(() => {
      result.current.handlers.onMouseEnter();
      result.current.handlers.onFocus();
      result.current.handlers.onPointerDown();
    });
    expect(result.current.visualState).toBe('pressed');
    expect(result.current.isPressed).toBe(true);

    act(() => result.current.handlers.onPointerUp());
    expect(result.current.isPressed).toBe(false);
  });

  it('mouseLeave and blur both clear the pressed state', () => {
    const leave = renderHook(() => useInteractionState({}));
    act(() => {
      leave.result.current.handlers.onPointerDown();
      leave.result.current.handlers.onMouseLeave();
    });
    expect(leave.result.current.isPressed).toBe(false);

    const blur = renderHook(() => useInteractionState({}));
    act(() => {
      blur.result.current.handlers.onPointerDown();
      blur.result.current.handlers.onBlur();
    });
    expect(blur.result.current.isPressed).toBe(false);
  });

  it('honors the real disabled prop over live pointer state', () => {
    const { result } = renderHook(() => useInteractionState({ disabled: true }));
    expect(result.current.isDisabled).toBe(true);
    expect(result.current.visualState).toBe('disabled');
    // Pointer events cannot override a genuinely disabled control.
    act(() => result.current.handlers.onMouseEnter());
    expect(result.current.visualState).toBe('disabled');
  });

  it('frozen demo state overrides live state', () => {
    const { result } = renderHook(() => useInteractionState({ frozenState: 'hover' }));
    expect(result.current.visualState).toBe('hover');
    expect(result.current.isHover).toBe(true);

    // A live press does not escape the frozen state.
    act(() => result.current.handlers.onPointerDown());
    expect(result.current.visualState).toBe('hover');
  });

  it('frozen disabled marks isDisabled even without the prop', () => {
    const { result } = renderHook(() => useInteractionState({ frozenState: 'disabled' }));
    expect(result.current.isDisabled).toBe(true);
    expect(result.current.visualState).toBe('disabled');
  });
});
