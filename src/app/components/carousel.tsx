/**
 * Carousel — a horizontally-scrollable, scroll-snap track of slides with
 * Prev/Next affordances, implemented natively on top of CSS scroll-snap.
 * @category Display
 * @tier pattern
 * @public
 */

// motion-ok: native CSS scroll-snap + scrollBy smooth; prev/next are scroll affordances

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Slides rendered inside the scroll-snap track. */
  children: React.ReactNode;
  /** Accessible name for the carousel region. Defaults to 'Carousel'. */
  ariaLabel?: string;
  /** Show the Prev/Next scroll affordance buttons. Defaults to true. */
  showControls?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

/** Renders children as a snap-scrolling track with Prev/Next scroll buttons. */
export const Carousel = React.forwardRef<HTMLElement, CarouselProps>(function Carousel(
  { className, children, ariaLabel = 'Carousel', showControls = true, ...rest },
  ref,
) {
  const trackRef = React.useRef<HTMLDivElement>(null);

  const scrollByTrack = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth, behavior: 'smooth' });
  };

  return (
    <section
      ref={ref}
      aria-label={ariaLabel}
      aria-roledescription="carousel"
      className={cn('relative', className)}
      {...rest}
    >
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth rounded-md border border-border bg-background text-foreground"
      >
        {React.Children.map(children, (child, i) => (
          <div
            key={React.isValidElement(child) && child.key !== null ? child.key : i}
            className="snap-start shrink-0"
          >
            {child}
          </div>
        ))}
      </div>
      {showControls && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => scrollByTrack(-1)}
            className="hds-focus absolute left-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-input bg-background hover:bg-accent"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => scrollByTrack(1)}
            className="hds-focus absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-input bg-background hover:bg-accent"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </>
      )}
    </section>
  );
});
