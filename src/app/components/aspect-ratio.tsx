/**
 * AspectRatio — constrains its child to a fixed width:height ratio.
 * @category Layout
 * @tier primitive
 *
 * Thin token-free wrapper over Radix AspectRatio (@radix-ui/react-aspect-ratio),
 * which holds a responsive aspect box via the padding-bottom technique so media
 * (images, video, embeds, map tiles) never causes layout shift while loading.
 *
 *   <AspectRatio ratio={16 / 9}>
 *     <img src="…" alt="…" className="h-full w-full object-cover" />
 *   </AspectRatio>
 */

import * as React from 'react';
import * as AspectRatioPrimitive from '@radix-ui/react-aspect-ratio';

// ── Types ──────────────────────────────────────────────────────────────────────

/** @public */
export interface AspectRatioProps extends React.ComponentPropsWithoutRef<
  typeof AspectRatioPrimitive.Root
> {
  /** Desired width-to-height ratio, e.g. `16 / 9`. Defaults to `1` (square). */
  ratio?: number;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Locks its single child to the given width-to-height `ratio` so media reserves
 * its box up front and never causes layout shift while it loads.
 */
export const AspectRatio = React.forwardRef<
  React.ElementRef<typeof AspectRatioPrimitive.Root>,
  AspectRatioProps
>(function AspectRatio({ ratio = 1, ...props }, ref) {
  return <AspectRatioPrimitive.Root ref={ref} ratio={ratio} {...props} />;
});
