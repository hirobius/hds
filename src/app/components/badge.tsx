/**
 * Badge - compact feedback badge for neutral and semantic states.
 * @category Feedback
 * @tier primitive
 */
"use client";

import React, { type CSSProperties, type ReactNode } from 'react';
import hds from '../design-system/tokens';
import { useTheme } from '../context/ThemeContext';

interface BadgeProps {
  /** Badge content. */
  children: ReactNode;
  /** Feedback tone; neutral is the default quiet metadata badge. */
  tone?: 'neutral' | 'info' | 'success' | 'danger' | 'warning';
  /** Element rendered as the badge wrapper. Defaults to 'span'. */
  as?: React.ElementType;
}

const badgeStyle = {
  ...hds.typeStyles.eyebrow,
  // Badge is intentionally smaller than the eyebrow default (13px → 11px) — a
  // compact metadata chip, not a kicker label. fontSize is the only deviation;
  // textTransform + letterSpacing + fontWeight inherit from the eyebrow token.
  fontSize: '11px',
  display: 'inline-flex',
  width: 'fit-content',
  alignItems: 'center',
  justifyContent: 'center',
  height: 'var(--component-badge-height)',
  minWidth: 'var(--component-badge-minWidth)',
  paddingTop: `calc(var(--component-badge-paddingY) + ${hds.borderWidth.default})`,
  paddingBottom: `calc(var(--component-badge-paddingY) + (${hds.borderWidth.default} * 2))`,
  paddingLeft: 'var(--component-badge-paddingX)',
  paddingRight: 'var(--component-badge-paddingX)',
  borderRadius: 'var(--component-badge-radius)',
  whiteSpace: 'nowrap',
  lineHeight: 1,
  boxSizing: 'border-box',
} satisfies CSSProperties;

const badgeContentStyle = {
  display: 'block',
  lineHeight: 1,
  transform: `translateY(${hds.space.px2})`,
} satisfies CSSProperties;

// Semantic tones share the feedback color matrix; neutral is computed at render time from theme.
const semanticToneStyles = {
  info: {
    background: 'var(--semantic-color-feedback-bg-info)',
    color: 'var(--semantic-color-feedback-info)',
  },
  success: {
    background: 'var(--semantic-color-feedback-bg-success)',
    color: 'var(--semantic-color-feedback-success)',
  },
  danger: {
    background: 'var(--semantic-color-feedback-bg-error)',
    color: 'var(--semantic-color-feedback-error)',
  },
  warning: {
    background: 'var(--semantic-color-feedback-bg-warning)',
    color: 'var(--semantic-color-feedback-warning)',
  },
} satisfies Record<'info' | 'success' | 'danger' | 'warning', CSSProperties>;

/** @public */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge({ children, tone = 'neutral', as: Tag = 'span' }, ref) {
    const { isDark } = useTheme();

    const neutralStyle: CSSProperties = {
      background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)', // audit-ok: no semantic token for 4% opacity overlay
      color: 'var(--semantic-color-content-secondary)',
    };

    const toneStyle = tone === 'neutral' ? neutralStyle : semanticToneStyles[tone];

    return (
      <Tag ref={ref} style={{ ...badgeStyle, ...toneStyle }}>
        <span style={badgeContentStyle}>{children}</span>
      </Tag>
    );
  },
);

