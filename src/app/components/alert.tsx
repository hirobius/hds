/**
 * Alert - compact feedback surface with contextual severity.
 * @category Feedback
 * @tier primitive
 */

import React from 'react';
import { motion } from 'motion/react';
import { CircleCheck, TriangleAlert, CircleX, Info, type LucideIcon } from 'lucide-react';
import hds from '../design-system/tokens';
import { Icon } from './icon';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  /** Visual severity that controls icon, border, and surface treatment. */
  variant?: AlertVariant;
  /** Optional heading shown above the body copy. */
  title?: string;
  /** Main alert message content. */
  children: React.ReactNode;
}

const VARIANT_CONFIG: Record<
  AlertVariant,
  {
    icon: LucideIcon;
    colorVar: string;
    bgVar: string;
  }
> = {
  success: {
    icon: CircleCheck,
    colorVar: 'var(--semantic-color-feedback-success)',
    bgVar: 'var(--semantic-color-feedback-bg-success)',
  },
  error: {
    icon: CircleX,
    colorVar: 'var(--semantic-color-feedback-error)',
    bgVar: 'var(--semantic-color-feedback-bg-error)',
  },
  warning: {
    icon: TriangleAlert,
    colorVar: 'var(--semantic-color-feedback-warning)',
    bgVar: 'var(--semantic-color-feedback-bg-warning)',
  },
  info: {
    icon: Info,
    colorVar: 'var(--semantic-color-feedback-info)',
    bgVar: 'var(--semantic-color-feedback-bg-info)',
  },
};

/** @public */
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { variant = 'info', title, children },
  ref,
) {
  const { icon: IconGlyph, colorVar, bgVar } = VARIANT_CONFIG[variant];
  const hasTitle = Boolean(title);

  return (
    <motion.div
      ref={ref}
      role="alert"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: hds.motion.productive.duration, ease: hds.motion.productive.easing }}
      style={{
        display: 'flex',
        alignItems: hasTitle ? 'flex-start' : 'center',
        gap: hds.semantic.space.component.gap,
        paddingTop: hds.semantic.space.component.gap,
        paddingBottom: hds.semantic.space.component.gap,
        paddingLeft: hds.semantic.space.component.gap,
        paddingRight: hds.semantic.space.component.gap,
        background: bgVar,
        borderRadius: hds.borderRadius[4],
      }}
    >
      <Icon
        icon={IconGlyph}
        size="small"
        color={colorVar}
        style={{ flexShrink: 0, alignSelf: hasTitle ? 'flex-start' : 'center' }}
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
