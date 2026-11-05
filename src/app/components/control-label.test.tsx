/**
 * useControlInteraction — the frozen-demo-aware interaction machine that
 * Checkbox, Toggle and Radio all read (hds#1009).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import { FreezeState } from '../context/DemoStateContext';
import { useControlInteraction } from './control-label';

afterEach(cleanup);

function frozen(state: string) {
  return function Frozen({ children }: { children: ReactNode }) {
    return <FreezeState state={state}>{children}</FreezeState>;
  };
}

describe('useControlInteraction', () => {
  it('rests outside a FreezeState', () => {
    const { result } = renderHook(() => useControlInteraction(undefined));
    expect(result.current.visualState).toBe('rest');
    expect(result.current.isDisabled).toBe(false);
  });

  it('follows the frozen demo state', () => {
    const { result } = renderHook(() => useControlInteraction(false), {
      wrapper: frozen('hover'),
    });
    expect(result.current.visualState).toBe('hover');
    expect(result.current.isHover).toBe(true);
  });

  it('honours the real disabled prop', () => {
    const { result } = renderHook(() => useControlInteraction(true));
    expect(result.current.visualState).toBe('disabled');
    expect(result.current.isDisabled).toBe(true);
  });

  it('a frozen "disabled" disables the control too', () => {
    const { result } = renderHook(() => useControlInteraction(false), {
      wrapper: frozen('disabled'),
    });
    expect(result.current.isDisabled).toBe(true);
  });
});
