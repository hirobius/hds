import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * The named spacing keys of tailwind.config.tokens.cjs (`p-fixed-sm`,
 * `gap-scale-xs`, `p-surface-padding`, …). tailwind-merge only knows numeric
 * steps, so without these a consumer's `px-6` would not replace a component's
 * `px-fixed-sm` (hds#778); utils.test.ts keeps the list equal to the preset.
 * @internal
 */
export const SPACING_KEYS = [
  'scale-2xs',
  'scale-xs',
  'scale-sm',
  'scale-md',
  'scale-lg',
  'scale-xl',
  'fixed-2xs',
  'fixed-xs',
  'fixed-sm',
  'fixed-md',
  'fixed-lg',
  'fixed-xl',
  'surface-padding',
  'region-gutter',
  'subgrid-hairline',
  'subgrid-xs',
  'subgrid-gap',
  'component-medium',
  'section-stack',
  'section-inset',
  'section-heroMax',
  'sidebar-indent',
  'sidebar-gap',
  'sidebar-sectionGap',
  'sidebar-railPadding',
  'px1',
  'px2',
  'px6',
  'px10',
] as const;

const twMerge = /* @__PURE__ */ extendTailwindMerge({
  extend: { theme: { spacing: [...SPACING_KEYS] } },
});

/** @public */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
