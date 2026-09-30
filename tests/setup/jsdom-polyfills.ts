/**
 * Shared jsdom polyfills for Radix / Floating UI primitives.
 *
 * jsdom lacks ResizeObserver, pointer capture and scrollIntoView, which every
 * Radix overlay touches while positioning or handling focus. Registered once via
 * `test.setupFiles` so keyboard contract tests do not each carry their own copy.
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
}
