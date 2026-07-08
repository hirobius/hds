/**
 * Cover — vertical shell with an auto-centered main region.
 * @category Layout
 * @tier primitive
 * @ai-intent Solves the "full-height section with an optional header, a
 * centered hero/main region that absorbs the remaining space, and an
 * optional footer" problem via the flex auto-margin centering technique, so
 * agents stop hand-rolling `position: absolute` centering or a fixed 50vh
 * split.
 * @ai-rules Reach for this named layout intent before Box/sx. gap MUST use a
 * semantic space step, never raw px. minHeight is a CSS length dimension
 * (not spacing) — defaults to '100svh' (small viewport height, safe against
 * mobile browser chrome). Pass minHeight="100vh" explicitly if you need the
 * classic viewport unit for a target that predates svh support. Do NOT use
 * Cover for ordinary page content flow — use Stack.
 *
 * Every Layout reference: https://every-layout.dev/layouts/cover/
 */

import React from 'react';

type LayoutGap = 'tight' | 'normal' | 'inset' | 'spacious';

const gapMap: Record<LayoutGap, string> = {
  tight: 'var(--semantic-space-layout-tight)',
  normal: 'var(--semantic-space-layout-normal)',
  inset: 'var(--semantic-space-layout-inset)',
  spacious: 'var(--semantic-space-layout-spacious)',
};

interface CoverProps {
  /** The centered main region — takes the remaining space via auto margins. Also available as `centerSlot`. */
  children?: React.ReactNode;
  /** Alias for `children` — the centered main region. If both are set, `centerSlot` wins. */
  centerSlot?: React.ReactNode;
  /** Optional content pinned to the top. */
  header?: React.ReactNode;
  /** Optional content pinned to the bottom. */
  footer?: React.ReactNode;
  /** Minimum block size of the cover (CSS length). Defaults to '100svh'. */
  minHeight?: string;
  /** Gap enforced between header/main/footer, in addition to the auto-margin centering. Defaults to 'normal'. */
  gap?: LayoutGap;
  /** Escape hatch: only use when tokenized props cannot express the required wrapper class. */
  className?: string;
  /** Escape hatch: only use for narrow layout adjustments that do not belong in the primitive API. */
  style?: React.CSSProperties;
  /** Element rendered as the outer wrapper. Defaults to 'div'. */
  as?: React.ElementType;
}

/** @public */
export const Cover = React.forwardRef<HTMLDivElement, CoverProps>(function Cover(
  {
    children,
    centerSlot,
    header,
    footer,
    minHeight = '100svh',
    gap = 'normal',
    className,
    style,
    as: Tag = 'div',
  },
  ref,
) {
  const main = centerSlot ?? children;

  return (
    <Tag
      ref={ref}
      className={className}
      data-hds-component="Cover"
      data-hds-metrics={`gap:${gap}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight,
        gap: gapMap[gap],
        ...style,
      }}
    >
      {header && <div style={{ flexShrink: 0 }}>{header}</div>}
      <div style={{ marginTop: 'auto', marginBottom: 'auto', width: '100%' }}>{main}</div>
      {footer && <div style={{ flexShrink: 0 }}>{footer}</div>}
    </Tag>
  );
});
