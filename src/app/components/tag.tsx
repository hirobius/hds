/**
 * Tag — interactive filter and category chip.
 * @category Inputs
 * @tier primitive
 *
 * The outer <button> carries the accessible 44px hit target directly via the
 * size token while the inner pill keeps the visible surface compact. Colors
 * (background, border-color, color) live in the pill's cva variants, painted
 * through `group-hover`/`group-active` so the pill reacts to interaction on
 * the shared outer button (converted off the former .hds-tag-btn/.hds-tag-pill
 * theme.css rules for #60 — same behavior, now token-driven Tailwind classes).
 *
 * The `active` prop (aria-pressed selected state) is not one of the variant
 * contract's four axes — it's expressed as the pill's `selected` cva variant,
 * carrying the same rest → hover → pressed → focus-visible state matrix the
 * contract expects, just keyed by selection instead of tone/size/density.
 */

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- 44px min interactive hit target has no semantic Tailwind size utility; var()-based so still token-driven
const tagButtonVariants = cva(
  'group inline-flex min-w-[var(--primitive-size-interactive-min)] cursor-pointer select-none items-center justify-center border-0 bg-transparent p-0 text-inherit transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
);

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- component-tag-* sizing/radius tokens have no Tailwind-theme utility; var()-based so still token-driven
const tagPillVariants = cva(
  'pointer-events-none box-border inline-flex min-h-[var(--component-tag-minHeight)] min-w-[var(--component-tag-minWidth)] items-center justify-center whitespace-nowrap rounded-[var(--component-tag-radius)] border border-solid px-[var(--component-tag-paddingX)] py-[var(--component-tag-paddingY)] text-xs font-medium leading-none transition-colors',
  {
    variants: {
      selected: {
        true: 'border-[var(--component-tag-activeBorder)] bg-[var(--component-tag-activeBackground)] text-[var(--component-tag-activeText)] group-hover:bg-[var(--component-tag-activeHover)]',
        false:
          'border-[var(--semantic-color-border-default)] bg-[var(--semantic-color-surface-raised)] text-[var(--semantic-color-content-secondary)] group-hover:border-[var(--semantic-color-border-accent)] group-hover:bg-[var(--semantic-color-surface-accentSubtle)] group-hover:text-[var(--semantic-color-content-primary)] group-active:border-[var(--semantic-color-border-accent)]',
      },
    },
    defaultVariants: { selected: false },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export interface TagProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Tag content displayed inside the pill. */
  children: React.ReactNode;
  /** Whether the tag is active (selected). */
  active?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** @public */
export const Tag = React.forwardRef<HTMLButtonElement, TagProps>(function Tag(
  { children, active = false, className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={active}
      data-active={active ? 'true' : undefined}
      className={cn('hds-focus', tagButtonVariants(), className)}
      {...props}
    >
      <span className={tagPillVariants({ selected: active })}>{children}</span>
    </button>
  );
});

/** @internal — CVA variant helpers; compose via Tag props instead. */
export { tagButtonVariants, tagPillVariants };
