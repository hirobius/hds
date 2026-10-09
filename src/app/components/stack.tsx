/**
 * Stack — one-dimensional layout primitive.
 * @category Layout
 * @tier primitive
 * @usage Space items in a row or column with even gaps.
 * @whenNot Multi-column layout, or giving content a background or padding.
 * @useInstead Grid multi-column layout
 * @useInstead Surface content that needs a background or padding
 * @ai-intent Solves vertical and horizontal rhythm with tokenized flex gaps so agents can compose sequences of content without inventing ad hoc spacer divs or margin-based stacking.
 * @ai-rules Use Stack for flow spacing and simple flex alignment only. Do NOT use Stack to create card chrome, internal surface padding, or page-width constraints. Do NOT apply arbitrary margins to Stack to fake spacing between children when the gap prop should own that rhythm. Do NOT use Stack for true two-dimensional layouts that require Grid.
 */

import React from 'react';
import hds from '../design-system/tokens';
import {
  LAYOUT_GAP_NAMES,
  resolveSpacingValue,
  SPACE_SCALE,
  type SpacingVocabulary,
} from './box-sx';

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

export interface StackProps {
  /** Stack content rendered inside the flex wrapper. */
  children: React.ReactNode;
  /** Flex direction for the stack. */
  direction?: 'row' | 'column';
  /**
   * Gap token: semantic (tight, normal, inset, spacious) or primitive (px4, px8, etc). Defaults to 'tight' (16px).
   * Not the t-shirt scale: Stack's 'xs' is the 2px subgrid step, while Box `sx` 'xs' is scale.xs (8px), until the 1.0 rename (hds#206).
   */
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

/**
 * Stack's gap vocabulary, frozen at what each value rendered before hds#206
 * until the 1.0 alias removal. Its four layout names are the shared
 * layout-gap names (hds#404), which read the scale steps that compact density
 * remaps; Box `sx`'s same four names read the fixed `layout.*` vars, so the
 * two differ under compact until both names go.
 * `xs` is the 2px subgrid step, not scale.xs (8px), so Stack cannot take the
 * t-shirt names until this `xs` goes; 'sm' to 'xl' pass through as before.
 * A number stays raw px, the way React's inline style reads it.
 */
const STACK_GAP = {
  names: {
    ...(hds.space as Record<string, string>),
    ...LAYOUT_GAP_NAMES,
    gap: SPACE_SCALE.xs,
    medium: 'var(--semantic-space-component-medium)',
    hairline: 'var(--semantic-space-subgrid-hairline)',
    xs: 'var(--semantic-space-subgrid-xs)',
    stack: 'var(--semantic-space-section-stack)',
  },
  numbers: 'raw',
} satisfies SpacingVocabulary;

/** @public */
export const Stack = /* @__PURE__ */ React.forwardRef<HTMLDivElement, StackProps>(function Stack(
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
        gap: resolveSpacingValue(gap, STACK_GAP),
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
