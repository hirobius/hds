/**
 * Pin — sticky-pin an element within its scroll region.
 * @category Layout
 * @tier primitive
 * @ai-intent Pins content in view (`position: sticky`) while its surrounding
 * section scrolls — the dependency-free basis for pinned scroll scenes (the
 * "tall section + sticky child" pattern that GSAP's `pin: true` solves
 * imperatively). Reach for this before hand-rolling sticky positioning.
 * @ai-rules `top` is a CSS length offset (a dimension, not a spacing step).
 * Give the pinned element a TALLER scrolling parent so it has room to travel.
 * For the scroll-scrubbed animation inside a pinned scene, use CSS
 * `animation-timeline` (see Reveal) or `useScrollProgress` from
 * `@hirobius/design-system/scroll`. See ADR-021.
 */
import React from 'react';

interface PinProps {
  /** Content pinned within the scroll region. */
  children: React.ReactNode;
  /** Sticky offset from the top of the scroll region (CSS length). Defaults to '0'. */
  top?: string;
  /** Escape hatch: extra wrapper classes. */
  className?: string;
  /** Escape hatch: narrow style adjustments that do not belong in the primitive API. */
  style?: React.CSSProperties;
  /** Element rendered as the wrapper. Defaults to 'div'. */
  as?: React.ElementType;
}

/** @public */
export const Pin = React.forwardRef<HTMLDivElement, PinProps>(function Pin(
  { children, top = '0', className, style, as: Tag = 'div' },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={['hds-pin', className].filter(Boolean).join(' ')}
      data-hds-component="Pin"
      style={{ '--hds-pin-top': top, ...style } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
});
