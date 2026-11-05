/**
 * useReducedMotion hydrates cleanly under `prefers-reduced-motion: reduce`.
 *
 * The server always renders `false`. If the first client render reads
 * matchMedia directly, the markup differs (React #418) and React rebuilds the
 * document, stripping attributes such as `data-brand` on <html>. A toggle
 * Button's crossfadeLabel and AsyncState both read this hook.
 *
 * @unit reduced-motion-hydration
 */
import * as React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { act } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { Button } from '../components/button';
import { useReducedMotion } from './useReducedMotion';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
}

function Probe() {
  const reduced = useReducedMotion();
  return <span data-reduced={reduced ? 'true' : 'false'}>probe</span>;
}

async function ssrThenHydrate(el: React.ReactElement) {
  const html = renderToString(el); // matchMedia unstubbed → server snapshot
  stubReducedMotion(true);
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  const errors: unknown[] = [];
  const consoleErr = vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a));
  let root: ReturnType<typeof hydrateRoot> | undefined;
  await act(async () => {
    root = hydrateRoot(container, el, {
      onRecoverableError: (e) => errors.push(e),
    });
  });
  consoleErr.mockRestore();
  return { container, errors, unmount: () => act(() => root?.unmount()) };
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('useReducedMotion hydration', () => {
  it('hydrates without a mismatch, then reports the client preference', async () => {
    const { container, errors, unmount } = await ssrThenHydrate(<Probe />);
    expect(errors).toEqual([]);
    expect(container.querySelector('span')?.getAttribute('data-reduced')).toBe('true');
    unmount();
  });

  it('a toggle Button with a text label hydrates without a mismatch', async () => {
    const { container, errors, unmount } = await ssrThenHydrate(
      <Button pressed={false}>Follow</Button>,
    );
    expect(errors).toEqual([]);
    expect(container.textContent).toContain('Follow');
    unmount();
  });
});
