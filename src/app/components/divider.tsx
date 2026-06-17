/**
 * Divider — semantic separator between content regions.
 * @category Layout
 * @tier primitive
 */

import type { CSSProperties } from 'react';
import hds from '../design-system/tokens';

// ── Types ──────────────────────────────────────────────────────────────────────

interface DividerProps {
  /** Divider orientation. */
  orientation?: 'horizontal' | 'vertical';
  /** Perpendicular spacing around the divider. */
  spacing?: string | number;
  /** Increase the stroke weight for stronger separation. */
  strong?: boolean;
  /** Optional inline styles for one-off layout adjustments. */
  style?: CSSProperties;
  /** Optional class hook for parent-level styling. */
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** @public */
export function Divider({
  orientation = 'horizontal',
  spacing,
  strong = false,
  style,
  className,
}: DividerProps) {
  const borderColor = strong
    ? 'var(--semantic-color-border-strong)'
    : 'var(--semantic-color-border-default)';

  const isHorizontal = orientation === 'horizontal';
  const resolvedStyle = style && typeof style === 'object' ? style : undefined;

  return (
    <hr
      aria-orientation={orientation}
      className={className}
      style={{
        border: 'none',
        margin: 0,
        flexShrink: 0,
        alignSelf: isHorizontal ? 'stretch' : undefined,
        ...(isHorizontal
          ? {
              borderTop: `${hds.borderWidth.default} solid ${borderColor}`,
              width: '100%',
              marginTop: spacing,
              marginBottom: spacing,
            }
          : {
              borderLeft: `${hds.borderWidth.default} solid ${borderColor}`,
              height: '100%',
              marginLeft: spacing,
              marginRight: spacing,
            }),
        ...(resolvedStyle ?? {}),
      }}
    />
  );
}
