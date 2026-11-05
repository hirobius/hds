/**
 * Container — semantic width-constrained layout.
 * @category Layout
 * @tier primitive
 * @usage Constrain a page region to the content or maximum width and centre it.
 * @whenNot Spacing between siblings, columns, or a surface with padding.
 * @useInstead Stack spacing between siblings
 * @useInstead Grid columns
 * @useInstead Box one-off layout that no named primitive covers
 * @ai-intent Solves horizontal width constraint and page centering with a
 * semantic max-width scale, so agents stop hand-rolling `marginInline: auto`
 * plus an ad hoc max-width pixel value for page shells.
 * @ai-rules Reach for this named layout intent before Box/sx. maxWidth MUST
 * use the semantic width scale ('content' | 'shell' | 'max'), never a raw px value. Do
 * NOT use the deprecated `padding` prop — it is a no-op; apply padding via
 * Surface or a Stack instead. Do NOT import Container directly inside a page
 * under src/app/pages — use Page, which wraps Container and owns vertical
 * rhythm. For the page gutter, pass `gutter`: it pads inline from
 * semantic.space.region.gutter, which retunes per viewport and density.
 *
 * Centers content horizontally and applies semantic max-width constraints.
 * - maxWidth options: 'content' (760px prose) | 'shell' (1180px app shell) | 'max' (1200px full layout)
 * - gutter: inline padding from the region gutter token (40px comfortable, 24px compact, smaller below sm)
 * - No arbitrary pixel values allowed
 *
 * Usage:
 *   <Container maxWidth="max">
 *     <div>...</div>
 *   </Container>
 */

import type { ReactNode, CSSProperties } from 'react';

type MaxWidthOption = 'content' | 'shell' | 'max';

const maxWidthMap: Record<MaxWidthOption, string> = {
  content: 'var(--semantic-layout-width-content)',
  shell: 'var(--semantic-layout-width-shell)',
  max: 'var(--semantic-layout-width-max)',
};

export interface ContainerProps {
  /** Container content. */
  children: ReactNode;
  /** Max width: 'content' (760px for prose) | 'shell' (1180px app shell) | 'max' (1200px for full layouts). Defaults to 'max'. */
  maxWidth?: MaxWidthOption;
  /** Pad inline with the page gutter token (semantic.space.region.gutter). Off by default. */
  gutter?: boolean;
  /** Deprecated. Container no longer owns internal padding. */
  padding?: string;
  /** Optional inline styles for layout-specific adjustments. */
  style?: CSSProperties;
  /** Optional class hook. */
  className?: string;
}

/** @public */
export function Container({
  children,
  maxWidth = 'max',
  gutter = false,
  padding = 'var(--semantic-space-surface-padding)',
  style,
  className,
}: ContainerProps) {
  void padding;

  const containerStyle: CSSProperties = {
    marginLeft: 'auto',
    marginRight: 'auto',
    maxWidth: maxWidthMap[maxWidth],
    ...(gutter ? { paddingInline: 'var(--semantic-space-region-gutter)' } : undefined),
    ...style,
  };

  return (
    <div className={className} style={containerStyle}>
      {children}
    </div>
  );
}
