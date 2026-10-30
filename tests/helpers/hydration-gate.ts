/**
 * Demo SSR gate (hds#958): server-render each demo the way a Node server does
 * (no window, no document), put the HTML in a jsdom container, then
 * hydrateRoot it and collect what React reports as a mismatch: each
 * onRecoverableError, and each console.error about hydration.
 *
 * The server and the client must be separate module graphs. Libraries pick
 * useLayoutEffect or a no-op once, at import, by checking for a document, so
 * rendering on the server inside jsdom prints useLayoutEffect warnings a real
 * server never would. `load` is called twice: once in plain Node for the
 * server, then again after the jsdom globals are installed and the module
 * registry is reset, for the client. Call this from a node-environment test.
 */
import type { ComponentType, ReactNode } from 'react';
import { vi } from 'vitest';
import { builtinEnvironments } from 'vitest/runtime';

export type Demos = Record<string, ComponentType | (() => ReactNode)>;

const HYDRATION = /did not match|hydrat/i;

/** demo name → what went wrong; a demo that hydrates cleanly has no entry */
export async function hydrationProblems(
  load: () => Promise<Demos>,
): Promise<Map<string, string[]>> {
  if (typeof document !== 'undefined')
    throw new Error('hydrationProblems needs the node environment');

  const server = await load();
  const React = await import('react');
  const { renderToString } = await import('react-dom/server');
  const wrap = (R: typeof React, Demo: Demos[string]) =>
    R.createElement('div', { 'data-hds': '' }, R.createElement(Demo));
  const html = new Map(
    Object.entries(server).map(([name, Demo]) => [name, renderToString(wrap(React, Demo))]),
  );

  const env = await builtinEnvironments.jsdom.setup(globalThis, {});
  const problems = new Map<string, string[]>();
  try {
    vi.resetModules();
    await import('../setup/jsdom-polyfills');
    const client = await load();
    const ClientReact = await import('react');
    const { hydrateRoot } = await import('react-dom/client');
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    for (const [name, Demo] of Object.entries(client)) {
      const found: string[] = [];
      const error = vi.spyOn(console, 'error').mockImplementation((...args) => {
        const msg = args.map(String).join(' ');
        if (HYDRATION.test(msg)) found.push(`console.error: ${msg.split('\n')[0]}`);
      });
      const container = document.createElement('div');
      container.innerHTML = html.get(name) ?? '';
      document.body.appendChild(container);
      try {
        let root: { unmount(): void } | undefined;
        await ClientReact.act(async () => {
          root = hydrateRoot(container, wrap(ClientReact, Demo), {
            onRecoverableError: (err: unknown) =>
              found.push(`recoverable: ${err instanceof Error ? err.message : String(err)}`),
          });
        });
        await ClientReact.act(async () => root?.unmount());
      } finally {
        container.remove();
        error.mockRestore();
      }
      if (found.length) problems.set(name, found);
    }
  } finally {
    await env.teardown(globalThis);
  }
  return problems;
}
