/**
 * Tag — interactive filter and category chip.
 * @category Inputs
 * @tier primitive
 * @usage Show an interactive filter or category chip that people can toggle.
 * @whenNot A read-only status or count label.
 * @useInstead Badge a read-only status or count
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=32-11
 *
 * With `onDismiss` it is a static, removable label instead: only its X acts.
 * @a11y component required a11y:tag.keyboard-activate Enter and Space activate the tag (it is always a native button).
 * @a11y component required a11y:tag.pressed-state The selected state is reported with aria-pressed.
 * @a11y component required a11y:tag.sr-toggle-button A screen reader speaks a toggle button with its name and pressed or not pressed.
 * @a11y component required a11y:tag.disabled-skipped A disabled tag is skipped by Tab.
 * @a11y component required a11y:tag.focus-ring The tag carries the shared hds-focus ring.
 * @a11y component required a11y:tag.target-size The pill is at least 24px tall and 48px wide (WCAG 2.5.8).
 * @a11y component required a11y:tag.dismiss-named With onDismiss only the X is a button, named "Remove <label>" or dismissLabel.
 * @a11y component required a11y:tag.dismiss-keyboard The X is tabbable (not when disabled); Enter and Space dismiss.
 * @a11y component required a11y:tag.dismiss-target-size The X's 40px hit area overhangs the pill.
 * @a11y consumer required Name the tag by its text, or by an aria-label when the text is not enough; use Badge for a label that does nothing.
 */

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Icon } from './icon';

// ── Variants ───────────────────────────────────────────────────────────────────

// The outer <button> carries the hit target (48px wide, as tall as the 24px
// pill) while the inner pill keeps the visible surface compact. Colors
// (background, border-color, color) live in the pill's cva variants, painted
// through `group-hover`/`group-active` so the pill reacts to interaction on
// the shared outer button (converted off the former .hds-tag-btn/.hds-tag-pill
// theme.css rules for #60). The `active` prop (aria-pressed selected state) is
// not one of the variant contract's four axes: it is the pill's `selected` cva
// variant, with the same rest → hover → pressed → focus-visible state matrix.

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- 44px min interactive hit target has no semantic Tailwind size utility; var()-based so still token-driven
const tagButtonVariants = /* @__PURE__ */ cva(
  // 44px is the WCAG 2.5.5 / platform HIG minimum interactive target — a
  // regulatory floor, not a design-scale choice; no semantic size scale exists
  // yet for dimensional primitives (see hds#186 follow-up).
  // tier-ok: regulatory a11y constant, not a design decision. hds#186
  'group inline-flex min-w-[var(--primitive-size-interactive-min)] hds-touch-row cursor-pointer select-none items-center justify-center border-0 bg-transparent p-0 text-inherit transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:text-[var(--semantic-color-content-disabled)]',
);

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- component-tag-* sizing/radius tokens have no Tailwind-theme utility; var()-based so still token-driven
const tagPillVariants = /* @__PURE__ */ cva(
  'pointer-events-none box-border inline-flex min-h-[var(--component-tag-minHeight)] min-w-[var(--component-tag-minWidth)] max-w-full items-center justify-center overflow-hidden whitespace-nowrap rounded-[var(--component-tag-radius)] border border-solid px-[var(--component-tag-paddingX)] py-[var(--component-tag-paddingY)] hds-type-caption transition-colors',
  {
    variants: {
      selected: {
        // Selected (C2): the primary fill with the primary hard edge under it, like a pressed toggle.
        true: 'border-[var(--component-tag-activeBorder)] bg-[var(--component-tag-activeBackground)] text-[var(--component-tag-activeText)] shadow-[0_3px_0_var(--hds-edge-primary)] group-hover:bg-[var(--component-tag-activeHover)]',
        false:
          'border-[var(--component-tag-border)] bg-[var(--component-tag-background)] text-[var(--component-tag-text)] group-hover:border-[var(--semantic-color-border-accent)] group-hover:bg-[var(--semantic-color-surface-accentSubtle)] group-hover:text-[var(--semantic-color-content-primary)] group-active:border-[var(--semantic-color-border-accent)]',
      },
    },
    defaultVariants: { selected: false },
  },
);

// A dismissible tag is a static pill: only its X acts, so a stray tap on the text
// can't remove it. The pill drops its end padding; the X's 40px hit area supplies
// it (the 16px icon sits 12px from the edge, the pill's own paddingX). The X's
// negative block margin makes it take one line box of height, so the 40px hit
// area overhangs the pill instead of growing it.
const dismissPill =
  'box-border inline-flex min-h-[var(--component-tag-minHeight)] max-w-full items-center whitespace-nowrap rounded-[var(--component-tag-radius)] border border-solid border-[var(--component-tag-border)] bg-[var(--component-tag-background)] py-[var(--component-tag-paddingY)] pr-0 pl-[var(--component-tag-paddingX)] text-[var(--component-tag-text)] hds-type-caption';

const dismissButton =
  // tier-ok: a 40px touch hit area is an a11y floor, not a design-scale choice (no semantic size; hds#750, hds#919)
  'hds-focus inline-flex size-[var(--primitive-size-40)] my-[calc((1lh_-_var(--primitive-size-40))/2)] shrink-0 cursor-pointer items-center justify-center rounded-[var(--component-tag-radius)] border-0 bg-transparent p-0 text-inherit transition-colors hover:text-[var(--semantic-color-content-primary)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:text-[var(--semantic-color-content-disabled)]';

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export interface TagProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Tag content displayed inside the pill. */
  children: React.ReactNode;
  /** Whether the tag is active (selected). Not used with `onDismiss`. */
  active?: boolean;
  /**
   * Makes the tag a static, removable label: the pill no longer toggles and a
   * trailing X button (40px hit area) calls this. The ref and the other button
   * props go to the X (move focus there after a removal); `className` stays on the pill.
   */
  onDismiss?: () => void;
  /** The X's accessible name. Defaults to "Remove <children>" when children is text. */
  dismissLabel?: string;
}

function textOf(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return '';
}

// ── Component ──────────────────────────────────────────────────────────────────

/** @public */
export const Tag = /* @__PURE__ */ React.forwardRef<HTMLButtonElement, TagProps>(function Tag(
  { children, active = false, className, type = 'button', onDismiss, dismissLabel, ...props },
  ref,
) {
  if (onDismiss) {
    const label = dismissLabel ?? props['aria-label'] ?? `Remove ${textOf(children)}`.trim();
    return (
      <span data-dismissible="true" className={cn(dismissPill, className)}>
        <span className="min-w-0 truncate">{children}</span>
        <button
          ref={ref}
          type={type}
          {...props}
          aria-label={label}
          className={dismissButton}
          onClick={(event) => {
            props.onClick?.(event);
            if (!event.defaultPrevented) onDismiss();
          }}
        >
          <Icon icon={X} size="small" color="currentColor" aria-hidden />
        </button>
      </span>
    );
  }
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
