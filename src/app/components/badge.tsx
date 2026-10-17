/**
 * Badge - compact feedback badge for neutral and semantic states.
 * @category Feedback
 * @tier primitive
 * @usage Label a status, state or count with a compact neutral or semantic text chip.
 * @ai-rules No status dots: a Badge always carries text. Never draw a small coloured circle to mark status; write the status as the Badge's children.
 * @whenNot A chip people can toggle, or a message that needs a sentence.
 * @useInstead Tag an interactive filter or category chip
 * @useInstead Alert a message that needs a sentence
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=31-15
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// Tone is the only styling axis. Every tone binds its own pair of tokens,
// `component.badge.<tone>.{bg,text}` (hds#595), which flip per theme in the token
// layer, so there is no `dark:` variant and no runtime useTheme branch. The flat
// `component.badge.{bg,text}` are deprecated. Neutral's fill is `surface.overlay`
// (it was a 4% black/white wash; the solid token is a few percent lighter in light mode).
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- component-badge-* sizing and per-tone color tokens have no Tailwind-theme utility; var()-based so still token-driven. the caption role matches component.badge.fontSize (14px).
const badgeVariants = /* @__PURE__ */ cva(
  // rounded-md is the action radius (role.radius), so a tenant that reshapes the system reshapes Badge too.
  'inline-flex w-fit max-w-full items-center justify-center overflow-hidden whitespace-nowrap box-border hds-type-caption h-[var(--component-badge-height)] min-w-[var(--component-badge-minWidth)] px-[var(--component-badge-paddingX)] py-[var(--component-badge-paddingY)] rounded-md',
  {
    variants: {
      tone: {
        neutral:
          'bg-[color:var(--component-badge-neutral-bg)] text-[color:var(--component-badge-neutral-text)]',
        info: 'bg-[color:var(--component-badge-info-bg)] text-[color:var(--component-badge-info-text)]',
        success:
          'bg-[color:var(--component-badge-success-bg)] text-[color:var(--component-badge-success-text)]',
        danger:
          'bg-[color:var(--component-badge-danger-bg)] text-[color:var(--component-badge-danger-text)]',
        warning:
          'bg-[color:var(--component-badge-warning-bg)] text-[color:var(--component-badge-warning-text)]',
        inProgress:
          'bg-[color:var(--component-badge-inProgress-bg)] text-[color:var(--component-badge-inProgress-text)]',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

// ── Types ──────────────────────────────────────────────────────────────────────

type BadgeVariantProps = VariantProps<typeof badgeVariants>;

/** @public */
export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'style'>, BadgeVariantProps {
  /** Element rendered as the badge wrapper. Defaults to 'span'. */
  as?: React.ElementType;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Compact metadata/status chip. Tone is the only styling input. */
export const Badge = /* @__PURE__ */ React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, tone, as: Tag = 'span', children, ...props },
  ref,
) {
  return (
    <Tag
      ref={ref}
      data-tone={tone ?? 'neutral'}
      className={cn(badgeVariants({ tone }), className)}
      {...props}
    >
      {children}
    </Tag>
  );
});
