/**
 * Badge - compact feedback badge for neutral and semantic states.
 * @category Feedback
 * @tier primitive
 * @usage Label a status, state or count with a compact neutral or semantic chip, or a dot.
 * @whenNot A chip people can toggle, or a message that needs a sentence.
 * @useInstead Tag an interactive filter or category chip
 * @useInstead Alert a message that needs a sentence
 * @figma https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=31-15
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// Tone is the only styling axis. Neutral is theme-aware via the `dark:` variant
// (no runtime useTheme branch). Semantic tones use the named feedback utilities
// (text-feedback-* / bg-feedback-bg-*) so there are no arbitrary color values.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- component-badge-* sizing tokens and the neutral 4% overlay have no Tailwind-theme utility; var()-based so still token-driven. text-xs matches component.badge.fontSize (primitive.typography.size.xs, hds#283: 12px).
const badgeVariants = /* @__PURE__ */ cva(
  'inline-flex w-fit items-center justify-center whitespace-nowrap box-border leading-none uppercase font-medium text-xs tracking-caps h-[var(--component-badge-height)] min-w-[var(--component-badge-minWidth)] px-[var(--component-badge-paddingX)] py-[var(--component-badge-paddingY)] rounded-[var(--component-badge-radius)]',
  {
    variants: {
      tone: {
        neutral:
          'bg-black/[0.04] text-[color:var(--semantic-color-content-secondary)] dark:bg-white/[0.04]',
        info: 'bg-feedback-bg-info text-feedback-info',
        success: 'bg-feedback-bg-success text-feedback-success',
        danger: 'bg-feedback-bg-danger text-feedback-danger',
        warning: 'bg-feedback-bg-warning text-feedback-warning',
        inProgress: 'bg-feedback-bg-inProgress text-feedback-inProgress',
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
// add `size` to Badge's variantAxes in scripts/build-tokens.mjs.
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
  /** Names the dot: role="status" with this aria-label. Without it the dot is aria-hidden. */
  label?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Compact metadata/status chip. Tone is the only styling input. */
export const Badge = /* @__PURE__ */ React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, tone, as: Tag = 'span', dot = false, size, label, children, ...props },
  ref,
) {
  if (dot) {
    return (
      <Tag
        ref={ref}
        data-tone={tone ?? 'neutral'}
        data-size={size ?? 'md'}
        className={cn(badgeDotVariants({ tone }), BADGE_DOT_SIZE[size ?? 'md'], className)}
        {...(label ? { role: 'status', 'aria-label': label } : { 'aria-hidden': true })}
        {...props}
      />
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
