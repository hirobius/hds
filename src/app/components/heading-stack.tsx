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

import { forwardRef, type ElementType } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// ── Variants ───────────────────────────────────────────────────────────────────

// 10t-5: heading1/heading2/heading3 prop API preserved; bound to the
// Swiss-canon h1/h2/h3 composites in semantic.typography.* (light weight
// for h1/h2, regular for h3). `gap` is a layout axis (not one of the four
// variant-contract axes), mirroring divider.tsx's `orientation`.
// eslint-disable-next-line tailwindcss/no-arbitrary-value -- semantic space/typography tokens have no Tailwind-theme utility; var()-based so still token-driven
const headingStackVariants = cva('flex flex-col', {
  variants: {
    gap: {
      px4: 'gap-[var(--primitive-space-1)]',
      px8: 'gap-[var(--primitive-space-2)]',
    },
  },
  defaultVariants: { gap: 'px8' },
});

// eslint-disable-next-line tailwindcss/no-arbitrary-value -- semantic typography composite tokens (font-size/font-weight/line-height/letter-spacing) have no Tailwind-theme utility; var()-based so still token-driven
const headingStackLevelVariants = cva('m-0 text-[color:var(--semantic-color-content-primary)]', {
  variants: {
    level: {
      heading1:
        '[font-size:var(--semantic-typography-h1-font-size)] [font-weight:var(--semantic-typography-h1-font-weight)] [line-height:var(--semantic-typography-h1-line-height)] [letter-spacing:var(--semantic-typography-h1-letter-spacing)]',
      heading2:
        '[font-size:var(--semantic-typography-h2-font-size)] [font-weight:var(--semantic-typography-h2-font-weight)] [line-height:var(--semantic-typography-h2-line-height)] [letter-spacing:var(--semantic-typography-h2-letter-spacing)]',
      heading3:
        '[font-size:var(--semantic-typography-h3-font-size)] [font-weight:var(--semantic-typography-h3-font-weight)] [line-height:var(--semantic-typography-h3-line-height)] [letter-spacing:var(--semantic-typography-h3-letter-spacing)]',
    },
  },
});

const headingStackSubheadingClassName =
  'm-0 leading-[1.5] text-[color:var(--semantic-color-content-secondary)] [font-size:var(--semantic-typography-body-font-size)] [font-weight:var(--semantic-typography-body-font-weight)]';

// ── Types ──────────────────────────────────────────────────────────────────────

type HeadingStackGapVariantProps = VariantProps<typeof headingStackVariants>;
type HeadingStackLevelVariantProps = VariantProps<typeof headingStackLevelVariants>;

type HdsHeadingLevel = NonNullable<HeadingStackLevelVariantProps['level']>;
type HdsHeadingGap = NonNullable<HeadingStackGapVariantProps['gap']>;
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

const DEFAULT_HEADING_TAG: Record<HdsHeadingLevel, HdsHeadingTag> = {
  heading1: 'h1',
  heading2: 'h2',
  heading3: 'h3',
};

/** @public */
export const HeadingStack = forwardRef<HTMLElement, HeadingStackProps>(function HeadingStack(
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
    <RootTag ref={ref} className={cn(headingStackVariants({ gap }))}>
      <HeadingTag className={cn(headingStackLevelVariants({ level }))}>{heading}</HeadingTag>
      <SubheadingTag className={headingStackSubheadingClassName}>{subheading}</SubheadingTag>
    </RootTag>
  );
});

/** @internal — CVA variant helpers; compose via HeadingStack props instead. */
export { headingStackVariants, headingStackLevelVariants };
