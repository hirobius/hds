/**
 * jsdom stand-ins shared by the scrolling-rail tests in
 * src/app/components/segmented-control.test.tsx and tabs.test.tsx (hds#823),
 * which both check that the selected item scrolls into view.
 *
 * Not a test file (no `.test.` in the name), so vitest does not collect it.
 */
import { vi } from 'vitest';

/** jsdom has no layout: give the rail a 300px box and each item a 120px slot (600px of content). */
export function layoutScrollRail(rail: HTMLElement, items: Iterable<HTMLElement>) {
  Object.defineProperty(rail, 'clientWidth', { configurable: true, value: 300 });
  Object.defineProperty(rail, 'scrollWidth', { configurable: true, value: 600 });
  rail.getBoundingClientRect = () => ({ left: 0, right: 300, width: 300 }) as DOMRect;
  Array.from(items).forEach((item, i) => {
    item.getBoundingClientRect = () =>
      ({
        left: i * 120 - rail.scrollLeft,
        right: i * 120 + 120 - rail.scrollLeft,
        width: 120,
      }) as DOMRect;
  });
}

/** Installs a `scrollTo` that records calls and moves `scrollLeft`; returns the mock. */
export function installScrollToMock() {
  const scrollTo = vi.fn(function (this: HTMLElement, opts: ScrollToOptions) {
    this.scrollLeft = opts.left ?? 0;
  });
  (HTMLElement.prototype as unknown as { scrollTo: unknown }).scrollTo = scrollTo;
  return scrollTo;
}

/** Removes the `scrollTo` stand-in and any stubbed globals. */
export function restoreScrollTo() {
  delete (HTMLElement.prototype as unknown as { scrollTo?: unknown }).scrollTo;
  vi.unstubAllGlobals();
}

/** Makes `prefers-reduced-motion: reduce` match. */
export function stubReducedMotion() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}
