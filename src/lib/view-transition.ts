/**
 * withViewTransition — run a DOM update inside a View Transition when the
 * browser can, and plainly when it cannot (hds#751 slice 4).
 *
 * - Supported (`document.startViewTransition`): the update runs inside the
 *   transition, and the returned promise settles when the update is done.
 * - Unsupported, or server-side: the update runs at once, so the page never
 *   flashes and nothing throws.
 * - `prefers-reduced-motion: reduce`: the update runs at once, with no
 *   transition at all.
 *
 * It takes the update as a callback, so it fits any router or state setter;
 * it adds no dependency. Style the transition with `::view-transition-*` and
 * the HDS motion tokens (DESIGN.md, Motion).
 *
 * @public
 */
type StartViewTransition = (update: () => void | Promise<void>) => {
  updateCallbackDone: Promise<void>;
};

const REDUCE = '(prefers-reduced-motion: reduce)';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(REDUCE)?.matches;
}

export function withViewTransition(update: () => void | Promise<void>): Promise<void> {
  const start =
    typeof document !== 'undefined'
      ? (document as Document & { startViewTransition?: StartViewTransition }).startViewTransition
      : undefined;
  if (typeof start !== 'function' || prefersReducedMotion()) {
    try {
      return Promise.resolve(update());
    } catch (error) {
      return Promise.reject(error);
    }
  }
  return start.call(document, update).updateCallbackDone;
}
