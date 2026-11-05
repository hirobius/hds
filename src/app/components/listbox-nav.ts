/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Arrow-key navigation over a flat option list with disabled rows, and the
 * active-row look, shared by Combobox and CommandPalette so they move and mark
 * the active row the same way.
 */
import * as React from 'react';

/** Classes for the active option (`data-active="true"`): sunken fill and an inset focus ring. */
export const ACTIVE_OPTION_CLASS =
  'data-[active=true]:bg-[var(--semantic-color-surface-sunken)] data-[active=true]:text-[var(--semantic-color-content-primary)] data-[active=true]:ring-2 data-[active=true]:ring-inset data-[active=true]:ring-ring';

interface NavOption {
  disabled?: boolean;
}

/** Index of the first selectable option, or 0 when none is (nothing to land on). */
export function firstEnabledIndex(list: readonly NavOption[]): number {
  const i = list.findIndex((o) => !o.disabled);
  return i === -1 ? 0 : i;
}

/**
 * Next selectable index from `from` in `dir`, wrapping at the ends and skipping
 * disabled options. Returns `from` when every option is disabled.
 */
export function nextEnabledIndex(list: readonly NavOption[], from: number, dir: 1 | -1): number {
  const n = list.length;
  for (let step = 1; step <= n; step++) {
    const i = (((from + dir * step) % n) + n) % n;
    if (!list[i].disabled) return i;
  }
  return from;
}

/**
 * Reset the active row to the first selectable one whenever the list is opened
 * or its contents change. Keyed on each option's key and disabled flag (not the
 * array identity) so a parent re-render with equal options doesn't yank the
 * cursor. Adjusted during render, the React-endorsed alternative to a setState
 * effect.
 */
export function useResetActiveOnListChange<T extends NavOption>(
  open: boolean,
  list: readonly T[],
  keyOf: (option: T) => string,
  setActiveIndex: (index: number) => void,
): void {
  const listKey = `${open}|${list.map((o) => `${keyOf(o)}:${o.disabled ? 1 : 0}`).join('\u0000')}`;
  const [prevListKey, setPrevListKey] = React.useState(listKey);
  if (prevListKey !== listKey) {
    setPrevListKey(listKey);
    setActiveIndex(firstEnabledIndex(list));
  }
}

/**
 * A callback whose identity never changes but that always runs the latest
 * `fn`. Memoized option rows take it, so moving the active row re-renders
 * only the two rows whose state changed (hds#1145).
 */
export function useLatestCallback<A extends unknown[], R>(fn: (...args: A) => R) {
  const ref = React.useRef(fn);
  React.useLayoutEffect(() => {
    ref.current = fn;
  });
  return React.useCallback((...args: A) => ref.current(...args), []);
}
