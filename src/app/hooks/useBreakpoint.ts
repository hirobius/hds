/**
 * useAtLeast / useBreakpoint — read an HDS breakpoint in JS (hds#824).
 *
 * HDS lays out with CSS (Sidebar, Switcher and Grid wrap by width, `sx`
 * compiles responsive keys to `@media (min-width: …)`), but some screens render
 * different markup per width: a Table at desktop, rows on a phone. These hooks
 * answer "how wide is the viewport?" in the same breakpoint vocabulary `sx`
 * uses, from the same values (`BOX_BREAKPOINTS`: xs 375, sm 640, md 768,
 * lg 1024, xl 1280), so a consumer never writes a pixel width of its own.
 *
 * Narrow by default: on the server, in jsdom, or anywhere `matchMedia` is
 * missing, `useAtLeast` returns `false` and `useBreakpoint` returns `'base'`.
 * The narrow layout works at every width, and hydration starts from it before
 * the client reads the real width. Both update live as the viewport crosses a
 * breakpoint (`useSyncExternalStore` over `matchMedia` change events).
 *
 * @example
 * const wide = useAtLeast('lg');
 * return wide ? <JobsTable jobs={jobs} /> : <JobCards jobs={jobs} />;
 */
import { useCallback, useSyncExternalStore } from 'react';
import { BOX_BREAKPOINTS, type Breakpoint } from '../components/box-sx';

/** Breakpoint keys from narrowest to widest, as `sx` orders its media blocks. */
const KEYS = Object.keys(BOX_BREAKPOINTS) as Breakpoint[];

const hasMatchMedia = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/** The media query `sx` compiles for a breakpoint key. */
function minWidthQuery(bp: Breakpoint): string {
  return `(min-width: ${BOX_BREAKPOINTS[bp]}px)`;
}

function subscribeTo(queries: readonly string[], onChange: () => void): () => void {
  if (!hasMatchMedia()) return () => {};
  const lists = queries.map((q) => window.matchMedia(q));
  for (const mql of lists) {
    // Safari < 14 has only the deprecated addListener.
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener?.(onChange);
  }
  return () => {
    for (const mql of lists) {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener?.(onChange);
    }
  };
}

const matches = (query: string): boolean => hasMatchMedia() && window.matchMedia(query).matches;

const narrow = (): false => false;

/**
 * True while the viewport is at least the HDS breakpoint `bp` wide: the same
 * `(min-width: …)` an `sx` value keyed `bp` switches on at. `false` on the
 * server and without `matchMedia`.
 */
export function useAtLeast(bp: Breakpoint): boolean {
  const query = minWidthQuery(bp);
  // Stable per query, so useSyncExternalStore doesn't resubscribe every render.
  const subscribe = useCallback((onChange: () => void) => subscribeTo([query], onChange), [query]);
  const getSnapshot = useCallback(() => matches(query), [query]);
  return useSyncExternalStore(subscribe, getSnapshot, narrow);
}

const ALL_QUERIES = KEYS.map(minWidthQuery);

const subscribeAll = (onChange: () => void): (() => void) => subscribeTo(ALL_QUERIES, onChange);

function widestMatching(): Breakpoint | 'base' {
  let current: Breakpoint | 'base' = 'base';
  for (const bp of KEYS) {
    if (matches(minWidthQuery(bp))) current = bp;
  }
  return current;
}

const base = (): 'base' => 'base';

/**
 * The widest HDS breakpoint the viewport has reached, or `'base'` below `xs`
 * (and on the server or without `matchMedia`). The keys are the `sx`
 * `ResponsiveValue` keys, so the result can index a responsive map.
 * For one yes/no question prefer {@link useAtLeast}, which re-renders only when
 * that one breakpoint is crossed.
 */
export function useBreakpoint(): Breakpoint | 'base' {
  return useSyncExternalStore(subscribeAll, widestMatching, base);
}
