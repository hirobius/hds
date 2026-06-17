/**
 * Tag — interactive filter and category chip.
 * @category Inputs
 * @tier primitive
 *
 * The outer <button> carries the accessible 44px hit target directly via the
 * size token while the inner pill keeps the visible surface compact. Colors
 * (background, border-color, color) are owned by .hds-tag-btn / .hds-tag-pill
 * in theme.css so :hover transitions work — inline styles beat :hover
 * selectors and would silently break the effect.
 *
 * Active state: brand fill via [data-active="true"] in theme.css.
 * Hover states: inactive → subtle tint + brand border; active → brand-hover fill.
 */

import React, { type CSSProperties, type ReactNode } from 'react';
import hds from '../design-system/tokens';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TagProps {
  /** Tag content displayed inside the pill. */
  children: ReactNode;
  /** Whether the tag is active. */
  active?: boolean;
  /** Click handler for toggling the tag. */
  onClick?: () => void;
  /** Optional class hook for parent-level styling. */
  className?: string;
  /** Native tooltip for explicit file/path affordance. */
  title?: string;
  /** Accessible label when the visible text is abbreviated. */
  ariaLabel?: string;
}

// ── Style ──────────────────────────────────────────────────────────────────────
// No color properties — .hds-tag-pill owns background, border-color, color.

const buttonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  borderWidth: 0,
  background: 'transparent',
  userSelect: 'none' as const,
  cursor: 'pointer',
  // tier-ok: primitive tag hit target
  minWidth: hds.size.interactive.min,
  transition: `background-color ${hds.motion.productive.duration}s ease, color ${hds.motion.productive.duration}s ease, transform ${hds.motion.productive.duration}s ease`,
} satisfies CSSProperties;

const pillStyle = {
  ...hds.typeStyles.ui,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
  minWidth: 'var(--component-tag-minWidth)',
  minHeight: 'var(--component-tag-minHeight)',
  paddingTop: 'var(--component-tag-paddingY)',
  paddingBottom: 'var(--component-tag-paddingY)',
  paddingLeft: 'var(--component-tag-paddingX)',
  paddingRight: 'var(--component-tag-paddingX)',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderRadius: hds.borderRadius.action,
  whiteSpace: 'nowrap',
  pointerEvents: 'none' as const,
} satisfies CSSProperties;

// ── Component ──────────────────────────────────────────────────────────────────

/** @public */
export const Tag = React.forwardRef<HTMLButtonElement, TagProps>(function Tag(
  { children, active = false, onClick, className, title, ariaLabel },
  ref,
) {
  const classes = ['hds-tag-btn', className].filter(Boolean).join(' ');
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      title={title}
      data-active={active ? 'true' : undefined}
      className={`hds-focus ${classes}`}
      style={buttonStyle}
    >
      <span className="hds-tag-pill" style={pillStyle}>
        {children}
      </span>
    </button>
  );
});
