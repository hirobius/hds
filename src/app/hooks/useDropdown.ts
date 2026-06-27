/** @internal — open/dismiss state for hand-rolled popover triggers; not part of the public API. */
/**
 * useDropdown — owns the open state and the two dismissal seams every
 * hand-rolled popover needs: outside-click (document `mousedown`) and Escape.
 *
 * Scope is deliberately narrow (ADR-015's principle): this hook owns *dismissal
 * only*. It does NOT own roving keyboard navigation, focus policy, or selection
 * — those stay with the consumer, which differs per pattern (HdsSelect is a
 * virtual-roving `listbox`; ThemeToggle is a tab-order `menu`). Divergence is
 * expressed through two optional inputs, never by branching inside the hook:
 *
 *   - `onClose`        runs after a dismissal (outside-click or Escape), e.g.
 *                      HdsSelect resets its highlight index. It does NOT fire on
 *                      programmatic close (selection) — the consumer owns that path.
 *   - `restoreFocusRef` is focused when Escape closes the panel (WAI-ARIA menu
 *                      behavior). Outside-click does not steal focus.
 *
 * CommandPalette is intentionally not a consumer: it runs on Radix Dialog, which
 * already owns outside-click + Escape.
 *
 * `mousedown` (not `click`) is used so the same press that opens the panel does
 * not immediately close it.
 */
import { useEffect, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';

export interface UseDropdownOptions {
  /** Runs after a dismissal via outside-click or Escape (not on programmatic close). */
  onClose?: () => void;
  /** Focused when Escape closes the panel; outside-click does not restore focus. */
  restoreFocusRef?: RefObject<HTMLElement | null>;
}

export interface UseDropdown<T extends HTMLElement> {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  toggle: () => void;
  /** Attach to the popover's boundary element — outside-click is measured against it. */
  containerRef: RefObject<T | null>;
}

export function useDropdown<T extends HTMLElement = HTMLDivElement>(
  options: UseDropdownOptions = {},
): UseDropdown<T> {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<T>(null);

  // Hold the latest callback/ref so the listener effect depends only on `open`
  // and never re-subscribes when the consumer passes a fresh inline closure.
  // Synced in an effect (not during render) so a stale closure can't be read.
  const onCloseRef = useRef(options.onClose);
  const restoreFocusRef = useRef(options.restoreFocusRef);
  useEffect(() => {
    onCloseRef.current = options.onClose;
    restoreFocusRef.current = options.restoreFocusRef;
  });

  useEffect(() => {
    if (!open) return;

    function dismiss(restoreFocus: boolean) {
      setOpen(false);
      onCloseRef.current?.();
      if (restoreFocus) restoreFocusRef.current?.current?.focus();
    }

    function onPointerDown(event: MouseEvent) {
      const container = containerRef.current;
      if (container && !container.contains(event.target as Node)) dismiss(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') dismiss(true);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function toggle() {
    setOpen((value) => !value);
  }

  return { open, setOpen, toggle, containerRef };
}
