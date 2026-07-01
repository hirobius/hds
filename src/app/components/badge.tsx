/**
 * Badge - compact feedback badge for neutral and semantic states.
 * @category Feedback
 * @tier primitive
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────
// Tone is the only styling axis. Neutral is theme-aware via the `dark:` variant
// (no runtime useTheme branch). Semantic tones use the named feedback utilities
// (text-feedback-* / bg-feedback-bg-*) so there are no arbitrary color values.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- component-badge-* sizing tokens, the intentional 11px chip size, and the neutral 4% overlay have no Tailwind-theme utility; var()-based so still token-driven
const badgeVariants = cva(
  'inline-flex w-fit items-center justify-center whitespace-nowrap box-border leading-none uppercase font-medium text-[11px] tracking-wide h-[var(--component-badge-height)] min-w-[var(--component-badge-minWidth)] px-[var(--component-badge-paddingX)] py-[var(--component-badge-paddingY)] rounded-[var(--component-badge-radius)]',
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
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
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

/** @internal — CVA variant helper; compose via Badge props instead. */
export { badgeVariants };
