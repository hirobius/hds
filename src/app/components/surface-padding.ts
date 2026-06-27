/**
 * surface-padding — the single source of truth for the inset-padding contract
 * shared by Surface and Card (D3).
 *
 * Both primitives expose the same 5-option padding scale. Previously each owned
 * a parallel resolver (Card mapped to inline px values, Surface to CVA Tailwind
 * classes) — same numbers, two declarations, free to drift. This module owns the
 * option vocabulary + the resolved values; Card consumes the values inline.
 *
 * Surface keeps its CVA `p-[…]` class literals (Tailwind's JIT only generates CSS
 * for class strings it can see in source), but types its variant against
 * `PaddingOption` here so the two stay in lockstep.
 */

export type PaddingOption = 'component' | 'item' | 'px16' | 'px24' | 'none';

/** Resolved CSS padding value for each option (inline-style form, used by Card). */
export const PADDING_VALUES: Record<PaddingOption, string> = {
  component: 'var(--semantic-space-component-padding)',
  item: '16px',
  px16: '16px',
  px24: '24px',
  none: '0',
};

/** Resolve a padding option to its CSS value (falls back to 0 for safety). */
export function resolvePaddingValue(option: PaddingOption): string {
  return PADDING_VALUES[option] ?? '0';
}
