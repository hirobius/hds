/** @internal — shared by TabsList and Table; not part of the public API surface. */
import type { CSSProperties } from 'react';

/** Which edges of a horizontal scroller have content scrolled out of view. */
export type ScrollEdgeOverflow = 'start' | 'end' | 'both' | undefined;

export function measureScrollEdges(el: HTMLElement): ScrollEdgeOverflow {
  const hiddenStart = el.scrollLeft > 1;
  const hiddenEnd = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  if (hiddenStart && hiddenEnd) return 'both';
  if (hiddenStart) return 'start';
  if (hiddenEnd) return 'end';
  return undefined;
}

const FADE = 'var(--semantic-space-scale-lg)';

/**
 * Mask that fades the edge(s) with hidden content, one fade width (scale.lg) deep.
 * Inline, so it costs no CSS; a mask needs no colour, so it holds in light and dark.
 */
export function scrollEdgeFadeStyle(overflow: ScrollEdgeOverflow): CSSProperties | undefined {
  if (!overflow) return undefined;
  const start = overflow === 'end' ? '0px' : FADE;
  const end = overflow === 'start' ? '0px' : FADE;
  const mask = `linear-gradient(90deg,transparent,currentColor ${start},currentColor calc(100% - ${end}),transparent)`;
  return { maskImage: mask, WebkitMaskImage: mask };
}
