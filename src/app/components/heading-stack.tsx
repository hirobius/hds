/**
 * HeadingStack — enforced vertical rhythm for heading + subheading pairs.
 *
 * Automatically handles gap and secondary color, preventing manual stacking.
 * - Heading level: 'heading1' | 'heading2' | 'heading3'
 * - Gap: px4 (tight) | px8 (default)
 * - Subheading color: always var(--semantic-color-content-secondary)
 *
 * GUARDRAIL: Never manually stack headings using Stack. Always use HeadingStack.
 *
 * Usage:
 *   <HeadingStack level="heading1" heading="Main Title" subheading="Subtitle text" />
 *   <HeadingStack level="heading2" heading="Section" subheading="Description" gap="px4" />
 *
 * @category Typography
 * @tier primitive
 * @doc-exempt: internal typography lockup utility, documented through page composition rather than a standalone component page
 */

import React, { forwardRef, type CSSProperties, type ElementType } from 'react';
import hds from '../design-system/tokens';

type HdsHeadingLevel = 'heading1' | 'heading2' | 'heading3';
type HdsHeadingGap = 'px4' | 'px8';
type HdsHeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
type HdsSupportingTag = 'p' | 'div' | 'span';

interface HeadingStackProps {
  /** The heading content (string). */
  heading: string;
  /** The supporting copy rendered beneath the heading. */
  subheading: string;
  /** Semantic heading level: heading1 | heading2 | heading3. */
  level: HdsHeadingLevel;
  /** Gap between heading and subheading: px4 (tight) | px8 (default). */
  gap?: HdsHeadingGap;
  /** Override the root semantic wrapper while preserving the governed layout styles. */
  as?: ElementType;
  /** Override the heading tag without altering the applied typography style. */
  headingAs?: HdsHeadingTag;
  /** Override the supporting-copy tag. */
  subheadingAs?: HdsSupportingTag;
}

// 10t-5: heading1/heading2/heading3 prop API preserved; bound to the
// Swiss-canon h1/h2/h3 composites in semantic.typography.* (light weight
// for h1/h2, regular for h3).
const LEVEL_STYLES: Record<HdsHeadingLevel, CSSProperties> = {
  heading1: {
    fontSize: 'var(--semantic-typography-h1-font-size)',
    fontWeight: 'var(--semantic-typography-h1-font-weight)',
    lineHeight: 'var(--semantic-typography-h1-line-height)',
    letterSpacing: 'var(--semantic-typography-h1-letter-spacing)',
  },
  heading2: {
    fontSize: 'var(--semantic-typography-h2-font-size)',
    fontWeight: 'var(--semantic-typography-h2-font-weight)',
    lineHeight: 'var(--semantic-typography-h2-line-height)',
    letterSpacing: 'var(--semantic-typography-h2-letter-spacing)',
  },
  heading3: {
    fontSize: 'var(--semantic-typography-h3-font-size)',
    fontWeight: 'var(--semantic-typography-h3-font-weight)',
    lineHeight: 'var(--semantic-typography-h3-line-height)',
    letterSpacing: 'var(--semantic-typography-h3-letter-spacing)',
  },
};

const DEFAULT_HEADING_TAG: Record<HdsHeadingLevel, HdsHeadingTag> = {
  heading1: 'h1',
  heading2: 'h2',
  heading3: 'h3',
};

/** @public */
export const HeadingStack = forwardRef<HTMLElement, HeadingStackProps>(
  function HeadingStack(
    {
      heading,
      subheading,
      level,
      gap = 'px8',
      as: RootTag = 'div',
      headingAs,
      subheadingAs: SubheadingTag = 'p',
    },
    ref,
  ) {
    const HeadingTag = headingAs ?? DEFAULT_HEADING_TAG[level];

    return (
      <RootTag
        ref={ref}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: hds.space[gap],
        }}
      >
        <HeadingTag
          style={{
            ...LEVEL_STYLES[level],
            margin: 0,
            color: 'var(--semantic-color-content-primary)',
          }}
        >
          {heading}
        </HeadingTag>
        <SubheadingTag
          style={{
            fontSize: 'var(--semantic-typography-body-font-size)',
            fontWeight: 'var(--semantic-typography-body-font-weight)',
            margin: 0,
            color: 'var(--semantic-color-content-secondary)',
            lineHeight: 1.5,
          }}
        >
          {subheading}
        </SubheadingTag>
      </RootTag>
    );
  },
);
