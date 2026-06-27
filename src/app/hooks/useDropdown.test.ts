/**
 * Tests for useDropdown — the dismissal seam shared by HdsSelect and ThemeToggle.
 * Covers open/toggle state and the two dismissal paths (outside-click, Escape),
 * including the onClose callback and Escape-only focus restoration.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createRef } from 'react';
import { useDropdown } from './useDropdown';

describe('useDropdown', () => {
  let container: HTMLDivElement;
  let outside: HTMLButtonElement;

  beforeEach(() => {
    container = document.createElement('div');
    outside = document.createElement('button');
    document.body.append(container, outside);
  });
  afterEach(() => {
    container.remove();
    outside.remove();
  });

  function mousedownOn(el: Element) {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  }
  function pressEscape() {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }

  it('starts closed and toggles / sets open', () => {
    const { result } = renderHook(() => useDropdown());
    expect(result.current.open).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.open).toBe(false);
    act(() => result.current.setOpen(true));
    expect(result.current.open).toBe(true);
  });

  it('closes and fires onClose on outside mousedown, ignores inside', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useDropdown<HTMLDivElement>({ onClose }));
    act(() => {
      result.current.containerRef.current = container;
      result.current.setOpen(true);
    });

    // Inside press does not close.
    act(() => mousedownOn(container));
    expect(result.current.open).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    // Outside press closes + fires onClose.
    act(() => mousedownOn(outside));
    expect(result.current.open).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes and fires onClose on Escape', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useDropdown<HTMLDivElement>({ onClose }));
    act(() => {
      result.current.containerRef.current = container;
      result.current.setOpen(true);
    });
    act(() => pressEscape());
    expect(result.current.open).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('restores focus to restoreFocusRef on Escape but NOT on outside-click', () => {
    const triggerRef = createRef<HTMLButtonElement>();
    const trigger = document.createElement('button');
    document.body.append(trigger);
    triggerRef.current = trigger;

    const { result } = renderHook(() =>
      useDropdown<HTMLDivElement>({ restoreFocusRef: triggerRef }),
    );
    act(() => {
      result.current.containerRef.current = container;
      result.current.setOpen(true);
    });

    // Outside-click closes without stealing focus.
    act(() => mousedownOn(outside));
    expect(document.activeElement).not.toBe(trigger);

    // Escape closes and returns focus to the trigger.
    act(() => result.current.setOpen(true));
    act(() => pressEscape());
    expect(document.activeElement).toBe(trigger);

    trigger.remove();
  });

  it('does not listen while closed (Escape is a no-op)', () => {
    const onClose = vi.fn();
    renderHook(() => useDropdown({ onClose }));
    act(() => pressEscape());
    expect(onClose).not.toHaveBeenCalled();
  });
});
