/** @internal — modality-aware focus-visible detection; not part of the public API. */
/**
 * useFocusVisible — resolves whether focus should paint a focus ring, using
 * input modality so a mouse click does not light up keyboard-only affordances.
 *
 * The five-line modality dance (`:focus-visible` match OR
 * `document.documentElement.dataset.inputModality === 'keyboard'`) was
 * duplicated verbatim between `nav-item.tsx` and `side-nav.tsx`; this hook is
 * the shared seam (ADR-015). Consumers keep their own hover/press/active
 * machines and wire `onFocus(target)` / `clearFocusVisible()` into them — the
 * hook owns only the focus-visible bit, not the whole state machine.
 */
import { useState } from 'react';

export interface FocusVisibleState {
  /** True when the current focus should render a visible focus ring. */
  isFocusVisible: boolean;
  /** Call from `onFocus`, passing the focused element. */
  onFocus: (target: Element) => void;
  /** Call from `onBlur` / `onPointerDown` to drop the focus ring. */
  clearFocusVisible: () => void;
}

export function useFocusVisible(): FocusVisibleState {
  const [isFocusVisible, setIsFocusVisible] = useState(false);

  return {
    isFocusVisible,
    onFocus: (target: Element) => {
      const modality = document.documentElement.dataset['inputModality'];
      setIsFocusVisible(target.matches(':focus-visible') || modality === 'keyboard');
    },
    clearFocusVisible: () => setIsFocusVisible(false),
  };
}
