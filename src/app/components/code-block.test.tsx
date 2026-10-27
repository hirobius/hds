/**
 * Tests for CodeBlock accessibility (hds#520). Each `it` title carries the
 * `a11y:<id>` the CodeBlock `@a11y component` tags point at.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeBlock } from './code-block';

afterEach(cleanup);

const css = (file: string) => readFileSync(resolve(__dirname, '../../styles', file), 'utf8');
/** A token's px value, following var() aliases (`--component-button-size-sm-height` -> 36). */
const tokenPx = (name: string): number => {
  const value = css('tokens.generated.css').match(new RegExp(`${name}:\\s*([^;]+);`))?.[1] ?? '';
  const alias = value.match(/^var\((--[\w-]+)\)$/);
  return alias ? tokenPx(alias[1]) : Number(value.match(/^(\d+)px$/)?.[1]);
};

describe('CodeBlock accessibility contract', () => {
  // jsdom does no layout, so fake an overflowing <pre> (scrollWidth past clientWidth).
  function fakeOverflow() {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(500);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);
  }

  it('a11y:code-block.scroll-region - overflowing code is a named, focusable group so keyboard users can scroll it; short code adds no tab stop', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<CodeBlock code="const a = 1;" language="ts" />);
    expect(screen.queryByRole('group', { name: 'ts code' })).toBeNull();
    expect(screen.queryByRole('region')).toBeNull();
    unmount();
    fakeOverflow();
    render(<CodeBlock code={'const a = 1;'.repeat(40)} language="ts" />);
    const group = screen.getByRole('group', { name: 'ts code' });
    expect(group.getAttribute('tabindex')).toBe('0');
    await user.tab();
    expect(document.activeElement).toBe(group);
    vi.restoreAllMocks();
  });

  it('a11y:code-block.copy-name - the copy button is a named button that is not a submit button, and is renamed after copying', async () => {
    const user = userEvent.setup();
    render(
      <form>
        <CodeBlock code="npm i" />
      </form>,
    );
    const copy = screen.getByRole('button', { name: 'Copy code' });
    expect(copy.getAttribute('type')).toBe('button');
    await user.click(copy);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).not.toBeNull());
    expect(await navigator.clipboard.readText()).toBe('npm i');
  });

  it.each(['block', 'inline'] as const)(
    'a11y:code-block.copy-status - copying is announced from a status region that exists before the change (%s)',
    async (variant) => {
      const user = userEvent.setup();
      render(<CodeBlock code="npm i" variant={variant} />);
      const status = screen.getByRole('status');
      expect(status.textContent).toBe('');
      await user.click(screen.getByRole('button', { name: 'Copy code' }));
      await waitFor(() => expect(within(status).queryByText(/copied/i)).not.toBeNull());
    },
  );

  it('a11y:code-block.expand-state - the toggle reports aria-expanded and aria-controls, works with Enter and Space, and removes the closed panel', async () => {
    const user = userEvent.setup();
    render(<CodeBlock code="x" collapsible />);
    const toggle = screen.getByRole('button', { name: /show code/i });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('region', { name: 'Code sample' })).toBeNull();
    await user.tab();
    expect(document.activeElement).toBe(toggle);
    await user.keyboard('{Enter}');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const panel = document.getElementById(toggle.getAttribute('aria-controls') as string);
    expect(panel?.querySelector('pre')).not.toBeNull();
    await user.keyboard(' ');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('region', { name: 'Code sample' })).toBeNull();
  });

  it('a11y:code-block.focus-return - collapsing while focus is inside the panel returns focus to the toggle', async () => {
    const user = userEvent.setup();
    fakeOverflow();
    render(<CodeBlock code="x" collapsible defaultExpanded />);
    const group = screen.getByRole('group', { name: 'Code sample' });
    group.focus();
    expect(document.activeElement).toBe(group);
    const toggle = screen.getByRole('button', { name: /hide code/i });
    await user.click(toggle);
    expect(document.activeElement).toBe(toggle);
    vi.restoreAllMocks();
  });

  it('a11y:code-block.focus-ring - the copy button and the toggle carry the shared focus ring class', () => {
    render(<CodeBlock code="x" collapsible defaultExpanded />);
    for (const button of screen.getAllByRole('button')) {
      expect(
        button.className,
        button.textContent || button.getAttribute('aria-label') || '',
      ).toContain('hds-focus');
    }
  });

  it('the block copy button is an HDS icon-only Button, centred by the Button itself (hds#857)', () => {
    render(<CodeBlock code="npm i" language="bash" />);
    const copy = screen.getByRole('button', { name: 'Copy code' });
    expect(copy.getAttribute('data-variant')).toBe('secondary');
    expect(copy.getAttribute('data-size')).toBe('sm');
    expect(copy.className).toContain('justify-center');
    expect(copy.querySelector('svg')).not.toBeNull();
  });

  it('the block copy button sits beside the scrolling code, never over it, so long lines cannot run under it (hds#857)', () => {
    render(<CodeBlock code={'x'.repeat(400)} language="ts" />);
    const copy = screen.getByRole('button', { name: 'Copy code' });
    const pre = document.querySelector('pre') as HTMLPreElement;
    expect(pre.contains(copy)).toBe(false);
    expect(copy.parentElement).toBe(pre.parentElement);
    expect(copy.className).not.toMatch(/(^|\s)absolute(\s|$)/);
    expect(pre.className).toContain('flex-1');
    expect(pre.className).toContain('min-w-0');
  });

  it.each(['block', 'inline'] as const)(
    'a11y:code-block.target-size - the copy button is 24px or more and lifts to the touch target on coarse pointers (%s)',
    (variant) => {
      render(<CodeBlock code="x" variant={variant} />);
      const copy = screen.getByRole('button', { name: 'Copy code' });
      expect(copy.className).toContain('hds-touch-target');
      if (variant === 'block') {
        // the sm icon-only Button is a square bound to the sm height token (36px)
        expect(tokenPx('--component-button-size-sm-height')).toBeGreaterThanOrEqual(24);
        expect(copy.className).toContain('h-[var(--component-button-size-sm-height)]');
        expect(copy.className).toContain('w-[var(--component-button-size-sm-height)]');
      } else {
        // 16px icon + 2 x the subgrid-gap padding (primitive space-1)
        expect(16 + 2 * tokenPx('--primitive-space-1')).toBeGreaterThanOrEqual(24);
        expect(copy.className).toContain('py-[var(--semantic-space-subgrid-gap)]');
      }
      expect(css('theme.css')).toMatch(
        /\.hds-touch-target\s*\{[^}]*min-height:\s*var\(--primitive-size-interactive-min\)/,
      );
    },
  );
});
