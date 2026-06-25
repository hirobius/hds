/**
 * Alert - compact feedback surface with contextual severity.
 * @category Feedback
 * @tier primitive
 */

import React from 'react';
import { motion } from 'motion/react';
import { cva } from 'class-variance-authority';
import { CircleCheck, TriangleAlert, CircleX, Info, type LucideIcon } from 'lucide-react';
import hds from '../design-system/tokens';
import { cn } from '../../lib/utils';
import { Icon } from './icon';

type AlertTone = 'success' | 'danger' | 'warning' | 'info';

// ── Variants ───────────────────────────────────────────────────────────────────
// Tone drives the surface background via the named feedback utilities
// (bg-feedback-bg-*), matching Badge. The icon glyph + icon color stay in
// TONE_CONFIG below — those are not CSS-class concerns (glyph is a component,
// the Icon takes a color value). `hasTitle` flips cross-axis alignment.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- token-driven gap/padding/radius; var()-based, no Tailwind-theme utility exists
const alertVariants = cva(
  'flex gap-[var(--semantic-space-component-gap)] p-[var(--semantic-space-component-gap)] rounded-[var(--primitive-radius-4)]',
  {
    variants: {
      tone: {
        success: 'bg-feedback-bg-success',
        danger: 'bg-feedback-bg-danger',
        warning: 'bg-feedback-bg-warning',
        info: 'bg-feedback-bg-info',
      },
      hasTitle: {
        true: 'items-start',
        false: 'items-center',
      },
    },
    defaultVariants: { tone: 'info', hasTitle: false },
  },
);

interface AlertProps {
  /** Feedback tone that controls icon, border, and surface treatment. */
  tone?: AlertTone;
  /** Optional heading shown above the body copy. */
  title?: string;
  /** Main alert message content. */
  children: React.ReactNode;
}

const TONE_CONFIG: Record<AlertTone, { icon: LucideIcon; colorVar: string }> = {
  success: { icon: CircleCheck, colorVar: 'var(--semantic-color-feedback-success)' },
  danger: { icon: CircleX, colorVar: 'var(--semantic-color-feedback-error)' },
  warning: { icon: TriangleAlert, colorVar: 'var(--semantic-color-feedback-warning)' },
  info: { icon: Info, colorVar: 'var(--semantic-color-feedback-info)' },
};

/** @public */
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { tone = 'info', title, children },
  ref,
) {
  const { icon: IconGlyph, colorVar } = TONE_CONFIG[tone];
  const hasTitle = Boolean(title);

  return (
    <motion.div
      ref={ref}
      role="alert"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: hds.motion.productive.duration, ease: hds.motion.productive.easing }}
      className={cn(alertVariants({ tone, hasTitle }))}
    >
      <Icon
        icon={IconGlyph}
        size="small"
        color={colorVar}
        className={cn('shrink-0', hasTitle ? 'self-start' : 'self-center')}
      />

      {hasTitle ? (
        <span>
          <span
            style={{
              ...hds.typeStyles.ui,
              color: 'var(--semantic-color-content-primary)',
              margin: 0,
            }}
          >
            {title}
          </span>
          <span
            style={{
              ...hds.typeStyles.caption,
              color: 'var(--semantic-color-content-primary)',
              margin: 0,
            }}
          >
            {children}
          </span>
        </span>
      ) : (
        <span
          style={{
            ...hds.typeStyles.caption,
            color: 'var(--semantic-color-content-primary)',
            margin: 0,
          }}
        >
          {children}
        </span>
      )}
    </motion.div>
  );
});
