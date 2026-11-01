/**
 * Tests for useAtLeast / useBreakpoint (hds#824): HDS breakpoints read in JS,
 * from the values `sx` compiles, narrow when `matchMedia` is missing or on the
 * server, and live as the viewport crosses a breakpoint.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { BOX_BREAKPOINTS, resolveSx } from '../components/box-sx';
import { useAtLeast as rootUseAtLeast, useBreakpoint as rootUseBreakpoint } from '../../index';
import { useAtLeast, useBreakpoint } from './useBreakpoint';

type Listener = () => void;

/** A fake viewport: every `(min-width: Npx)` query matches while width >= N. */
function mockViewport(initialWidth: number) {
  let width = initialWidth;
  const listeners = new Map<string, Set<Listener>>();
  const queries: string[] = [];
  const matchMedia = vi.fn((query: string) => {
    queries.push(query);
    const min = Number(/\(min-width: (\d+)px\)/.exec(query)?.[1] ?? NaN);
    const set = listeners.get(query) ?? new Set<Listener>();
    listeners.set(query, set);
    return {
      media: query,
      get matches() {
        return width >= min;
      },
      addEventListener: (_: string, cb: Listener) => set.add(cb),
      removeEventListener: (_: string, cb: Listener) => set.delete(cb),
    };
  });
  vi.stubGlobal('matchMedia', matchMedia);
  return {
    queries,
    listenerCount: () => [...listeners.values()].reduce((n, s) => n + s.size, 0),
    resize(next: number) {
      width = next;
      for (const set of listeners.values()) for (const cb of [...set]) cb();
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useAtLeast', () => {
  it('queries the same min-width `sx` compiles for that key', () => {
    const vp = mockViewport(1200);
    renderHook(() => useAtLeast('lg'));
    const sxMinWidth = /@media \(min-width:(\d+)px\)/.exec(
      resolveSx({ display: { lg: 'flex' } }, 'probe').join(''),
    )?.[1];
    expect(sxMinWidth).toBeDefined();
    expect(vp.queries).toContain(`(min-width: ${sxMinWidth}px)`);
    expect(vp.queries).toContain(`(min-width: ${BOX_BREAKPOINTS.lg}px)`);
  });

  it('is true at and above the breakpoint, false below it', () => {
    mockViewport(BOX_BREAKPOINTS.md);
    expect(renderHook(() => useAtLeast('md')).result.current).toBe(true);
    expect(renderHook(() => useAtLeast('lg')).result.current).toBe(false);
  });

  it('updates when the viewport crosses the breakpoint', () => {
    const vp = mockViewport(390);
    const { result } = renderHook(() => useAtLeast('lg'));
    expect(result.current).toBe(false);
    act(() => vp.resize(1440));
    expect(result.current).toBe(true);
    act(() => vp.resize(800));
    expect(result.current).toBe(false);
  });

  it('removes its listener on unmount', () => {
    const vp = mockViewport(390);
    const { unmount } = renderHook(() => useAtLeast('sm'));
    expect(vp.listenerCount()).toBe(1);
    unmount();
    expect(vp.listenerCount()).toBe(0);
  });

  it('answers narrow (false) without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(renderHook(() => useAtLeast('xs')).result.current).toBe(false);
  });

  it('answers narrow (false) when rendered on the server', () => {
    mockViewport(1440);
    function Probe() {
      return <span>{useAtLeast('sm') ? 'wide' : 'narrow'}</span>;
    }
    expect(renderToString(<Probe />)).toContain('narrow');
  });
});

describe('useBreakpoint', () => {
  it.each([
    [320, 'base'],
    [BOX_BREAKPOINTS.xs, 'xs'],
    [700, 'sm'],
    [BOX_BREAKPOINTS.md, 'md'],
    [1100, 'lg'],
    [1600, 'xl'],
  ] as const)('at %ipx is %s', (width, expected) => {
    mockViewport(width);
    expect(renderHook(() => useBreakpoint()).result.current).toBe(expected);
  });

  it('updates when the viewport crosses any breakpoint', () => {
    const vp = mockViewport(390);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('xs');
    act(() => vp.resize(1024));
    expect(result.current).toBe('lg');
  });

  it("answers 'base' without matchMedia and on the server", () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(renderHook(() => useBreakpoint()).result.current).toBe('base');
    mockViewport(1440);
    function Probe() {
      return <span>{useBreakpoint()}</span>;
    }
    expect(renderToString(<Probe />)).toContain('base');
  });
});

describe('public surface', () => {
  it('ships both hooks from the package root', () => {
    expect(rootUseAtLeast).toBe(useAtLeast);
    expect(rootUseBreakpoint).toBe(useBreakpoint);
  });
});
