/**
 * Badge - compact feedback badge for neutral and semantic states.
 * @category Feedback
 * @tier primitive
 * @usage Label a status or state with a compact neutral or semantic chip, a dot, or a capped count beside a heading (`count`, `max`, `label`).
 * @whenNot A chip people can toggle, or a message that needs a sentence.
 * @useInstead Tag an interactive filter or category chip
 * @useInstead Alert a message that needs a sentence
 * @figma https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=31-15
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { isProduction } from '../../lib/env';

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

// `dot` (hds#393): a solid feedback fill on the 8px grid.
// Tone still picks the color, so a dot is not a Tone option; neutral uses the
// muted content color so the dot never brings in a second hue on its own.
const badgeDotVariants = /* @__PURE__ */ cva('inline-block shrink-0 rounded-full', {
  variants: {
    tone: {
      neutral: 'bg-muted-foreground',
      info: 'bg-feedback-info',
      success: 'bg-feedback-success',
      danger: 'bg-feedback-danger',
      warning: 'bg-feedback-warning',
      inProgress: 'bg-feedback-inProgress',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

// The dot diameter is a lookup, not a cva `size` axis: a cva contract axis must
// be a Size property on the Figma Badge (check-figma-mapping), and that master
// (31:15) has no dot yet. When the dot lands in Figma, move this into cva and
// add `size` to Badge's variantAxes in scripts/lib/token-manifest.mjs.
const BADGE_DOT_SIZE: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'size-1.5',
  md: 'size-2',
  lg: 'size-2.5',
};

// ── Types ──────────────────────────────────────────────────────────────────────

type BadgeVariantProps = VariantProps<typeof badgeVariants>;

/** @public */
export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'style'>, BadgeVariantProps {
  /** Element rendered as the badge wrapper. Defaults to 'span'. */
  as?: React.ElementType;
  /** Render a solid status dot with no text (children are ignored). */
  dot?: boolean;
  /** Dot diameter; used only with `dot`. */
  size?: 'sm' | 'md' | 'lg';
  /** A number shown in tabular numerals, neutral by default. Exclusive with `children` (children are ignored when `count` is set). Pair it with `max` to cap it. */
  count?: number;
  /** Cap for `count`: a count above it shows as `<max>+` (`max={99}` turns 120 into `99+`). Used only with `count`. */
  max?: number;
  /** Names a `dot` or `count` badge: role="img" with this aria-label ("12 roles"). Without it a dot is aria-hidden and a count is plain text. A text badge ignores it: put the text in `children`. */
  label?: string;
}

// `label` only names a `dot` badge. On a text badge it renders nothing, so
// `<Badge label="Active" />` was an empty chip with no hint why (hds#522). Warn once
// in dev (misuse, not a deprecation, so not lib/deprecation's warnOnce prefix).
let warnedLabelWithoutDot = false;
function warnLabelWithoutDot() {
  if (warnedLabelWithoutDot || isProduction()) return;
  warnedLabelWithoutDot = true;
  console.warn(
    '[HDS] Badge `label` only names a `dot` badge and renders no text. Put the text in children: <Badge>Active</Badge>, or add `dot`.',
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Compact metadata/status chip. Tone is the only styling input. */
export const Badge = /* @__PURE__ */ React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, tone, as: Tag = 'span', dot = false, size, label, count, max, children, ...props },
  ref,
) {
  const isCount = count !== undefined && !dot;

  if (label && !dot && !isCount) {
    warnLabelWithoutDot();
  }

  if (dot) {
    return (
      <Tag
        ref={ref}
        data-tone={tone ?? 'neutral'}
        data-size={size ?? 'md'}
        className={cn(badgeDotVariants({ tone }), BADGE_DOT_SIZE[size ?? 'md'], className)}
        {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
        {...props}
      />
    );
  }

  if (isCount) {
    const shown = max !== undefined && count > max ? `${max}+` : String(count);
    return (
      <Tag
        ref={ref}
        data-tone={tone ?? 'neutral'}
        className={cn(badgeVariants({ tone }), 'tabular-nums', className)}
        {...(label ? { role: 'img', 'aria-label': label } : {})}
        {...props}
      >
        {shown}
      </Tag>
    );
  }

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
