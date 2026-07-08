/**
 * Center — max-width column, auto-centered horizontally.
 * @category Layout
 * @tier primitive
 * @ai-intent Solves the "centered prose/content column" problem — a
 * max-width box with auto horizontal margins and, optionally, matching
 * horizontal gutters — so agents stop hand-rolling `marginInline: auto` plus
 * an ad hoc max-width value.
 * @ai-rules Reach for this named layout intent before Box/sx. maxWidth MUST
 * use the semantic width scale ('content' | 'max'), never a raw px value.
 * gutter, when set, MUST use a semantic space step, never raw px. Do NOT use
 * Center for full-bleed page shells — use Container. Do NOT use Center when
 * you need the deprecated Container padding prop — gutter replaces it.
 *
 * Every Layout reference: https://every-layout.dev/layouts/center/
 */

import React from 'react';

type CenterMaxWidth = 'content' | 'max';
type LayoutGap = 'tight' | 'normal' | 'inset' | 'spacious';

const maxWidthMap: Record<CenterMaxWidth, string> = {
  content: 'var(--semantic-layout-width-content)',
  max: 'var(--semantic-layout-width-max)',
};

const gutterMap: Record<LayoutGap, string> = {
  tight: 'var(--semantic-space-layout-tight)',
  normal: 'var(--semantic-space-layout-normal)',
  inset: 'var(--semantic-space-layout-inset)',
  spacious: 'var(--semantic-space-layout-spacious)',
};

interface CenterProps {
  /** Center content. */
  children: React.ReactNode;
  /** Max width: 'content' (760px prose) | 'max' (1200px full layouts). Defaults to 'content'. */
  maxWidth?: CenterMaxWidth;
  /** Optional matching horizontal gutter (padding-inline) from the semantic space scale. */
  gutter?: LayoutGap;
  /** Escape hatch: only use when tokenized props cannot express the required wrapper class. */
  className?: string;
  /** Escape hatch: only use for narrow layout adjustments that do not belong in the primitive API. */
  style?: React.CSSProperties;
  /** Element rendered as the outer wrapper. Defaults to 'div'. */
  as?: React.ElementType;
}

/** @public */
export const Center = React.forwardRef<HTMLDivElement, CenterProps>(function Center(
  { children, maxWidth = 'content', gutter, className, style, as: Tag = 'div' },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={className}
      data-hds-component="Center"
      data-hds-metrics={`maxWidth:${maxWidth}`}
      style={{
        marginLeft: 'auto',
        marginRight: 'auto',
        maxWidth: maxWidthMap[maxWidth],
        ...(gutter && { paddingLeft: gutterMap[gutter], paddingRight: gutterMap[gutter] }),
        ...style,
      }}
    >
      {children}
    </Tag>
  );
});
