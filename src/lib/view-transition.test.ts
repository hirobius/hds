/**
 * withViewTransition (hds#751 slice 4): one helper over
 * document.startViewTransition. Framework-agnostic: it takes the update
 * callback, so a router, a state setter or a DOM swap all fit.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { withViewTransition } from './view-transition';

type Doc = Document & { startViewTransition?: unknown };

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: reduce && query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

afterEach(() => {
  delete (document as Doc).startViewTransition;
  vi.unstubAllGlobals();
});

describe('withViewTransition', () => {
  it('supported: hands the update to document.startViewTransition', async () => {
    stubReducedMotion(false);
    const update = vi.fn();
    const start = vi.fn((cb: () => void) => {
      cb();
      return { updateCallbackDone: Promise.resolve(), finished: Promise.resolve() };
    });
    (document as Doc).startViewTransition = start;
    await withViewTransition(update);
    expect(start).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('unsupported: runs the update at once, with no error', async () => {
    stubReducedMotion(false);
    const order: string[] = [];
    const done = withViewTransition(() => {
      order.push('update');
    });
    order.push('after-call');
    await done;
    // Synchronous: the DOM is updated before the call returns, so no flash.
    expect(order).toEqual(['update', 'after-call']);
  });

  it('reduced motion: skips the transition and runs the update at once', async () => {
    stubReducedMotion(true);
    const start = vi.fn();
    (document as Doc).startViewTransition = start;
    const update = vi.fn();
    await withViewTransition(update);
    expect(start).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('waits for an async update before it resolves', async () => {
    stubReducedMotion(false);
    let done = false;
    await withViewTransition(async () => {
      await Promise.resolve();
      done = true;
    });
    expect(done).toBe(true);
  });

  it('is exported from the package root', async () => {
    const root = await import('../index');
    expect(root.withViewTransition).toBe(withViewTransition);
  });
});
