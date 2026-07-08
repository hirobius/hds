import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// Mock Lenis's React integration so tests don't spin up a real rAF loop / scroll
// hijack in jsdom. ReactLenis renders a marker wrapper we can assert on.
vi.mock('lenis/react', () => ({
  ReactLenis: ({ children, options }: { children: React.ReactNode; options?: unknown }) =>
    React.createElement(
      'div',
      { 'data-testid': 'lenis', 'data-options': JSON.stringify(!!options) },
      children,
    ),
  useLenis: () => undefined,
}));

import { SmoothScroll } from './smooth-scroll';
import { useScrollProgress } from './use-scroll-progress';

function makeContainer(): HTMLDivElement {
  const c = document.createElement('div');
  document.body.appendChild(c);
  return c;
}
function cleanup(container: HTMLDivElement, root: Root) {
  act(() => root.unmount());
  container.remove();
}

// SmoothScroll reads prefers-reduced-motion via window.matchMedia (through
// useSyncExternalStore), so drive it by mocking matchMedia per test.
function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe('SmoothScroll', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = makeContainer();
    root = createRoot(container);
  });
  afterEach(() => {
    cleanup(container, root);
    vi.restoreAllMocks();
  });

  it('mounts Lenis when reduced motion is NOT preferred', async () => {
    mockReducedMotion(false);
    await act(async () => {
      root.render(
        <SmoothScroll>
          <p data-testid="child">content</p>
        </SmoothScroll>,
      );
    });
    expect(container.querySelector('[data-testid="lenis"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="child"]')?.textContent).toBe('content');
  });

  it('falls back to native scroll (no Lenis) when reduced motion IS preferred', async () => {
    mockReducedMotion(true);
    await act(async () => {
      root.render(
        <SmoothScroll>
          <p data-testid="child">content</p>
        </SmoothScroll>,
      );
    });
    // Children still render, but the Lenis wrapper is absent.
    expect(container.querySelector('[data-testid="child"]')?.textContent).toBe('content');
    expect(container.querySelector('[data-testid="lenis"]')).toBeNull();
  });

  it('mounts Lenis under reduced motion when ignoreReducedMotion is set', async () => {
    mockReducedMotion(true);
    await act(async () => {
      root.render(
        <SmoothScroll ignoreReducedMotion>
          <p data-testid="child">content</p>
        </SmoothScroll>,
      );
    });
    expect(container.querySelector('[data-testid="lenis"]')).not.toBeNull();
  });
});

describe('useScrollProgress', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = makeContainer();
    root = createRoot(container);
  });
  afterEach(() => cleanup(container, root));

  it('returns a MotionValue starting at 0', async () => {
    let progress: { get: () => number } | undefined;
    function Probe() {
      const ref = React.useRef<HTMLDivElement>(null);
      progress = useScrollProgress(ref);
      return <div ref={ref} data-testid="target" />;
    }
    await act(async () => {
      root.render(<Probe />);
    });
    expect(progress).toBeDefined();
    expect(typeof progress!.get).toBe('function');
    expect(progress!.get()).toBe(0);
  });
});
