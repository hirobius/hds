/**
 * Stack — one-dimensional layout primitive.
 * @category Layout
 * @tier primitive
 * @ai-intent Solves vertical and horizontal rhythm with tokenized flex gaps so agents can compose sequences of content without inventing ad hoc spacer divs or margin-based stacking.
 * @ai-rules Use Stack for flow spacing and simple flex alignment only. Do NOT use Stack to create card chrome, internal surface padding, or page-width constraints. Do NOT apply arbitrary margins to Stack to fake spacing between children when the gap prop should own that rhythm. Do NOT use Stack for true two-dimensional layouts that require Grid.
 */

import React from 'react';
import hds from '../design-system/tokens';

type SemanticGap = 'tight' | 'normal' | 'inset' | 'spacious';
type ComponentGap = 'gap' | 'medium';
type SubgridGap = 'hairline' | 'xs' | 'gap';
type SectionGap = 'stack';
type GapOption = SemanticGap | ComponentGap | SubgridGap | SectionGap | keyof typeof hds.space;

type FlexAlign = 'start' | 'center' | 'end' | 'stretch';
type FlexJustify = 'start' | 'center' | 'end' | 'space-between';

const alignMap: Record<FlexAlign, React.CSSProperties['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

const justifyMap: Record<FlexJustify, React.CSSProperties['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  'space-between': 'space-between',
};

interface StackProps {
  /** Stack content rendered inside the flex wrapper. */
  children: React.ReactNode;
  /** Flex direction for the stack. */
  direction?: 'row' | 'column';
  /** Gap token: semantic (tight, normal, inset, spacious) or primitive (px4, px8, etc). Defaults to 'tight' (16px). */
  gap?: GapOption;
  /** Cross-axis alignment: start | center | end | stretch. */
  align?: FlexAlign;
  /** Main-axis distribution: start | center | end | space-between. */
  justify?: FlexJustify;
  /** Whether children may wrap. */
  wrap?: React.CSSProperties['flexWrap'];
  /** Escape hatch: only use when tokenized props cannot express the required wrapper class. */
  className?: string;
  /** Escape hatch: only use for narrow layout adjustments that do not belong in the primitive API. */
  style?: React.CSSProperties;
  /** Element rendered as the outer wrapper. */
  as?: React.ElementType;
}

const getGapValue = (gap: GapOption): string => {
  const semanticGaps: Record<string, string> = {
    tight: 'var(--semantic-space-layout-tight)',
    normal: 'var(--semantic-space-layout-normal)',
    inset: 'var(--semantic-space-layout-inset)',
    spacious: 'var(--semantic-space-layout-spacious)',
    stack: 'var(--semantic-space-section-stack)',
    gap: 'var(--semantic-space-component-gap)',
    medium: 'var(--semantic-space-component-medium)',
    hairline: 'var(--semantic-space-subgrid-hairline)',
    xs: 'var(--semantic-space-subgrid-xs)',
  };
  return semanticGaps[gap] || ((hds.space as Record<string, unknown>)[gap] as string) || gap;
};

/** @public */
export const Stack = React.forwardRef<HTMLDivElement, StackProps>(function Stack(
  {
    children,
    direction = 'column',
    gap = 'tight',
    align,
    justify,
    wrap,
    className,
    style,
    as: Tag = 'div',
  },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={className}
      data-hds-component="Stack"
      data-hds-metrics={`gap:${gap}`}
      style={{
        display: 'flex',
        flexDirection: direction,
        gap: getGapValue(gap),
        alignItems: align ? alignMap[align] : direction === 'row' ? 'stretch' : undefined,
        justifyContent: justify ? justifyMap[justify] : undefined,
        flexWrap: wrap,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
});
