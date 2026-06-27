/**
 * Tests for useFocusVisible — modality-aware focus-ring detection shared by
 * nav-item and side-nav (ADR-015). A focus ring shows only for keyboard focus
 * (`:focus-visible` or `data-input-modality="keyboard"`), never for a mouse click.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFocusVisible } from './useFocusVisible';

/** A minimal Element stub whose `:focus-visible` match we control. */
function targetWith(focusVisible: boolean): Element {
  return { matches: (sel: string) => (sel === ':focus-visible' ? focusVisible : false) } as Element;
}

afterEach(() => {
  delete document.documentElement.dataset['inputModality'];
});

describe('useFocusVisible', () => {
  it('starts not-visible', () => {
    const { result } = renderHook(() => useFocusVisible());
    expect(result.current.isFocusVisible).toBe(false);
  });

  it('shows the ring when the element matches :focus-visible', () => {
    const { result } = renderHook(() => useFocusVisible());
    act(() => result.current.onFocus(targetWith(true)));
    expect(result.current.isFocusVisible).toBe(true);
  });

  it('shows the ring under keyboard modality even without :focus-visible', () => {
    document.documentElement.dataset['inputModality'] = 'keyboard';
    const { result } = renderHook(() => useFocusVisible());
    act(() => result.current.onFocus(targetWith(false)));
    expect(result.current.isFocusVisible).toBe(true);
  });

  it('stays hidden for a pointer focus (no :focus-visible, mouse modality)', () => {
    document.documentElement.dataset['inputModality'] = 'pointer';
    const { result } = renderHook(() => useFocusVisible());
    act(() => result.current.onFocus(targetWith(false)));
    expect(result.current.isFocusVisible).toBe(false);
  });

  it('clearFocusVisible drops the ring', () => {
    const { result } = renderHook(() => useFocusVisible());
    act(() => result.current.onFocus(targetWith(true)));
    expect(result.current.isFocusVisible).toBe(true);
    act(() => result.current.clearFocusVisible());
    expect(result.current.isFocusVisible).toBe(false);
  });
});
