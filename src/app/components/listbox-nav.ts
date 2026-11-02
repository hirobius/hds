/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Arrow-key navigation over a flat option list with disabled rows, and the
 * active-row look, shared by Combobox and CommandPalette so they move and mark
 * the active row the same way.
 */

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
