// The pending restore per theme root, so a second swap inside the window restarts it
// instead of an earlier swap's frame turning transitions back on mid-swap.
const pending = new WeakMap<HTMLElement, number>();

/**
 * Theme swaps are instant: a light/dark change flips every colour token at once,
 * and any element with a colour transition (`transition-colors`, a hover fade)
 * would otherwise fade to the new theme. `data-theme-switching` on the theme root
 * turns every transition under it off (src/styles/index.css) for the frame the
 * swap paints in; the attribute comes off a frame later, after the new colours are
 * computed, so hover fades work again without replaying the swap.
 * @internal
 */
export function suppressThemeTransitions(el: HTMLElement): void {
  if (typeof requestAnimationFrame !== 'function') return;
  const prev = pending.get(el);
  if (prev !== undefined) cancelAnimationFrame(prev);
  el.setAttribute('data-theme-switching', '');
  pending.set(
    el,
    requestAnimationFrame(() =>
      pending.set(
        el,
        requestAnimationFrame(() => {
          pending.delete(el);
          el.removeAttribute('data-theme-switching');
        }),
      ),
    ),
  );
}
