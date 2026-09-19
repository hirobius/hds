/**
 * Tests for useHdsMotion — the reactive `hds.motion.*` read path (#190).
 * Zeroes `duration` while `prefers-reduced-motion: reduce` is active, so
 * motion/react `transition`s built from it collapse without a per-component
 * `MotionConfig` wrapper.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import hds from '../design-system/tokens';
import { useHdsMotion } from './useHdsMotion';

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useHdsMotion', () => {
  it('returns the token duration/easing unchanged when motion is allowed', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useHdsMotion('productive'));
    expect(result.current).toEqual(hds.motion.productive);
  });

  it('zeroes duration but keeps easing when reduced motion is preferred', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useHdsMotion('expressive'));
    expect(result.current.duration).toBe(0);
    expect(result.current.easing).toEqual(hds.motion.expressive.easing);
  });

  it('resolves each motion category from the token bridge', () => {
    mockMatchMedia(false);
    for (const category of Object.keys(hds.motion) as (keyof typeof hds.motion)[]) {
      const { result } = renderHook(() => useHdsMotion(category));
      expect(result.current).toEqual(hds.motion[category]);
    }
  });
});
