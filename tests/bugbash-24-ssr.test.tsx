// @vitest-environment node
/**
 * Bug bash 24 review: CodeBlock measures overflow in a layout effect to decide whether its <pre>
 * is a scrollable, named group. Server rendering must stay silent (React 18 warns on
 * useLayoutEffect during SSR) and must not mark a block as a group before it is measured.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CodeBlock } from '../src/app/components/code-block';

describe('CodeBlock on the server', () => {
  it('renders without a useLayoutEffect warning and without a tab stop', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = renderToString(<CodeBlock code={'x'.repeat(400)} filename="a.ts" />);
    const calls = err.mock.calls.map((c) => String(c[0]));
    err.mockRestore();
    expect(calls.filter((m) => /useLayoutEffect/.test(m))).toEqual([]);
    expect(html).not.toMatch(/<pre[^>]*tabindex/i);
  });
});
