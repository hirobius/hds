/**
 * Tests for useReducedMotion — the `prefers-reduced-motion: reduce` media
 * query hook backing useHdsMotion() (#190).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useReducedMotion } from './useReducedMotion';

type ChangeListener = (e: { matches: boolean }) => void;

function mockMatchMedia(initialMatches: boolean) {
  let listener: ChangeListener | null = null;
  const mql = {
    matches: initialMatches,
    addEventListener: vi.fn((_event: string, cb: ChangeListener) => {
      listener = cb;
    }),
    removeEventListener: vi.fn(() => {
      listener = null;
    }),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql),
  );
  return {
    fire(matches: boolean) {
      mql.matches = matches;
      listener?.({ matches });
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useReducedMotion', () => {
  it('reads the initial matchMedia state', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('defaults to false when the preference is not set', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('updates live when the OS preference changes', () => {
    const mq = mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => mq.fire(true));
    expect(result.current).toBe(true);

    act(() => mq.fire(false));
    expect(result.current).toBe(false);
  });
});
