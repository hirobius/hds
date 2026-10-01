/**
 * Shared jsdom polyfills for Radix / Floating UI primitives.
 *
 * jsdom lacks ResizeObserver, pointer capture and scrollIntoView, which every
 * Radix overlay touches while positioning or handling focus, and CSS.escape,
 * which the virtual screen-reader uses to resolve idrefs. Registered once via
 * `test.setupFiles` so the contract tests do not each carry their own copy.
 * Guarded so script tests running in the node environment are unaffected.
 */
if (typeof window !== 'undefined' && typeof Element !== 'undefined') {
  if (!('ResizeObserver' in globalThis)) {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
  }
  const proto = Element.prototype;
  if (!proto.hasPointerCapture) proto.hasPointerCapture = () => false;
  if (!proto.setPointerCapture) proto.setPointerCapture = () => {};
  if (!proto.releasePointerCapture) proto.releasePointerCapture = () => {};
  if (!proto.scrollIntoView) proto.scrollIntoView = () => {};

  // jsdom has no CSS.escape, and vitest's jsdom environment defines the `CSS`
  // key as undefined, so an `in` check passes while the call throws. The
  // virtual screen-reader resolves aria-labelledby / aria-describedby idrefs
  // through CSS.escape (Dialog's title and description).
  const css = (globalThis as { CSS?: { escape?: unknown } }).CSS;
  if (typeof css?.escape !== 'function') {
    (globalThis as unknown as { CSS: object }).CSS = { ...css, escape: cssEscape };
  }
}

/** CSS.escape per the CSSOM spec (https://drafts.csswg.org/cssom/#serialize-an-identifier). */
function cssEscape(value: string): string {
  const str = String(value);
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code === 0) {
      out += '\uFFFD';
    } else if (
      (code >= 0x1 && code <= 0x1f) ||
      code === 0x7f ||
      (i === 0 && code >= 0x30 && code <= 0x39) ||
      (i === 1 && code >= 0x30 && code <= 0x39 && str.charCodeAt(0) === 0x2d)
    ) {
      out += `\\${code.toString(16)} `;
    } else if (i === 0 && code === 0x2d && str.length === 1) {
      out += `\\${str.charAt(i)}`;
    } else if (
      code >= 0x80 ||
      code === 0x2d ||
      code === 0x5f ||
      (code >= 0x30 && code <= 0x39) ||
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a)
    ) {
      out += str.charAt(i);
    } else {
      out += `\\${str.charAt(i)}`;
    }
  }
  return out;
}
