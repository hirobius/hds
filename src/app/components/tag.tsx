/**
 * Tag — interactive filter and category chip.
 * @category Inputs
 * @tier primitive
 *
 * The outer <button> owns the accessible 44px hit target; the inner pill keeps
 * the visible surface compact. Colors reference the same semantic / component-tag
 * tokens as before (parity with the retired .hds-tag-btn/.hds-tag-pill rules in
 * theme.css), now driven through cva: hover via `group-hover`, pressed via
 * `group-active`, and the selected state via the `active` variant.
 */

import React, { type ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// Arbitrary values are the token-driven seam: every color/size references a
// semantic or component-tag CSS var, so this stays token-governed.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- semantic/component-tag color, size, radius, and typography tokens have no Tailwind-theme utility; var()-based so still token-driven
const tagPill = cva(
  'inline-flex items-center justify-center whitespace-nowrap box-border border border-solid leading-none font-medium select-none text-[length:var(--semantic-typography-ui-font-size)] min-w-[var(--component-tag-minWidth)] min-h-[var(--component-tag-minHeight)] px-[var(--component-tag-paddingX)] py-[var(--component-tag-paddingY)] rounded-[var(--semantic-radius-action)] transition-colors',
  {
    variants: {
      active: {
        false:
          'bg-[var(--semantic-color-surface-raised)] border-[color:var(--semantic-color-border-default)] text-[color:var(--semantic-color-content-secondary)] group-hover:bg-[var(--semantic-color-surface-accentSubtle)] group-hover:border-[color:var(--semantic-color-border-accent)] group-hover:text-[color:var(--semantic-color-content-primary)] group-active:border-[color:var(--semantic-color-border-accent)]',
        true: 'bg-[var(--component-tag-activeBackground)] border-[color:var(--component-tag-activeBorder)] text-[color:var(--component-tag-activeText)] group-hover:bg-[var(--component-tag-activeHover)]',
      },
    },
    defaultVariants: { active: false },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

interface TagProps {
  /** Tag content displayed inside the pill. */
  children: ReactNode;
  /** Whether the tag is active (selected). */
  active?: boolean;
  /** Click handler for toggling the tag. */
  onClick?: () => void;
  /** Optional class hook for parent-level styling. */
  className?: string;
  /** Native tooltip for explicit file/path affordance. */
  title?: string;
  /** Accessible label when the visible text is abbreviated. */
  'aria-label'?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** @public */
export const Tag = React.forwardRef<HTMLButtonElement, TagProps>(function Tag(
  { children, active = false, onClick, className, title, 'aria-label': ariaLabel },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      title={title}
      data-active={active ? 'true' : undefined}
      className={cn(
        'group hds-focus inline-flex cursor-pointer select-none items-center justify-center border-0 bg-transparent p-0 transition-colors min-w-[var(--primitive-size-interactive-min)]',
        className,
      )}
    >
      <span className={tagPill({ active })}>{children}</span>
    </button>
  );
});
