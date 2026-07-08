/**
 * Reveal — reveal-on-scroll primitive via CSS scroll-driven animation.
 * @category Motion
 * @tier primitive
 * @ai-intent Fades/slides/scales content in as it enters the viewport, driven
 * purely by scroll position (`animation-timeline: view()`) — no JS, no deps, no
 * IntersectionObserver. Reach for this before hand-rolling reveal logic.
 * @ai-rules Content is fully visible by DEFAULT; the effect applies only where
 * `animation-timeline` is supported AND the user has not requested reduced
 * motion (both fall back to visible, never stuck hidden). Pick `animation` from
 * the fixed set — do not hand-roll keyframes. For momentum/inertia scrolling
 * wrap the app in `SmoothScroll`; for a scroll-progress value in JS use
 * `useScrollProgress` — both from `@hirobius/design-system/scroll`. See ADR-021.
 */
import React from 'react';

export type RevealAnimation = 'fade' | 'fade-up' | 'fade-down' | 'scale';

interface RevealProps {
  /** Content revealed as it scrolls into view. */
  children: React.ReactNode;
  /** Entrance animation. Defaults to 'fade-up'. */
  animation?: RevealAnimation;
  /** Escape hatch: extra wrapper classes. */
  className?: string;
  /** Escape hatch: narrow style adjustments that do not belong in the primitive API. */
  style?: React.CSSProperties;
  /** Element rendered as the wrapper. Defaults to 'div'. */
  as?: React.ElementType;
}

/** @public */
export const Reveal = React.forwardRef<HTMLDivElement, RevealProps>(function Reveal(
  { children, animation = 'fade-up', className, style, as: Tag = 'div' },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={['hds-reveal', className].filter(Boolean).join(' ')}
      data-reveal={animation}
      data-hds-component="Reveal"
      data-hds-metrics={`animation:${animation}`}
      style={style}
    >
      {children}
    </Tag>
  );
});
