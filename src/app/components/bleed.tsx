/**
 * Bleed — controlled negative-margin full-bleed within a padded container.
 * @category Layout
 * @tier primitive
 * @ai-intent Solves "this one child needs to visually escape its parent's
 * padding" (a full-width image inside a padded card, a divider that should
 * touch both edges) with a single tokenized negative-margin wrapper, so
 * agents stop hand-rolling `margin: -24px` guesses that drift from the
 * parent's actual padding token.
 * @ai-rules Reach for this named layout intent before Box/sx. amount MUST
 * use a semantic space step, never raw px, and MUST match the ancestor
 * padding it is meant to cancel out. Do NOT use Bleed to fake extra spacing
 * — its only job is canceling a specific known padding value on a specific
 * axis.
 *
 * Every Layout reference: https://every-layout.dev/layouts/the-stack/ (bleed
 * is the inverse of a padded Center/Container — HDS names it separately
 * since "every-layout" itself does not ship a dedicated Bleed recipe).
 */

import React from 'react';

type LayoutGap = 'tight' | 'normal' | 'inset' | 'spacious';
type BleedAxis = 'x' | 'y' | 'both';

const amountMap: Record<LayoutGap, string> = {
  tight: 'var(--semantic-space-layout-tight)',
  normal: 'var(--semantic-space-layout-normal)',
  inset: 'var(--semantic-space-layout-inset)',
  spacious: 'var(--semantic-space-layout-spacious)',
};

interface BleedProps {
  /** Bleed content. */
  children: React.ReactNode;
  /** Semantic space step to negate. Defaults to 'normal'. */
  amount?: LayoutGap;
  /** Which axis the negative margin applies to. Defaults to 'x'. */
  axis?: BleedAxis;
  /** Escape hatch: only use when tokenized props cannot express the required wrapper class. */
  className?: string;
  /** Escape hatch: only use for narrow layout adjustments that do not belong in the primitive API. */
  style?: React.CSSProperties;
  /** Element rendered as the outer wrapper. Defaults to 'div'. */
  as?: React.ElementType;
}

/** @public */
export const Bleed = React.forwardRef<HTMLDivElement, BleedProps>(function Bleed(
  { children, amount = 'normal', axis = 'x', className, style, as: Tag = 'div' },
  ref,
) {
  const negative = `calc(-1 * ${amountMap[amount]})`;

  return (
    <Tag
      ref={ref}
      className={className}
      data-hds-component="Bleed"
      data-hds-metrics={`amount:${amount}`}
      style={{
        ...((axis === 'x' || axis === 'both') && { marginLeft: negative, marginRight: negative }),
        ...((axis === 'y' || axis === 'both') && { marginTop: negative, marginBottom: negative }),
        ...style,
      }}
    >
      {children}
    </Tag>
  );
});
