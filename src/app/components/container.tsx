/**
 * Container — semantic width-constrained layout.
 * @category Layout
 * @tier primitive
 * @ai-intent Solves horizontal width constraint and page centering with a
 * semantic max-width scale, so agents stop hand-rolling `marginInline: auto`
 * plus an ad hoc max-width pixel value for page shells.
 * @ai-rules Reach for this named layout intent before Box/sx. maxWidth MUST
 * use the semantic width scale ('content' | 'max'), never a raw px value. Do
 * NOT use the deprecated `padding` prop — it is a no-op; apply padding via
 * Surface or a Stack instead. Do NOT import Container directly inside a page
 * under src/app/pages — use Page, which wraps Container and owns vertical
 * rhythm. Use Center instead when you also need a horizontal gutter, which
 * Container does not support.
 *
 * Centers content horizontally and applies semantic max-width constraints.
 * - maxWidth options: 'content' (760px prose) | 'max' (1200px full layout)
 * - No arbitrary pixel values allowed
 *
 * Usage:
 *   <Container maxWidth="max">
 *     <div>...</div>
 *   </Container>
 */

import type { ReactNode, CSSProperties } from 'react';

type MaxWidthOption = 'content' | 'max';

const maxWidthMap: Record<MaxWidthOption, string> = {
  content: 'var(--semantic-layout-width-content)',
  max: 'var(--semantic-layout-width-max)',
};

interface ContainerProps {
  /** Container content. */
  children: ReactNode;
  /** Max width: 'content' (760px for prose) | 'max' (1200px for full layouts). Defaults to 'max'. */
  maxWidth?: MaxWidthOption;
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
  padding = 'var(--semantic-space-component-padding)',
  style,
  className,
}: ContainerProps) {
  void padding;

  const containerStyle: CSSProperties = {
    marginLeft: 'auto',
    marginRight: 'auto',
    maxWidth: maxWidthMap[maxWidth],
    ...style,
  };

  return (
    <div className={className} style={containerStyle}>
      {children}
    </div>
  );
}
